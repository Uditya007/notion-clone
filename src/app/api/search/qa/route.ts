import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@/lib/supabase/server';
import { getPages } from '@/lib/db/pages';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing search query' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch all pages in the workspace
    const pages = await getPages(supabase, user.id);

    // 2. Perform lightweight semantic/keyword filtering to get relevant page contents
    const relevantPages = pages
      .filter((page: any) => {
        const titleMatch = page.title?.toLowerCase().includes(query.toLowerCase());
        const contentMatch = page.content?.toLowerCase().includes(query.toLowerCase());
        return titleMatch || contentMatch;
      })
      // Fallback to top pages if no direct string match, to provide intelligent coverage
      .slice(0, 5);

    const pagesToUse = relevantPages.length > 0 ? relevantPages : pages.slice(0, 3);

    // 3. Format page contents as context for AI
    const docContext = pagesToUse.map((page: any, idx: number) => {
      // Strip HTML tags for clean text content
      const cleanContent = page.content ? page.content.replace(/<[^>]*>/g, ' ').substring(0, 1500) : 'Empty Page';
      return `[Source ${idx + 1}] Title: "${page.title || 'Untitled'}" (ID: ${page.id})\nContent Snippet: ${cleanContent}\n---`;
    }).join('\n\n');

    // 4. Construct high-performance system prompt
    const systemPrompt = `You are "Cora AI", the advanced intelligent search assistant built directly into the Cora workspace.
Your task is to answer the user's search query by pulling facts directly from their workspace document context listed below.

Workspace Documents Context:
"""
${docContext || "No matching pages found."}
"""

Guidelines:
1. Ground your answer strictly in the facts provided in the workspace documents.
2. If the user's query refers to details found in the documents, summarize the answer and explicitly cite which page title (e.g. "According to your page 'Competitor Research'...") you pulled it from.
3. Be professional, concise, and helpful. Format your response beautifully in Markdown.
4. If the workspace context doesn't contain the answer, answer gracefully but state that you couldn't find it in their current pages, then suggest what they can search for.`;

    // 5. Stream response via Google Gemini
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const mockResponse = `\n\n*(Cora AI Search Mock)*\n\nYou searched for: "${query}".\n\nTo enable full intelligent answer streaming across all your documents, add your \`GOOGLE_GENERATIVE_AI_API_KEY\` to your \`.env.local\` file. Once configured, Cora AI will read, index, and answer questions grounded in your workspace pages!`;
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

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `Search Query: "${query}"`,
    });

    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error("[Cora AI Search Q&A API Error]:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during search answer generation." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
