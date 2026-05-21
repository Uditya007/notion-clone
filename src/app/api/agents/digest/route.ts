import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { logAgentRun } from '@/lib/agents';
import { markdownToTiptap } from '@/lib/markdownToTiptap';

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

    // 1. Gather weekly metrics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    // Pages edited this week
    const { data: recentPages } = await supabase
      .from('pages')
      .select('title, updated_at, type')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .gte('updated_at', oneWeekAgoStr);

    // Tasks completed this week
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('title, updated_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('updated_at', oneWeekAgoStr);

    // Overdue tasks (incomplete tasks with due_date in past)
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('title, due_date')
      .eq('user_id', user.id)
      .eq('completed', false)
      .lt('due_date', new Date().toISOString().split('T')[0]);

    const systemPrompt = `You are a professional Chief of Staff AI assistant. Return ONLY a valid HTML string representing a beautiful Weekly Digest briefing. Do not wrap in markdown code blocks.`;
    const userPrompt = `Generate a high-impact, motivational Weekly Digest summarizing the user's workspace activities.
Context:
- Pages edited this week: ${JSON.stringify(recentPages || [])}
- Tasks completed this week: ${JSON.stringify(completedTasks || [])}
- Overdue tasks needing attention: ${JSON.stringify(overdueTasks || [])}
- Today's Date: ${new Date().toLocaleDateString()}

Create:
1. An 'Accomplishments' section celebrating pages updated and tasks resolved.
2. An 'In Progress / Current focus' section showing what is currently being edited.
3. An 'Attention Needed' warning card showing overdue actions.
4. An 'AI Recommendations / Insights' block outlining priorities for the coming week.

Use beautiful styling (cards, colorful lists, highlight paragraphs) to make it look like a premium corporate newsletter directly in a Notion editor.`;

    console.log("[Digest Agent] Calling Gemini...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: userPrompt
    });

    let digestHtml = text.trim();
    if (digestHtml.startsWith('```html')) digestHtml = digestHtml.substring(7);
    if (digestHtml.startsWith('```')) digestHtml = digestHtml.substring(3);
    if (digestHtml.endsWith('```')) digestHtml = digestHtml.substring(0, digestHtml.length - 3);
    digestHtml = digestHtml.trim();

    // 2. Create the Weekly Digest page
    const dateLabel = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const { data: newPage, error: createError } = await supabase
      .from('pages')
      .insert([{
        user_id: user.id,
        title: `Weekly Digest — ${dateLabel}`,
        icon: '📊',
        type: 'editor',
        content: JSON.stringify(markdownToTiptap(digestHtml))
      }])
      .select()
      .single();

    if (createError || !newPage) throw new Error(createError?.message || 'Failed to create digest page');

    const outputLog = `Generated digest page 'Weekly Digest — ${dateLabel}' with accomplishments, overdue tasks, and weekly recommendations.`;
    await logAgentRun(supabase, user.id, 'digest', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog,
      pageId: newPage.id
    });

  } catch (error: any) {
    console.error("[Digest Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
