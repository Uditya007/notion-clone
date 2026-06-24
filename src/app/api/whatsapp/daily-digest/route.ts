import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 200 });
    }

    // Determine today's boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Fetch incomplete tasks
    const { data: tasks, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, title, due_date')
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (taskErr) {
      return NextResponse.json({ error: taskErr.message }, { status: 500 });
    }

    // Fetch pages updated today
    const { data: pages, error: pageErr } = await supabaseAdmin
      .from('pages')
      .select('id, title')
      .gte('updated_at', startOfToday.toISOString());

    if (pageErr) {
      return NextResponse.json({ error: pageErr.message }, { status: 500 });
    }

    const overdue: any[] = [];
    const dueToday: any[] = [];

    tasks?.forEach(task => {
      if (task.due_date) {
        const taskDate = new Date(task.due_date);
        const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        if (taskDay < startOfToday) {
          overdue.push(task);
        } else if (taskDay.getTime() === startOfToday.getTime()) {
          dueToday.push(task);
        }
      }
    });

    if (overdue.length === 0 && dueToday.length === 0 && (!pages || pages.length === 0)) {
      const allClearMsg = "🎉 All clear! No pending tasks.";
      
      const params = new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM,
        To: `whatsapp:${phone}`,
        Body: allClearMsg
      });

      const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      
      await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${token}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });

      return NextResponse.json({ success: true, digest: allClearMsg });
    }

    const weekday = now.toLocaleDateString('default', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('default', { month: 'short', day: 'numeric' });

    let messageText = `☀️ *Good morning! Your Cora Daily Digest*\n📅 ${weekday}, ${dateStr}\n\n`;

    if (dueToday.length > 0) {
      messageText += `✅ *Due Today (${dueToday.length}):*\n`;
      dueToday.forEach(task => {
        let timeStr = "";
        if (task.due_date && task.due_date.includes('T')) {
          const timePart = task.due_date.split('T')[1]?.substring(0, 5);
          if (timePart && timePart !== '00:00') {
            const taskTime = new Date(task.due_date);
            timeStr = ` - ${taskTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
        }
        messageText += `• ${task.title}${timeStr}\n`;
      });
      messageText += `\n`;
    }

    if (overdue.length > 0) {
      messageText += `📋 *Overdue (${overdue.length}):*\n`;
      overdue.forEach(task => {
        messageText += `• ${task.title}\n`;
      });
      messageText += `\n`;
    }

    if (pages && pages.length > 0) {
      messageText += `📄 *Pages Updated Today (${pages.length}):*\n`;
      pages.forEach(page => {
        messageText += `• ${page.title || 'Untitled'}\n`;
      });
      messageText += `\n`;
    }

    messageText += `_Have a productive day! 💪_\n_- Cora AI_`;

    const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const params = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: `whatsapp:${phone}`,
      Body: messageText
    });

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, digest: messageText });
    } else {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
