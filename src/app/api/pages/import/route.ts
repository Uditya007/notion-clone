import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPage } from '@/lib/db/pages';

export const dynamic = 'force-dynamic';

// Helper to convert simple Markdown text into structured TipTap HTML
function markdownToHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inTaskList = false;
  let inCode = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCode) {
        // End of code block
        html += `<pre><code>${codeContent.trim()}</code></pre>`;
        inCode = false;
        codeContent = '';
      } else {
        // Start of code block
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + '\n';
      continue;
    }

    // Handle Headers
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>`;
      continue;
    }

    // Handle Checklist Items
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (!inTaskList) {
        html += '<ul data-type="taskList">';
        inTaskList = true;
      }
      const checked = line.startsWith('- [x] ');
      const title = line.substring(6);
      html += `<li data-type="taskItem" data-checked="${checked ? 'true' : 'false'}" data-status="${checked ? 'done' : 'todo'}">${title}</li>`;
      continue;
    }

    // Handle standard list items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line.substring(2)}</li>`;
      continue;
    }

    // Close open lists if an empty or different element is found
    if (line === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }
      continue;
    }

    // Wrap remaining lines in simple paragraphs
    if (line.length > 0) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }

      // Inline styles replacements
      let formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

      html += `<p>${formattedLine}</p>`;
    }
  }

  // Ensure all lists are closed
  if (inList) html += '</ul>';
  if (inTaskList) html += '</ul>';

  return html;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    let title = file.name.split('.').shift() || 'Imported Page';
    let content = '';
    let icon = '📄';

    if (file.name.endsWith('.md')) {
      // 1. Process Markdown import
      let cleanText = text;

      // Extract basic frontmatter details if present
      if (text.startsWith('---')) {
        const parts = text.split('---');
        if (parts.length >= 3) {
          const frontmatter = parts[1];
          cleanText = parts.slice(2).join('---').trim();

          const titleMatch = frontmatter.match(/title:\s*"(.*?)"/);
          if (titleMatch) title = titleMatch[1];

          const iconMatch = frontmatter.match(/icon:\s*"(.*?)"/);
          if (iconMatch) icon = iconMatch[1];
        }
      }

      content = markdownToHtml(cleanText);
    } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      // 2. Process HTML import
      // Extract title from HTML tags
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) title = titleMatch[1];

      const h1Match = text.match(/<h1>(.*?)<\/h1>/i);
      if (h1Match && !titleMatch) title = h1Match[1].replace(/<[^>]*>/g, '');

      // Locate page body or core content wrapper
      const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i);
      const innerContent = bodyMatch ? bodyMatch[1] : text;

      // Clean out basic styling blocks if present
      content = innerContent.replace(/<style([\s\S]*?)<\/style>/gi, '').trim();
    } else {
      return NextResponse.json({ error: 'Only Markdown (.md) or HTML (.html) files are allowed for import.' }, { status: 400 });
    }

    // 3. Create the new workspace page in Supabase
    const newPage = await createPage(supabase, {
      user_id: user.id,
      title,
      icon,
      type: 'editor',
    });

    // 4. Update the created page content
    const { data: updatedPage, error } = await supabase
      .from('pages')
      .update({ content })
      .eq('id', newPage.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedPage);

  } catch (error: any) {
    console.error("[POST Page Import Route Error]:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
