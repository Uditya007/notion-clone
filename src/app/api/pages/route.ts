import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPages, createPage } from '@/lib/db/pages';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await getPages(supabase, user.id);
    return NextResponse.json(pages);
  } catch (error: any) {
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
    const newPage = await createPage(supabase, {
      user_id: user.id,
      title: body.title || 'Untitled',
      parent_id: body.parentId || null,
      icon: body.icon || '📄',
      type: body.type || 'editor',
      content: body.content || '',
    } as any);

    return NextResponse.json(newPage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
