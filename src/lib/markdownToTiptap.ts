import { marked } from 'marked';

type TiptapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
};

type TiptapMark = {
  type: string;
  attrs?: Record<string, any>;
};

// Translate inline tokens recursively to TipTap text nodes with marks
function translateInlineTokens(tokens: any[] | undefined): TiptapNode[] {
  if (!tokens || tokens.length === 0) {
    return [{ type: 'text', text: '' }];
  }

  const nodes: TiptapNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
      case 'escape': {
        // Plain text node
        nodes.push({
          type: 'text',
          text: token.text || '',
        });
        break;
      }
      case 'strong': {
        // Bold mark
        const childNodes = translateInlineTokens(token.tokens);
        childNodes.forEach((node) => {
          if (node.type === 'text') {
            node.marks = [...(node.marks || []), { type: 'bold' }];
          }
        });
        nodes.push(...childNodes);
        break;
      }
      case 'em': {
        // Italic mark
        const childNodes = translateInlineTokens(token.tokens);
        childNodes.forEach((node) => {
          if (node.type === 'text') {
            node.marks = [...(node.marks || []), { type: 'italic' }];
          }
        });
        nodes.push(...childNodes);
        break;
      }
      case 'codespan': {
        // Code mark
        nodes.push({
          type: 'text',
          text: token.text || '',
          marks: [{ type: 'code' }],
        });
        break;
      }
      case 'link': {
        // Link mark
        const childNodes = translateInlineTokens(token.tokens);
        childNodes.forEach((node) => {
          if (node.type === 'text') {
            node.marks = [
              ...(node.marks || []),
              {
                type: 'link',
                attrs: {
                  href: token.href,
                  title: token.title || null,
                  target: '_blank',
                },
              },
            ];
          }
        });
        nodes.push(...childNodes);
        break;
      }
      case 'br': {
        // Hard break in TipTap
        nodes.push({
          type: 'hardBreak',
        });
        break;
      }
      case 'html': {
        // If inline HTML tag exists, parse it as plain text
        nodes.push({
          type: 'text',
          text: token.text || '',
        });
        break;
      }
      default: {
        // Fallback for other inline elements
        if (token.text) {
          nodes.push({
            type: 'text',
            text: token.text,
          });
        }
      }
    }
  }

  // Clean empty nodes
  return nodes.filter((n) => n.type !== 'text' || n.text !== '');
}

// Translate list items recursively to TipTap list items or task items
function translateListItems(items: any[], isTaskList: boolean): TiptapNode[] {
  return items.map((item) => {
    const itemContent: TiptapNode[] = [];

    // Translate any child paragraphs/tokens
    if (item.tokens && item.tokens.length > 0) {
      // Group inline and block items
      const inlineTokens = item.tokens.filter(
        (t: any) =>
          ['text', 'strong', 'em', 'codespan', 'link', 'br', 'escape'].includes(t.type)
      );
      const blockTokens = item.tokens.filter(
        (t: any) =>
          !['text', 'strong', 'em', 'codespan', 'link', 'br', 'escape'].includes(t.type)
      );

      if (inlineTokens.length > 0) {
        itemContent.push({
          type: 'paragraph',
          content: translateInlineTokens(inlineTokens),
        });
      }

      // Process sub-blocks (e.g. sub-lists or nested lists)
      for (const block of blockTokens) {
        if (block.type === 'list') {
          const nestedIsTaskList = block.items.some((i: any) => i.task === true);
          itemContent.push({
            type: nestedIsTaskList ? 'taskList' : block.ordered ? 'orderedList' : 'bulletList',
            ...(block.ordered ? { attrs: { start: block.start || 1 } } : {}),
            content: translateListItems(block.items, nestedIsTaskList),
          });
        } else {
          // General sub-block content
          const blockNodes = translateBlockToken(block);
          if (blockNodes) {
            itemContent.push(blockNodes);
          }
        }
      }
    }

    if (itemContent.length === 0) {
      itemContent.push({
        type: 'paragraph',
        content: [{ type: 'text', text: '' }],
      });
    }

    if (isTaskList) {
      return {
        type: 'taskItem',
        attrs: { checked: item.checked || false },
        content: itemContent,
      };
    }

    return {
      type: 'listItem',
      content: itemContent,
    };
  });
}

// Translate a single block-level token to a TipTap Node
function translateBlockToken(token: any): TiptapNode | null {
  switch (token.type) {
    case 'heading': {
      return {
        type: 'heading',
        attrs: { level: token.depth },
        content: translateInlineTokens(token.tokens),
      };
    }
    case 'paragraph': {
      return {
        type: 'paragraph',
        content: translateInlineTokens(token.tokens),
      };
    }
    case 'hr': {
      return {
        type: 'horizontalRule',
      };
    }
    case 'code': {
      return {
        type: 'codeBlock',
        attrs: { language: token.lang || null },
        content: [
          {
            type: 'text',
            text: token.text || '',
          },
        ],
      };
    }
    case 'blockquote': {
      // In TipTap blockquote content must be block nodes, e.g. paragraphs
      const tokens = marked.lexer(token.text);
      const blockquoteContent: TiptapNode[] = [];
      for (const t of tokens) {
        const node = translateBlockToken(t);
        if (node) blockquoteContent.push(node);
      }
      if (blockquoteContent.length === 0) {
        blockquoteContent.push({
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        });
      }
      return {
        type: 'blockquote',
        content: blockquoteContent,
      };
    }
    case 'list': {
      const isTaskList = token.items.some((i: any) => i.task === true);
      return {
        type: isTaskList ? 'taskList' : token.ordered ? 'orderedList' : 'bulletList',
        ...(token.ordered ? { attrs: { start: token.start || 1 } } : {}),
        content: translateListItems(token.items, isTaskList),
      };
    }
    case 'space':
    default: {
      return null;
    }
  }
}

/**
 * Parses raw markdown and converts it into a TipTap-compatible JSON document object structure.
 * @param markdown The raw markdown content string to convert.
 */
export function markdownToTiptap(markdown: string): object {
  if (!markdown || markdown.trim() === '') {
    return {
      type: 'doc',
      content: [],
    };
  }

  // Parse markdown into tokens using the marked lexer
  const tokens = marked.lexer(markdown);
  const docContent: TiptapNode[] = [];

  for (const token of tokens) {
    const node = translateBlockToken(token);
    if (node) {
      docContent.push(node);
    }
  }

  return {
    type: 'doc',
    content: docContent,
  };
}
