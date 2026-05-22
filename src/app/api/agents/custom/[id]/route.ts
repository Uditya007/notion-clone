import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: agent, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("[GET Single Custom Agent ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("[GET Single Custom Agent EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Whitelist updates
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type;
    if (body.trigger_config !== undefined) updates.trigger_config = body.trigger_config;
    if (body.action_type !== undefined) updates.action_type = body.action_type;
    if (body.action_config !== undefined) updates.action_config = body.action_config;
    if (body.output_type !== undefined) updates.output_type = body.output_type;
    if (body.output_config !== undefined) updates.output_config = body.output_config;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updatedAgent, error } = await supabase
      .from('custom_agents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH Custom Agent ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedAgent);
  } catch (error: any) {
    console.error("[PATCH Custom Agent EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('custom_agents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error("[DELETE Custom Agent ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE Custom Agent EXCEPTION]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
