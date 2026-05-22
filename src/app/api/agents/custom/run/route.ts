import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { markdownToTiptap } from '@/lib/markdownToTiptap';
import { addRow } from '@/lib/db/databases';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let runId: string | null = null;
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, context: quickRunContext } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    // 1. Fetch custom agent details
    const { data: agent, error: agentError } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Custom agent not found' }, { status: 404 });
    }

    // 2. Create running status in agent_runs
    const { data: runRecord, error: runError } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: user.id,
        agent_id: agentId,
        agent_type: 'custom',
        status: 'running',
        input: { context: quickRunContext || '' },
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (runError) {
      console.error("[Run Custom Agent ERROR logging run]:", runError);
      return NextResponse.json({ error: 'Failed to initiate agent execution log' }, { status: 500 });
    }

    runId = runRecord.id;

    // 3. Resolve context variables
    // user_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

    // date
    const todayStr = new Date().toISOString().split('T')[0];

    // recent_pages
    const { data: pages } = await supabase
      .from('pages')
      .select('title, content')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(5);

    const recentPagesStr = pages && pages.length > 0
      ? pages.map(p => `- ${p.title || 'Untitled'}`).join('\n')
      : 'No recent pages found';

    // overdue_tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, due_date')
      .eq('user_id', user.id)
      .eq('completed', false)
      .lt('due_date', todayStr)
      .order('due_date', { ascending: true })
      .limit(10);

    const overdueTasksStr = tasks && tasks.length > 0
      ? tasks.map(t => `- ${t.title} (Due: ${t.due_date})`).join('\n')
      : 'No overdue tasks';

    // workspace_name
    const workspaceName = profile?.workspace_name || 'My Workspace';

    // 4. Substitute variables into action_config.prompt
    let basePrompt = agent.action_config?.prompt || '';
    if (!basePrompt && agent.action_type === 'custom_prompt') {
      basePrompt = 'Generate a summary or response.';
    } else if (!basePrompt) {
      // Fallback for built-in template configurations
      basePrompt = `Summarize workspace activities. Recent pages:\n${recentPagesStr}\nOverdue Tasks:\n${overdueTasksStr}`;
    }

    let compiledPrompt = basePrompt
      .replace(/\{\{user_name\}\}/g, userName)
      .replace(/\{\{date\}\}/g, todayStr)
      .replace(/\{\{recent_pages\}\}/g, recentPagesStr)
      .replace(/\{\{overdue_tasks\}\}/g, overdueTasksStr)
      .replace(/\{\{workspace_name\}\}/g, workspaceName);

    if (quickRunContext && quickRunContext.trim()) {
      compiledPrompt += `\n\n[Additional context provided by user for this run]:\n${quickRunContext}`;
    }

    // 5. Query Gemini AI using standard key
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      throw new Error('Google AI key not configured on server');
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    console.log(`[Custom Agent Runner] Executing prompt for agent "${agent.name}"...`);

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are a highly capable operational AI agent named "${agent.name}". 
${agent.description ? `Description of your role: ${agent.description}` : ''}
Formulate your response in clean, professional markdown layout structure (headings, bold, lists). Do not include any extra wrapper text or pleasantries.`,
      prompt: compiledPrompt
    });

    const aiOutput = text.trim();

    // 6. Handle output types
    let outputPageId: string | null = null;
    let previewText = aiOutput.substring(0, 300) + (aiOutput.length > 300 ? '...' : '');

    if (agent.output_type === 'new_page') {
      const pageTitleTemplate = agent.output_config?.title || `${agent.name} Output — {{date}}`;
      const resolvedTitle = pageTitleTemplate
        .replace(/\{\{date\}\}/g, todayStr)
        .replace(/\{\{user_name\}\}/g, userName);

      const tiptapJson = markdownToTiptap(aiOutput);

      // Create new page in Supabase
      const parentId = agent.output_config?.parent_id || null;
      const { data: newPage, error: createPageError } = await supabase
        .from('pages')
        .insert([{
          user_id: user.id,
          title: resolvedTitle,
          content: JSON.stringify(tiptapJson),
          type: 'editor',
          parent_id: parentId,
          icon: agent.icon || '⚡',
          is_deleted: false,
          is_favorite: false
        }])
        .select()
        .single();

      if (createPageError) {
        throw new Error(`Failed to create output page: ${createPageError.message}`);
      }

      outputPageId = newPage.id;
      previewText = resolvedTitle;
    } else if (agent.output_type === 'database_row') {
      const dbId = agent.output_config?.database_id;
      if (!dbId) {
        throw new Error('Target database not specified in output configuration');
      }

      // Fetch first column of target database to write cells
      const { data: cols } = await supabase
        .from('db_columns')
        .select('*')
        .eq('database_id', dbId)
        .order('position', { ascending: true })
        .limit(1);

      const targetColId = cols && cols.length > 0 ? cols[0].id : null;
      const cells: any = {};
      if (targetColId) {
        cells[targetColId] = aiOutput.substring(0, 100);
      }

      // Add row using the standard helper
      await addRow(supabase, dbId, { cells, position: 0 });
    } else if (agent.output_type === 'inbox_notification') {
      // Mock sending notification or log to database notification channel
      // We can insert a task or a page if required, or simply represent in run_log output.
    }

    // 7. Update agent run count and last_run_at
    await supabase
      .from('custom_agents')
      .update({
        run_count: (agent.run_count || 0) + 1,
        last_run_at: new Date().toISOString()
      })
      .eq('id', agentId);

    // 8. Update run execution log to completed
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(runRecord.started_at).getTime();
    const durationSec = (durationMs / 1000).toFixed(1) + 's';

    const { data: finalRun } = await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output: aiOutput,
        output_page_id: outputPageId,
        completed_at: completedAt,
        duration: durationSec
      })
      .eq('id', runId)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      preview: previewText,
      message: 'Agent run completed successfully!',
      pageId: outputPageId,
      run: finalRun
    });

  } catch (error: any) {
    console.error("[Execution Runtime ERROR]:", error);

    // Mark run as failed if it was initiated
    if (runId) {
      try {
        await supabase
          .from('agent_runs')
          .update({
            status: 'failed',
            error: error.message || 'Execution failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', runId);
      } catch (logErr) {
        console.error("Failed to mark run log status as failed:", logErr);
      }
    }

    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
