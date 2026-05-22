import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const dynamic = 'force-dynamic';

// Supabase client using env secrets to bypass middleware session restrictions in webhooks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
  let isTwilio = false;
  try {
    const contentType = req.headers.get('content-type') || '';
    isTwilio = contentType.includes('application/x-www-form-urlencoded');

    let message = '';
    let from = '';

    try {
      if (isTwilio) {
        const formData = await req.formData();
        message = formData.get('Body') as string || '';
        from = formData.get('From') as string || '';
      } else {
        const body = await req.json();
        message = body.message || body.Body || '';
        from = body.from || body.From || '';
      }
    } catch (parseErr: any) {
      console.error("[WhatsApp Webhook] Body parsing error:", parseErr);
      return NextResponse.json({ error: 'Failed to parse request body: ' + parseErr.message }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    console.log("[WhatsApp Webhook] Received message:", message, "from:", from);

    // 1. Fetch default user to attach the task/meeting to
    const { data: firstProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .limit(1)
      .maybeSingle();

    if (profileErr || !firstProfile) {
      console.error("[WhatsApp Webhook] Profile lookup error:", profileErr);
      return NextResponse.json({ error: 'No workspace user profile found to attach schedules.' }, { status: 500 });
    }

    const userId = firstProfile.id;
    const userName = firstProfile.name || 'Workspace User';

    // 2. Parse schedule intent using Gemini or robust local NLP matcher fallback
    let parsed: {
      type: 'task' | 'meeting' | 'unknown';
      title: string;
      date: string;
      duration?: number;
    } = { type: 'unknown', title: '', date: '' };

    const currentTimeISO = new Date().toISOString();

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
        });

        const prompt = `
          Analyze this WhatsApp message: "${message}".
          Decide if the user wants to schedule a "task" (to-do, follow up, reminder) or a "meeting" (sync, call, calendar event).
          Use the current time ${currentTimeISO} as the base reference to resolve terms like "tomorrow", "next Monday", "5pm", etc.
          
          Return ONLY a valid JSON object of the following format:
          {
            "type": "task" | "meeting" | "unknown",
            "title": "Short title describing the task or meeting",
            "date": "ISO 8601 string for the date/time",
            "duration": 60 (optional, duration in minutes if a meeting)
          }
          No formatting, no backticks, no markdown, no chat text. Just raw JSON.
        `;

        const { text } = await generateText({
          model: google('gemini-2.5-flash'),
          prompt,
        });

        const parsedJson = JSON.parse(text.trim().replace(/^```json\s*|```$/gi, ''));
        if (parsedJson && (parsedJson.type === 'task' || parsedJson.type === 'meeting')) {
          parsed = parsedJson;
        }
      } catch (err) {
        console.warn("[WhatsApp Webhook] Gemini parse failed, falling back to local NLP parser:", err);
      }
    }

    // Local high-fidelity NLP rules (handles "task/todo" and "meeting/sync" beautifully)
    if (parsed.type === 'unknown') {
      const lower = message.toLowerCase();
      const now = new Date();
      
      // Determine base date
      let targetDate = new Date();
      if (lower.includes('tomorrow')) {
        targetDate.setDate(now.getDate() + 1);
      } else if (lower.includes('next week') || lower.includes('in a week')) {
        targetDate.setDate(now.getDate() + 7);
      }

      // Check for times
      const timeMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) {
        let hr = parseInt(timeMatch[1]);
        const isPm = timeMatch[2].toLowerCase() === 'pm';
        if (isPm && hr < 12) hr += 12;
        if (!isPm && hr === 12) hr = 0;
        targetDate.setHours(hr, 0, 0, 0);
      } else {
        // Default to 9:00 AM tomorrow or today
        targetDate.setHours(9, 0, 0, 0);
      }

      // Intent determination
      const isMeeting = lower.includes('meeting') || lower.includes('sync') || lower.includes('call') || lower.includes('zoom');
      const isTask = lower.includes('task') || lower.includes('todo') || lower.includes('remind') || lower.includes('buy') || lower.includes('submit') || lower.includes('write');

      if (isMeeting) {
        // Extract meeting title
        let title = message.replace(/(schedule|meeting|sync|call|tomorrow|next week|at|on|for|pm|am|\d+)/gi, '').trim();
        parsed = {
          type: 'meeting',
          title: title ? `Sync: ${title}` : 'Scheduled Sync Call',
          date: targetDate.toISOString(),
          duration: 60
        };
      } else {
        // Fallback default is a task
        let title = message.replace(/(schedule|task|todo|remind|tomorrow|next week|at|on|for|pm|am|\d+)/gi, '').trim();
        parsed = {
          type: 'task',
          title: title || 'Task scheduled via WhatsApp',
          date: targetDate.toISOString()
        };
      }
    }

    let replyText = '';
    let createdTask = null;
    let createdPage = null;

    // 3. Perform database operations based on parsed intent
    if (parsed.type === 'task') {
      // Create supabase task
      const { data: maxTask } = await supabaseAdmin
        .from('tasks')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const position = maxTask ? (maxTask.position || 0) + 1 : 0;

      const { data: taskData, error: taskErr } = await supabaseAdmin
        .from('tasks')
        .insert([{
          user_id: userId,
          title: parsed.title,
          completed: false,
          position,
          due_date: parsed.date
        }])
        .select()
        .single();

      if (taskErr) throw taskErr;

      createdTask = taskData;
      const timeString = new Date(parsed.date).toLocaleDateString('default', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      replyText = `✅ *Task Scheduled!* \n\nI have successfully scheduled the task: *"${parsed.title}"* for you in Clearspace.\n📅 *Due Date:* ${timeString}\n\nType another message to schedule more tasks or meetings!`;
    } 
    else if (parsed.type === 'meeting') {
      // Create a gorgeous Meeting workspace document page
      const formattedTime = new Date(parsed.date).toLocaleDateString('default', {
        weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const pageContent = `
        <h1>🎙️ Meeting Notes: ${parsed.title}</h1>
        <p><em>Scheduled via WhatsApp Integration.</em></p>
        <hr/>
        <p>📅 <strong>Date & Time:</strong> ${formattedTime}</p>
        <p>👥 <strong>Attendees:</strong> ${userName}, Invitee</p>
        <h2>📋 Agenda & Discussion Topics</h2>
        <ul>
          <li>Topic 1: Introduction & Sync briefing</li>
          <li>Topic 2: Core item deep dive</li>
        </ul>
        <h2>📝 Key Action Items</h2>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false" data-status="todo">Follow up on sync action items</li>
        </ul>
      `.trim();

      const { data: pageData, error: pageErr } = await supabaseAdmin
        .from('pages')
        .insert([{
          user_id: userId,
          title: `🎙️ Meeting: ${parsed.title}`,
          content: pageContent,
          type: 'editor',
          icon: '🎙️'
        }])
        .select()
        .single();

      if (pageErr) throw pageErr;

      createdPage = pageData;
      replyText = `🎙️ *Meeting Scheduled!* \n\nI have successfully scheduled your meeting: *"${parsed.title}"*.\n📅 *Time:* ${formattedTime}\n📄 *Workspace Note created:* "Meeting: ${parsed.title}" with default agenda!\n\nI've generated a Notion-style briefing page for you in your workspace.`;
    } else {
      replyText = `Sorry, I couldn't resolve if that was a task or a meeting. Try sending something like: \n- *"Schedule task: submit monthly invoice tomorrow by 5pm"* \n- *"Schedule meeting: project planning tomorrow at 3pm"*`;
    }

    if (isTwilio) {
      // Return standard TwiML XML back to Twilio
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`.trim();

      return new NextResponse(twiml, {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } else {
      // Return standard JSON to the simulator
      return NextResponse.json({
        reply: replyText,
        task: createdTask,
        page: createdPage
      });
    }

  } catch (error: any) {
    console.error("[WhatsApp Webhook] Handler error:", error);
    
    if (isTwilio) {
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ *Clearspace Scheduler Error:* ${error.message || 'An unknown internal error occurred.'}</Message>
</Response>`;
      return new NextResponse(errorTwiml, {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
