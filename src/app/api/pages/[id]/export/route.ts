import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPage } from '@/lib/db/pages';

export const dynamic = 'force-dynamic';

// Helper to convert basic Tiptap HTML markup to clean Markdown text
function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Process block level formatting
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  
  // Process code blocks
  md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n\n');

  // Process list items
  md = md.replace(/<li data-type="taskItem" data-checked="true">(.*?)<\/li>/gi, '- [x] $1\n');
  md = md.replace(/<li data-type="taskItem" data-checked="false">(.*?)<\/li>/gi, '- [ ] $1\n');
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  
  // Clean surrounding list wrapper tags
  md = md.replace(/<ul data-type="taskList">/gi, '');
  md = md.replace(/<ul>/gi, '');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol>/gi, '');
  md = md.replace(/<\/ol>/gi, '\n');

  // Paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');

  // Inline formatting
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u>(.*?)<\/u>/gi, '_$1_');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  
  // Remove links HTML tags
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Clean trailing spaces and HTML breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/&nbsp;/gi, ' ');
  md = md.replace(/&lt;/gi, '<');
  md = md.replace(/&gt;/gi, '>');
  md = md.replace(/&amp;/gi, '&');

  // Strip any remaining unhandled HTML tags
  md = md.replace(/<[^>]*>/g, '');

  return md.trim();
}

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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown'; // markdown or html

    const page = await getPage(supabase, id);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const title = page.title || 'Untitled';
    const cleanFileName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (format === 'markdown') {
      const header = `---\ntitle: "${title}"\nicon: "${page.icon || '📄'}"\ncover: "${page.cover_image || 'None'}"\ncreated_at: "${page.created_at}"\n---\n\n# ${page.icon || '📄'} ${title}\n\n`;
      const body = htmlToMarkdown(page.content || '');
      const fullText = header + body;

      return new Response(fullText, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${cleanFileName}.md"`,
        },
      });
    }

    if (format === 'html') {
      // Build visual HTML themed page matching Cora's layout for PDF printing
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 40px;
    }
    .cover-image {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header {
      margin-bottom: 40px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 12px;
      display: inline-block;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 10px 0;
      letter-spacing: -0.5px;
    }
    .meta {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
    }
    .content {
      font-size: 16px;
      color: #374151;
    }
    p {
      margin: 0 0 16px 0;
    }
    ul, ol {
      margin: 0 0 20px 0;
      padding-left: 24px;
    }
    li {
      margin-bottom: 6px;
    }
    /* Checklist styles */
    ul[data-type="taskList"] {
      list-style: none;
      padding-left: 0;
    }
    li[data-type="taskItem"] {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 15.5px;
    }
    li[data-type="taskItem"]::before {
      content: "☐";
      font-size: 18px;
      color: #9ca3af;
      margin-right: 10px;
      line-height: 1;
      flex-shrink: 0;
    }
    li[data-type="taskItem"][data-checked="true"] {
      text-decoration: line-through;
      color: #9ca3af;
    }
    li[data-type="taskItem"][data-checked="true"]::before {
      content: "☑";
      color: #8b5cf6;
    }
    code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      color: #eb5757;
    }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: 14px;
    }
    @media print {
      body {
        background: white;
        color: black;
      }
      .wrapper {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${page.cover_image ? `<img class="cover-image" src="${page.cover_image}" alt="Cover">` : ''}
    <div class="header">
      <span class="icon">${page.icon || '📄'}</span>
      <h1>${title}</h1>
      <div class="meta">Created on ${new Date(page.created_at).toLocaleDateString()} &middot; Exported via Cora Workspace</div>
    </div>
    <div class="content">
      ${page.content || '<p style="color:#9ca3af; font-style:italic;">No content inside this page yet.</p>'}
    </div>
  </div>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${cleanFileName}.html"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error: any) {
    console.error("[GET Export Page Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
