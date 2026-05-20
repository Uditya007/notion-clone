import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTasks, createTask, reorderTasks } from '@/lib/db/tasks';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await getTasks(supabase, user.id);
    return NextResponse.json(tasks);
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
    
    if (body.reorder && Array.isArray(body.taskIds)) {
      await reorderTasks(supabase, user.id, body.taskIds);
      return NextResponse.json({ success: true });
    }

    const newTask = await createTask(supabase, user.id, body.title);
    return NextResponse.json(newTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
