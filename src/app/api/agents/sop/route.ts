import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { logAgentRun } from '@/lib/agents';
import { markdownToTiptap } from '@/lib/markdownToTiptap';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await req.json();
    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    // 1. Fetch current page content
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const pageContent = page.content || '';
    if (!pageContent.trim()) {
      return NextResponse.json({ error: 'Page content is empty. Add notes or drafts first.' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google AI key not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const systemPrompt = `You are a professional technical writer and process engineer. Return ONLY a valid HTML string representing a beautiful Standard Operating Procedure (SOP). Do not wrap in markdown code blocks.`;
    const userPrompt = `Convert this rough draft, note, or procedure description into a highly detailed, professional Standard Operating Procedure (SOP).
Make sure to construct:
1. A clear 'Purpose' section explaining the objective.
2. A 'Scope' section detailing who and what this procedure applies to.
3. A detailed, numbered 'Step-by-step Procedure'.
4. An HTML table mapping 'Roles & Responsibilities' (columns: Role, Responsibility).
5. A list of 'Tools & Resources Needed'.
6. A 'Common Mistakes to Avoid' callout block.

Use styling (bold tags, clean tables with borders, clear heading tags) to make it look extremely premium in a Notion-style editor.

Content to convert to SOP:
${pageContent}`;

    console.log("[SOP Agent] Calling Gemini...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: userPrompt
    });

    let sopHtml = text.trim();
    if (sopHtml.startsWith('```html')) sopHtml = sopHtml.substring(7);
    if (sopHtml.startsWith('```')) sopHtml = sopHtml.substring(3);
    if (sopHtml.endsWith('```')) sopHtml = sopHtml.substring(0, sopHtml.length - 3);
    sopHtml = sopHtml.trim();

    // 2. Overwrite page content and update icon to 📖
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        content: JSON.stringify(markdownToTiptap(sopHtml)),
        icon: '📖'
      })
      .eq('id', pageId);

    if (updateError) throw updateError;

    const outputLog = "Successfully generated comprehensive SOP. Modified page icon to 📖.";
    await logAgentRun(supabase, user.id, 'sop', 'Success', outputLog);

    return NextResponse.json({
      success: true,
      message: outputLog
    });

  } catch (error: any) {
    console.error("[SOP Agent ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Agent failed to run' }, { status: 500 });
  }
}
