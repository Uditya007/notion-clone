import { markdownToTiptap } from './markdownToTiptap';

/**
 * Migration helper to identify if a page's content is in raw markdown format,
 * and if so, convert it to a serialized TipTap JSON string.
 */
export function fixPageContent(content: string): string {
  if (!content || content.trim() === '') {
    return content;
  }

  // 1. If it's already a valid TipTap JSON string, return as-is
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return content;
    }
  } catch {}

  // 2. Detect if content looks like raw markdown
  // Matches markdown headers, bold, italics, bullets, checklist, ordered list, or code span
  const looksLikeMarkdown = 
    /^\s*(?:#|##|###|####|- |\* |\d+\. |\[[ x]\]|\*\*|_|`|---)/m.test(content) ||
    (!content.includes('<p>') && !content.includes('</div>') && !content.includes('</h1>'));

  if (looksLikeMarkdown) {
    const tiptapJson = markdownToTiptap(content);
    return JSON.stringify(tiptapJson);
  }

  // 3. Fallback: return as-is (e.g. legacy HTML)
  return content;
}
