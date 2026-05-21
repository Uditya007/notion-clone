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

    // Fetch incomplete tasks with a due date
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error) {
      throw error;
    }

    // Determine current dates (YYYY-MM-DD format) in server time (closely matching standard calendar comparison)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const overdue: any[] = [];
    const dueToday: any[] = [];
    const dueTomorrow: any[] = [];

    tasks?.forEach((task) => {
      const dueDate = task.due_date;
      if (!dueDate) return;

      if (dueDate < todayStr) {
        overdue.push(task);
      } else if (dueDate === todayStr) {
        dueToday.push(task);
      } else if (dueDate === tomorrowStr) {
        dueTomorrow.push(task);
      }
    });

    const totalAlerts = overdue.length + dueToday.length;

    return NextResponse.json({
      overdue,
      dueToday,
      dueTomorrow,
      totalAlerts,
      todayStr
    });
  } catch (error: any) {
    console.error("[Task Alerts GET Error]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
