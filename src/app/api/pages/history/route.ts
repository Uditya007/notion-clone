import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPageHistory, restorePageVersion } from '@/lib/db/history';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('pageId');
    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    const logs = await getPageHistory(supabase, pageId);
    return NextResponse.json(logs);

  } catch (error: any) {
    console.error("[GET Page History Error]:", error);
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

    const { pageId, entryId } = await req.json();

    if (!pageId || !entryId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const success = await restorePageVersion(supabase, pageId, entryId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to restore snapshot version' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("[POST Restore Page History Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
