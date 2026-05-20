import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { logAgentRun } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Missing call transcript text' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google AI key not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const systemPrompt = `You are a world-class sales architect and CRM intelligence engine. Return ONLY valid JSON. No conversational text, no markdown.`;
    const userPrompt = `Analyze this client call transcript or summary to extract vital CRM metrics and build follow-up items.
Transcript:
${transcript}

Format the response as a JSON object:
{
  "clientName": "string (the name of the client/company, default to 'Valued Client' if not found)",
  "analysisHtml": "HTML string containing a beautifully styled briefing of: client name, pain points, commitments, budget hints, next steps, and a ready-to-copy follow-up email draft",
  "tasks": [
    { "title": "string (clear action item, e.g. 'Email Rahul pricing proposal')", "dueDate": "string (YYYY-MM-DD format)" }
  ]
}

Ensure the HTML includes visually distinctive sections (e.g. background callouts, clean typography) to look spectacular.`;

    console.log("[Call Agent] Calling Gemini...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: userPrompt
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.substring(7);
    if (cleanedText.startsWith('```')) cleanedText = cleanedText.substring(3);
    if (cleanedText.endsWith('```')) cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    cleanedText = cleanedText.trim();

    const result = JSON.parse(cleanedText);

    // 1. Create a page with the call analysis
    const clientName = result.clientName || 'Valued Client';
    const { data: newPage, error: pageError } = await supabase
      .from('pages')
      .insert([{
        user_id: user.id,
        title: `Client Call Analysis — ${clientName}`,
        icon: '📞',
        type: 'editor',
        content: result.analysisHtml
      }])
      .select()
      .single();

    if (pageError || !newPage) throw new Error(pageError?.message || 'Failed to create call analysis page');

    // 2. Create tasks in Supabase
    let tasksCreatedCount = 0;
    if (result.tasks && Array.isArray(result.tasks)) {
      for (const t of result.tasks) {
        if (!t.title) continue;

        const { data: maxTask } = await supabase
          .from('tasks')
          .select('position')
          .eq('user_id', user.id)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();

        const position = maxTask ? (maxTask.position || 0) + 1 : 0;

        await supabase
          .from('tasks')
          .insert([{
            user_id: user.id,
            title: t.title,
            completed: false,
            due_date: t.dueDate || null,
            position
          }]);
        tasksCreatedCount++;
      }
    }

    const outputLog = `Analyzed call with ${clientName}. Generated Call Analysis page and spawned ${tasksCreatedCount} tasks.`;
    await logAgentRun(supabase, user.id, 'call', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog,
      pageId: newPage.id,
      tasksCreatedCount
    });

  } catch (error: any) {
    console.error("[Call Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
