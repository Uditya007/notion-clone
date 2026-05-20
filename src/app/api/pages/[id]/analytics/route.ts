import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPage } from '@/lib/db/pages';
import { getPageHistory } from '@/lib/db/history';

export const dynamic = 'force-dynamic';

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
    const page = await getPage(supabase, id);

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const content = page.content || '';

    // 1. Calculate general counters
    const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText ? cleanText.split(' ').filter((w: string) => w.length > 0) : [];
    const wordCount = words.length;
    const charCount = cleanText.length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // 2. Parse Checklist tasks
    const totalTasksMatch = content.match(/<li[^>]*data-type="taskItem"[^>]*>/gi) || [];
    const completedTasksMatch = content.match(/<li[^>]*data-type="taskItem"[^>]*data-checked="true"[^>]*>/gi) || [];
    
    const totalTasks = totalTasksMatch.length;
    const completedTasks = completedTasksMatch.length;
    const taskCompletionRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Retrieve 30-Day Activity History map
    const logs = await getPageHistory(supabase, id);
    
    const activityMap: Record<string, number> = {};
    const today = new Date();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      activityMap[dateStr] = 0;
    }

    // Populate counts from page logs
    logs.forEach(log => {
      const logDate = log.created_at.split('T')[0];
      if (activityMap[logDate] !== undefined) {
        activityMap[logDate] += 1;
      }
    });

    const activityTimeline = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count
    }));

    return NextResponse.json({
      wordCount,
      charCount,
      readTime,
      totalTasks,
      completedTasks,
      taskCompletionRatio,
      activityTimeline,
      recentEdits: logs.slice(0, 5).map(log => ({
        id: log.id,
        userEmail: log.user_email,
        actionType: log.action_type,
        createdAt: log.created_at
      }))
    });

  } catch (error: any) {
    console.error("[GET Page Analytics Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
