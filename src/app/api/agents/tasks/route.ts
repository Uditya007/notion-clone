import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { logAgentRun } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google AI key not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    // 1. Fetch incomplete tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ success: true, message: "No active tasks to process." });
    }

    // 2. Map through tasks to see if any are pending for 7+ days or have no due date
    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.due_date,
      createdAt: t.created_at
    }));

    const systemPrompt = `You are a world-class project manager and scheduling algorithm. Return ONLY a valid JSON array of tasks with updated parameters. Do not include markdown or explanations.`;
    const userPrompt = `Review these incomplete user tasks.
Tasks to manage:
${JSON.stringify(formattedTasks)}

For each task:
1. If the task title doesn't already have a priority tag (e.g. "[🔴 High]", "[🟡 Medium]", or "[🟢 Low]"), determine its priority based on the title's urgency and complexity, and suggest one.
2. If it has no due date, suggest a realistic date (format YYYY-MM-DD) starting from today (${new Date().toLocaleDateString()}).
3. If it has been pending for 7+ days (compare the task's createdAt date to today's date ${new Date().toISOString()}), add a "[⚠️ Stale]" indicator if not already present.

Return a JSON array of objects:
[
  {
    "id": "string",
    "suggestedTitle": "string (the updated title containing priority/status tags, e.g. '[🔴 High] Finish presentation')",
    "suggestedDueDate": "string (YYYY-MM-DD format)"
  }
]`;

    console.log("[Smart Task Agent] Calling Gemini...");
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

    const suggestions = JSON.parse(cleanedText);
    
    let updatedCount = 0;
    
    // 3. Update each task in Supabase
    if (Array.isArray(suggestions)) {
      for (const sug of suggestions) {
        if (!sug.id || !sug.suggestedTitle) continue;

        const originalTask = tasks.find(t => t.id === sug.id);
        if (!originalTask) continue;

        const updates: any = {
          title: sug.suggestedTitle
        };

        // Only update due date if it wasn't set originally
        if (!originalTask.due_date && sug.suggestedDueDate) {
          updates.due_date = sug.suggestedDueDate;
        }

        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', sug.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    const outputLog = `Optimized scheduling and priorities for ${updatedCount} active tasks. Flagged stale items and assigned priorities.`;
    await logAgentRun(supabase, user.id, 'tasks', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog,
      updatedCount
    });

  } catch (error: any) {
    console.error("[Smart Task Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
