import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMessages, addMessage } from '@/lib/db/conversations';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const messages = await getMessages(supabase, id);
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: 'Missing role or content' }, { status: 400 });
    }

    const newMessage = await addMessage(supabase, id, role, content);
    return NextResponse.json(newMessage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
