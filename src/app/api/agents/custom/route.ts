import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[GET Custom Agents ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(agents || []);
  } catch (error: any) {
    console.error("[GET Custom Agents EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      icon, 
      trigger_type, 
      trigger_config, 
      action_type, 
      action_config, 
      output_type, 
      output_config 
    } = body;

    if (!name || !trigger_type || !action_type || !output_type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data: newAgent, error } = await supabase
      .from('custom_agents')
      .insert([{
        user_id: user.id,
        name,
        description,
        icon: icon || '⚡',
        trigger_type,
        trigger_config: trigger_config || {},
        action_type,
        action_config: action_config || {},
        output_type,
        output_config: output_config || {},
        is_active: true,
        run_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error("[POST Custom Agent ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newAgent);
  } catch (error: any) {
    console.error("[POST Custom Agent EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
