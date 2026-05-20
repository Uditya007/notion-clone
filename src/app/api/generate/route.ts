import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { prompt, context, command, grounded } = await req.json();

  console.log("[API/GENERATE] Received command:", command, "grounded:", grounded);
  console.log("[API/GENERATE] GOOGLE_GENERATIVE_AI_API_KEY exists in process.env:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  // If no API key is provided, gracefully fallback to the Mock stream
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const mockResponse = `\n\n*(Mock AI Response. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local for real Gemini AI)*\n\nYou asked: "${prompt}".\n\n[Grounded Workspace Q&A Mode: ${grounded ? 'ACTIVE' : 'INACTIVE'}]\n\nBased on your workspace context, here is the generated response simulating Gemini 2.5 Flash.`;
        const words = mockResponse.split(' ');
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' },
    });
  }

  // Construct system prompt based on the specific command
  let systemPrompt = "You are a helpful writing assistant built directly into the Cora workspace editor.";
  
  if (context) {
    systemPrompt += `\n\nHere is the current content of the document or chat history the user is working on. Use it as context:\n"""\n${context}\n"""`;
  }

  // Handle grounded search capability across all user pages
  if (grounded) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pages } = await supabase
          .from('pages')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .limit(10); // get top 10 pages for grounding
        
        if (pages && pages.length > 0) {
          const docContext = pages.map((page: any, idx: number) => {
            const cleanContent = page.content ? page.content.replace(/<[^>]*>/g, ' ').substring(0, 1000) : 'Empty Page';
            return `[Document Source ${idx + 1}] Title: "${page.title || 'Untitled'}" (ID: ${page.id})\nContent Snippet: ${cleanContent}\n---`;
          }).join('\n\n');

          systemPrompt += `\n\nWORKSPACE KNOWLEDGE GROUNDING:\nYou have access to the user's workspace pages. Answer questions grounded in these documents when relevant. If you cite information from a source, mention its Title in your answer.\n\nWorkspace Documents:\n"""\n${docContext}\n"""`;
        }
      }
    } catch (err) {
      console.warn("[API/GENERATE] Grounding page fetch failed, proceeding with prompt:", err);
    }
  }

  if (command === 'summarize') {
    systemPrompt += "\n\nYour task is to summarize the user's document or prompt concisely.";
  } else if (command === 'improve') {
    systemPrompt += "\n\nYour task is to rewrite the text to improve its grammar, clarity, and flow.";
  } else if (command === 'fix_grammar') {
    systemPrompt += "\n\nYour task is to fix any spelling or grammatical errors in the text without changing its meaning.";
  } else if (command === 'longer') {
    systemPrompt += "\n\nYour task is to expand on the user's text, adding more detail and length while maintaining the original tone.";
  } else if (command === 'shorter') {
    systemPrompt += "\n\nYour task is to make the text shorter and more punchy.";
  } else if (command === 'translate') {
    systemPrompt += "\n\nYour task is to translate the text into the requested language.";
  } else if (command === 'tone_professional') {
    systemPrompt += "\n\nYour task is to rewrite the text in a highly professional, formal tone suitable for business.";
  } else if (command === 'tone_casual') {
    systemPrompt += "\n\nYour task is to rewrite the text in a friendly, casual, conversational tone.";
  }

  // Inject current date & time so Gemini can parse calendar requests relative to now
  const now = new Date();
  systemPrompt += `\n\nCurrent Time Context:\n- The current date/time is: ${now.toString()}\n- The current UTC ISO string is: ${now.toISOString()}\n- Format dates relative to this time.`;

  systemPrompt += `\n\nTask & Event Creation Capabilities:
If the user asks you to create a task, todo, reminder, or schedule a meeting, you MUST execute the action by appending a special, machine-readable command tag at the very end of your response text.
Guidelines:
1. For creating a Task (Todo):
   Format: [CREATE_TASK: Title | Due date/text]
   Example: "I've added the task for you! [CREATE_TASK: Finish math assignment | Today]"
2. For scheduling a Meeting or Event:
   Format: [CREATE_EVENT: Event Title | Start DateTime (ISO 8601 string) | End DateTime (ISO 8601 string)]
   IMPORTANT: Always construct valid ISO 8601 datetime strings in local or UTC timezone (e.g. 2026-05-21T16:00:00+05:30) for the Start and End times. Make meetings 1 hour long by default if not specified.
   Example: "Meeting scheduled! [CREATE_EVENT: Project Review | 2026-05-21T14:00:00+05:30 | 2026-05-21T15:00:00+05:30]"

Always be extremely polite and helpful. If you execute a task or event command, explain briefly to the user that you did so.`;

  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    console.log("[API/GENERATE] Calling streamText with gemini-2.5-flash...");
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: prompt || "Execute the requested command on the document context.",
    });

    console.log("[API/GENERATE] streamText call successful, returning response stream.");
    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error("[API/GENERATE] Error during AI generation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during AI generation." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
