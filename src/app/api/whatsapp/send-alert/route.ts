import { NextResponse } from 'next/server';

interface Task {
  id: string;
  title: string;
  due_date: string;
}

export async function POST(req: Request) {
  try {
    const { phone, overdue, dueToday } = await req.json() as { phone: string, overdue: Task[], dueToday: Task[] };

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 200 });
    }

    let message = "⚠️ *Cora Task Reminder*\n\nYou have tasks requiring attention:\n\n";

    if (overdue && overdue.length > 0) {
      message += "🔴 *Overdue:*\n";
      overdue.forEach(task => {
        const dateStr = new Date(task.due_date).toLocaleDateString();
        message += `• ${task.title} (was due ${dateStr})\n`;
      });
      message += "\n";
    }

    if (dueToday && dueToday.length > 0) {
      message += "🟡 *Due Today:*\n";
      dueToday.forEach(task => {
        message += `• ${task.title}\n`;
      });
      message += "\n";
    }

    message += "Open Cora to action these!\n_Cora Workspace_";

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const params = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: `whatsapp:${phone}`,
      Body: message
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
      return NextResponse.json({ success: true, messageSid: data.sid });
    } else {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
