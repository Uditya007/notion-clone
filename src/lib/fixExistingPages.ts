import { markdownToTiptap } from './markdownToTiptap';

/**
 * Migration helper to identify if a page's content is in raw markdown format,
 * and if so, convert it to a serialized TipTap JSON string.
 */
export function fixPageContent(content: string): string {
  if (!content || content.trim() === '') {
    return content;
  }

  // 1. Check if it's already a valid TipTap JSON string
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      // DETECT IF IT IS A WRAPPED SINGLE PARAGRAPH OF RAW MARKDOWN
      if (parsed.content && parsed.content.length === 1 && parsed.content[0].type === 'paragraph') {
        const firstNode = parsed.content[0];
        if (firstNode.content && firstNode.content.length === 1 && firstNode.content[0].type === 'text') {
          const textVal = firstNode.content[0].text || '';
          const isRawMarkdownWrapped = /(?:#|##|###|- |\* |\d+\. |\[[ x]\]|\*\*|_|`)/m.test(textVal);
          if (isRawMarkdownWrapped) {
            const tiptapJson = markdownToTiptap(textVal);
            return JSON.stringify(tiptapJson);
          }
        }
      }
      return content; // Already a valid multi-node or non-markdown JSON document
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
