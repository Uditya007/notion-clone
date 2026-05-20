import { SupabaseClient } from '@supabase/supabase-js';

export async function logAgentRun(
  supabase: SupabaseClient,
  userId: string,
  agentType: string,
  status: 'Success' | 'Failed' | 'Running',
  output: string
) {
  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: userId,
        agent_type: agentType,
        status,
        output,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.warn("[Agents Log] agent_runs table might not exist yet. Falling back.", error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn("[Agents Log] Exception logging agent run:", err.message);
    return null;
  }
}

export async function getAgentRuns(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("[Agents Log] agent_runs table might not exist yet. Returning fallback mock runs.", error.message);
      return getMockRuns();
    }
    return data || [];
  } catch (err: any) {
    console.warn("[Agents Log] Exception fetching agent runs. Returning mock runs.", err.message);
    return getMockRuns();
  }
}

function getMockRuns() {
  return [
    {
      id: "mock-1",
      agent_type: "meeting",
      status: "Success",
      output: "Created 3 tasks & prepended structured meeting summaries.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "mock-2",
      agent_type: "sop",
      status: "Success",
      output: "Transformed draft page into a standard procedural SOP layout.",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: "mock-3",
      agent_type: "digest",
      status: "Success",
      output: "Constructed Weekly Briefing page summarizing task status.",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];
}
