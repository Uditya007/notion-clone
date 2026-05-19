import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Set runtime to edge for better streaming performance
export const runtime = 'edge';

export async function POST(req: Request) {
  const { prompt, context, command } = await req.json();

  // If no API key is provided, gracefully fallback to the Mock stream
  if (!process.env.ANTHROPIC_API_KEY) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const mockResponse = `\n\n*(Mock AI Response. Add ANTHROPIC_API_KEY to .env.local for real Claude AI)*\n\nYou asked to [${command}]. Based on your context, here is the generated response simulating Claude 3.5 Sonnet.`;
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
  let systemPrompt = "You are a helpful writing assistant built directly into a Notion-like editor.";
  
  if (context) {
    systemPrompt += `\n\nHere is the current content of the document the user is working on. Use it as context:\n"""\n${context}\n"""`;
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

  const result = await streamText({
    model: anthropic('claude-sonnet-4-20250514'), // Modern Claude Sonnet
    system: systemPrompt,
    prompt: prompt || "Execute the requested command on the document context.",
  });

  return result.toTextStreamResponse();
}
