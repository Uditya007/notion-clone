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

    // 1. Fetch all tasks
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    const taskCount = allTasks?.length || 0;
    const completedTasks = allTasks?.filter(t => t.completed) || [];
    const overdueTasks = allTasks?.filter(t => !t.completed && t.due_date && new Date(t.due_date) < new Date()) || [];
    const completionRate = taskCount > 0 ? Math.round((completedTasks.length / taskCount) * 100) : 0;

    const systemPrompt = `You are an expert productivity scientist and organizational coach. Return ONLY a valid HTML string representing a beautiful performance dashboard and written analysis. Do not wrap in markdown code blocks.`;
    const userPrompt = `Perform a comprehensive data analysis of my tasks data to discover performance indexes, bottlenecks, and productivity patterns.
Data Summary:
- Total Tasks: ${taskCount}
- Completed Tasks: ${completedTasks.length}
- Overdue Tasks: ${overdueTasks.length}
- Current Completion Rate: ${completionRate}%
- Raw Task Dump: ${JSON.stringify(allTasks || [])}

Create a beautiful performance report page using structured HTML:
1. A top header containing big card metrics (e.g. Total Tasks, Completion Rate %, Overdue Count) styled with premium shadows and grids.
2. A 'Productivity Pattern Analysis' identifying most active days, bottleneck tasks, or recurring delays.
3. A 'Actionable Optimization Plan' detailing three specific, highly customized rules the user can implement to improve completion rates based on their current task items.

Make it look like a highly advanced Bloomberg-like terminal or premium analytics dashboard.`;

    console.log("[Performance Agent] Calling Gemini...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: userPrompt
    });

    let reportHtml = text.trim();
    if (reportHtml.startsWith('```html')) reportHtml = reportHtml.substring(7);
    if (reportHtml.startsWith('```')) reportHtml = reportHtml.substring(3);
    if (reportHtml.endsWith('```')) reportHtml = reportHtml.substring(0, reportHtml.length - 3);
    reportHtml = reportHtml.trim();

    // 2. Create performance report page
    const dateLabel = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const { data: newPage, error: createError } = await supabase
      .from('pages')
      .insert([{
        user_id: user.id,
        title: `Performance Report — ${dateLabel}`,
        icon: '📈',
        type: 'editor',
        content: reportHtml
      }])
      .select()
      .single();

    if (createError || !newPage) throw new Error(createError?.message || 'Failed to create performance page');

    const outputLog = `Generated performance analysis with completion rate at ${completionRate}%. Created page 'Performance Report — ${dateLabel}'.`;
    await logAgentRun(supabase, user.id, 'performance', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog,
      pageId: newPage.id
    });

  } catch (error: any) {
    console.error("[Performance Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
