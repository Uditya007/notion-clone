import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgentRuns } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runs = await getAgentRuns(supabase, user.id);
    return NextResponse.json(runs);

  } catch (error: any) {
    console.error("[Agent Runs Fetch ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch agent runs' }, { status: 500 });
  }
}
