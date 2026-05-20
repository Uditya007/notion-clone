import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDbAutomations, saveDbAutomation, deleteDbAutomation } from '@/lib/db/automations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dbId = searchParams.get('dbId');
    if (!dbId) {
      return NextResponse.json({ error: 'Missing dbId' }, { status: 400 });
    }

    const rules = await getDbAutomations(supabase, dbId);
    return NextResponse.json(rules);

  } catch (error: any) {
    console.error("[GET DB Automations Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dbId, triggerColId, triggerVal, actionType, actionConfig } = await req.json();

    if (!dbId || !triggerColId || !triggerVal || !actionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newRule = await saveDbAutomation(supabase, {
      db_id: dbId,
      trigger_col_id: triggerColId,
      trigger_val: triggerVal,
      action_type: actionType,
      action_config: actionConfig
    });

    return NextResponse.json(newRule);

  } catch (error: any) {
    console.error("[POST DB Automations Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dbId = searchParams.get('dbId');
    const ruleId = searchParams.get('ruleId');

    if (!dbId || !ruleId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const success = await deleteDbAutomation(supabase, dbId, ruleId);
    return NextResponse.json({ success });

  } catch (error: any) {
    console.error("[DELETE DB Automations Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
