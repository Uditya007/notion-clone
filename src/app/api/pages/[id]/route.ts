import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPage, updatePage, deletePage, permanentlyDeletePage } from '@/lib/db/pages';
import { logPageHistory } from '@/lib/db/history';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const page = await getPage(supabase, id);
    return NextResponse.json(page);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Fetch original page state before updating
    const originalPage = await getPage(supabase, id);
    const updatedPage = await updatePage(supabase, id, body);

    // Asynchronously log audit history records
    if (originalPage) {
      const email = user.email || 'Contributor';
      if ('title' in body && body.title !== originalPage.title) {
        logPageHistory(supabase, id, user.id, email, 'title', originalPage.title, body.title).catch(console.error);
      }
      if ('content' in body && body.content !== originalPage.content) {
        logPageHistory(supabase, id, user.id, email, 'content', originalPage.content, body.content).catch(console.error);
      }
      if ('icon' in body && body.icon !== originalPage.icon) {
        logPageHistory(supabase, id, user.id, email, 'icon', originalPage.icon, body.icon).catch(console.error);
      }
      if ('cover_image' in body && body.cover_image !== originalPage.cover_image) {
        logPageHistory(supabase, id, user.id, email, 'cover', originalPage.cover_image, body.cover_image).catch(console.error);
      }
    }

    return NextResponse.json(updatedPage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      await permanentlyDeletePage(supabase, id);
      return NextResponse.json({ success: true, permanent: true });
    } else {
      const page = await deletePage(supabase, id);
      return NextResponse.json({ success: true, page });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
