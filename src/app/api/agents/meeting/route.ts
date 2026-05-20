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

    const { pageId } = await req.json();
    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    // 1. Fetch current page content
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const pageContent = page.content || '';
    if (!pageContent.trim()) {
      return NextResponse.json({ error: 'Page content is empty. Add transcript or notes first.' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google AI key not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const systemPrompt = `You are a professional business assistant specializing in meeting synthesis. Return ONLY valid JSON. No conversational text, no markdown.`;
    const userPrompt = `Synthesize this meeting transcript/notes. Extract key discussion points, decisions made, action items, owners, and next steps.
Format the output as a JSON object:
{
  "summaryHtml": "HTML string containing a beautifully formatted summary (e.g. styled divs, strong elements, bullet lists) suitable for a rich editor",
  "tasks": [
    { "title": "string (clear action-oriented task, e.g. 'Rahul to draft product specifications')", "dueDate": "string (YYYY-MM-DD format if date found, or null)" }
  ]
}

Content to summarize:
${pageContent}`;

    console.log("[Meeting Agent] Calling Gemini...");
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

    // 2. Prepend summary to page and update icon to 📋
    const newContent = `${result.summaryHtml}<hr /><br />${pageContent}`;
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        content: newContent,
        icon: '📋'
      })
      .eq('id', pageId);

    if (updateError) throw updateError;

    // 3. Create tasks in Supabase My Tasks
    let tasksCreatedCount = 0;
    if (result.tasks && Array.isArray(result.tasks)) {
      for (const t of result.tasks) {
        if (!t.title) continue;
        
        // Find max position
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

    const outputLog = `Summarized successfully. Added 📋 icon, prepended briefing, and generated ${tasksCreatedCount} action items in tasks.`;
    await logAgentRun(supabase, user.id, 'meeting', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog,
      tasksCreatedCount
    });

  } catch (error: any) {
    console.error("[Meeting Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
