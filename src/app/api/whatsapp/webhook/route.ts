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
      type: 'task' | 'meeting' | 'query_tasks' | 'create_note' | 'unknown';
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
          Decide if the user wants to:
          1. "task": Schedule a new task (to-do, follow up, reminder, buy, etc.).
          2. "meeting": Schedule a new meeting (sync, call, calendar event).
          3. "query_tasks": Query, list, check, or be reminded of existing tasks already scheduled (e.g. "what are my tasks for tomorrow?", "remind me what tasks I have scheduled", "list my tasks for today").
          4. "create_note": User wants to save a note or text to their workspace. Trigger phrases: "note:", "remember this", "write down", "jot down", "save this", "add to workspace", "create page". Title should be first 50 chars of the content. Date can be empty string.
          5. "unknown": None of the above.
          
          Use the current time ${currentTimeISO} as the base reference to resolve terms like "tomorrow", "next Monday", "5pm", etc.
          
          Return ONLY a valid JSON object of the following format:
          {
            "type": "task" | "meeting" | "query_tasks" | "create_note" | "unknown",
            "title": "Short title describing the task/meeting, or the date description if query (e.g. 'tomorrow')",
            "date": "ISO 8601 string for the date/time (or target date if query)",
            "duration": 60 (optional, duration in minutes if a meeting)
          }
          No formatting, no backticks, no markdown, no chat text. Just raw JSON.
        `;

        const { text } = await generateText({
          model: google('gemini-2.5-flash'),
          prompt,
        });

        const parsedJson = JSON.parse(text.trim().replace(/^```json\s*|```$/gi, ''));
        if (parsedJson && (parsedJson.type === 'task' || parsedJson.type === 'meeting' || parsedJson.type === 'query_tasks' || parsedJson.type === 'create_note')) {
          parsed = parsedJson;
        }
      } catch (err) {
        console.warn("[WhatsApp Webhook] Gemini parse failed, falling back to local NLP parser:", err);
      }
    }

    // Local high-fidelity NLP rules (handles "task/todo", "meeting/sync" and "query_tasks" beautifully)
    if (parsed.type === 'unknown') {
      const lower = message.toLowerCase();
      const now = new Date();
      
      const isQuery = lower.includes('list') || lower.includes('show') || lower.includes('what are') || lower.includes('remind me') || lower.includes('check tasks') || lower.includes('get tasks');

      if (isQuery) {
        let targetDate = new Date();
        if (lower.includes('tomorrow')) {
          targetDate.setDate(now.getDate() + 1);
        } else if (lower.includes('yesterday')) {
          targetDate.setDate(now.getDate() - 1);
        }
        parsed = {
          type: 'query_tasks',
          title: lower.includes('tomorrow') ? 'tomorrow' : 'today',
          date: targetDate.toISOString()
        };
      } else {
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
          const isNote = ['note:', 'remember:', 'jot:', 'write down:', 'save:'].some(kw => lower.includes(kw));
          if (isNote) {
            const kw = ['note:', 'remember:', 'jot:', 'write down:', 'save:'].find(k => lower.includes(k));
            const noteContent = kw ? message.substring(lower.indexOf(kw) + kw.length).trim() : message;
            parsed = { type: 'create_note', title: noteContent.slice(0, 50), date: '' };
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
    } 
    else if (parsed.type === 'create_note') {
      const noteContent = message; // full original message
      const noteTitle = parsed.title || "WhatsApp Note - " + new Date().toLocaleDateString();
      const datetime = new Date().toLocaleString();
      
      const { data: pageData, error: pageErr } = await supabaseAdmin
        .from('pages')
        .insert([{
          user_id: userId,
          title: noteTitle,
          content: "<p>" + noteContent + "</p><p><em>Created via WhatsApp on " + datetime + "</em></p>",
          icon: "📱",
          type: "editor"
        }])
        .select()
        .single();
        
      if (pageErr) throw pageErr;
      
      createdPage = pageData;
      replyText = "📱 *Note Saved!*\n\nI've created a new page in your workspace:\n*\"" + noteTitle + "\"*\n\nOpen Cora to view and edit it!";
    }
    else if (parsed.type === 'query_tasks') {
      const lowerMsg = message.toLowerCase();
      // If the query doesn't specify a clear target day (e.g. general query), query all incomplete tasks
      const hasSpecificDay = lowerMsg.includes('tomorrow') || lowerMsg.includes('today') || lowerMsg.includes('yesterday') || lowerMsg.includes('monday') || lowerMsg.includes('tuesday') || lowerMsg.includes('wednesday') || lowerMsg.includes('thursday') || lowerMsg.includes('friday') || lowerMsg.includes('saturday') || lowerMsg.includes('sunday');

      if (!hasSpecificDay) {
        // Query all incomplete tasks
        const { data: tasksList, error: tasksErr } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', false)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (tasksErr) throw tasksErr;

        if (!tasksList || tasksList.length === 0) {
          replyText = `🎉 *All Caught Up!* \n\nYou have no incomplete tasks in your Clearspace workspace right now.\n\nEnjoy your free time!`;
        } else {
          let listStr = `📋 *Your Incomplete Tasks:* \n\n`;
          tasksList.forEach((task: any, index: number) => {
            let dueStr = '';
            if (task.due_date) {
              const isISO = task.due_date.includes('T');
              const datePart = isISO ? task.due_date.split('T')[0] : task.due_date;
              const dateObj = new Date(datePart + 'T00:00:00');
              const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              let timeStr = '';
              if (isISO) {
                const timePart = task.due_date.split('T')[1]?.substring(0, 5);
                if (timePart && timePart !== '00:00') {
                  const fullDateObj = new Date(task.due_date);
                  timeStr = ` at ${fullDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                }
              }
              dueStr = ` (📅 Due: *${formattedDate}${timeStr}*)`;
            }
            listStr += `${index + 1}. *${task.title}*${dueStr}\n`;
          });
          
          listStr += `\nAccess your workspace to manage or mark them as completed!`;
          replyText = listStr;
        }
      } else {
        // Target date range query
        const targetDateObj = new Date(parsed.date);
        const startOfDay = new Date(targetDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDateObj);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: tasksList, error: tasksErr } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('due_date', startOfDay.toISOString())
          .lte('due_date', endOfDay.toISOString())
          .order('due_date', { ascending: true });

        if (tasksErr) throw tasksErr;

        const formattedDay = targetDateObj.toLocaleDateString('default', {
          weekday: 'long', month: 'short', day: 'numeric'
        });

        if (!tasksList || tasksList.length === 0) {
          replyText = `🎉 *No Tasks Scheduled!* \n\nYou have no tasks scheduled for *${formattedDay}* in Clearspace.\n\nEnjoy your clear space!`;
        } else {
          let listStr = `📋 *Your Tasks for ${formattedDay}:* \n\n`;
          tasksList.forEach((task: any, index: number) => {
            let timeStr = '';
            if (task.due_date && task.due_date.includes('T')) {
              const timePart = task.due_date.split('T')[1]?.substring(0, 5);
              if (timePart && timePart !== '00:00') {
                const fullDateObj = new Date(task.due_date);
                timeStr = ` (🕒 ${fullDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
              }
            }
            const statusIcon = task.completed ? '✅' : '❌';
            const statusText = task.completed ? 'Completed' : 'Incomplete';
            listStr += `${index + 1}. *${task.title}*${timeStr} - ${statusIcon} _${statusText}_\n`;
          });
          
          listStr += `\nKeep up the great work!`;
          replyText = listStr;
        }
      }
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
