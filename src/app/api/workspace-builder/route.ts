import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { markdownToTiptap } from '@/lib/markdownToTiptap';

export const dynamic = 'force-dynamic';

interface PageSchema {
  title: string;
  icon: string;
  type: 'editor' | 'database';
  content?: string;
  database?: {
    name: string;
    columns: {
      name: string;
      type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'url';
      options?: string[];
    }[];
    sampleRows: Record<string, any>[];
  };
  children?: PageSchema[];
}

interface WorkspaceSchema {
  workspaceName: string;
  icon: string;
  pages: PageSchema[];
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description } = await req.json();
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'AI key not configured in .env.local' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const systemPrompt = `You are a workspace architect for a productivity app. Return ONLY valid JSON. No explanation, no markdown, just raw JSON.`;
    const userPrompt = `Build a complete workspace for: ${description}

Return this exact JSON format:
{
  "workspaceName": "string",
  "icon": "emoji",
  "pages": [
    {
      "title": "string",
      "icon": "emoji",
      "type": "editor" or "database",
      "content": "string (rich HTML or markdown content for document/editor pages)",
      "database": {
        "name": "string",
        "columns": [
          {
            "name": "string",
            "type": "text" or "number" or "select" or "multiselect" or "date" or "checkbox" or "url",
            "options": ["string"] (only for select/multiselect types)
          }
        ],
        "sampleRows": [
          { "columnName": "value" }
        ]
      },
      "children": [same structure, max 2 levels deep]
    }
  ]
}`;

    console.log("[AI Workspace Builder] Sending prompt to AI model...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    console.log("[AI Workspace Builder] Received response. Parsing JSON...");
    
    // Clean response text to ensure it only contains valid JSON
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    const workspaceData: WorkspaceSchema = JSON.parse(cleanedText);
    console.log("[AI Workspace Builder] Parsed successfully. Generating pages in Supabase...");

    const createdPageIds: string[] = [];

    // Recursive helper to insert pages
    const insertPageRecursive = async (pageData: PageSchema, parentId: string | null = null): Promise<string> => {
      // 1. Create page
      const formattedContent = pageData.type === 'editor' && pageData.content
        ? JSON.stringify(markdownToTiptap(pageData.content))
        : (pageData.content || '');

      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert([{
          user_id: user.id,
          title: pageData.title || 'Untitled',
          icon: pageData.icon || '📄',
          type: pageData.type || 'editor',
          content: formattedContent,
          parent_id: parentId,
        }])
        .select()
        .single();

      if (pageError || !newPage) {
        throw new Error(pageError?.message || 'Failed to create page');
      }

      createdPageIds.push(newPage.id);

      // 2. If it is a database, create databases, db_columns, db_rows
      if (pageData.type === 'database' && pageData.database) {
        const { data: newDb, error: dbError } = await supabase
          .from('databases')
          .insert([{
            page_id: newPage.id,
            user_id: user.id,
            view_type: 'table'
          }])
          .select()
          .single();

        if (dbError || !newDb) {
          throw new Error(dbError?.message || 'Failed to create database reference');
        }

        // Insert columns and preserve a name-to-id mapping
        const columnNameMap: Record<string, string> = {};
        
        for (let i = 0; i < pageData.database.columns.length; i++) {
          const col = pageData.database.columns[i];
          const { data: newCol, error: colError } = await supabase
            .from('db_columns')
            .insert([{
              database_id: newDb.id,
              name: col.name,
              type: col.type,
              options: col.options || [],
              position: i
            }])
            .select()
            .single();

          if (colError || !newCol) {
            throw new Error(colError?.message || 'Failed to create database column');
          }

          columnNameMap[col.name] = newCol.id;
        }

        // Insert rows with cell values mapped to column ids
        if (pageData.database.sampleRows && Array.isArray(pageData.database.sampleRows)) {
          for (let r = 0; r < pageData.database.sampleRows.length; r++) {
            const rowData: Record<string, any> = pageData.database.sampleRows[r] || {};
            const cells: Record<string, any> = {};

            const entries = Object.entries(rowData);
            for (let e = 0; e < entries.length; e++) {
              const [colName, colVal] = entries[e];
              const colId = columnNameMap[colName];
              if (colId) {
                cells[colId] = colVal;
              }
            }

            const { error: rowError } = await supabase
              .from('db_rows')
              .insert([{
                database_id: newDb.id,
                cells,
                position: r
              }]);

            if (rowError) {
              throw new Error(rowError.message || 'Failed to insert database sample row');
            }
          }
        }
      }

      // 3. Process children recursively if they exist
      if (pageData.children && Array.isArray(pageData.children)) {
        for (const child of pageData.children) {
          await insertPageRecursive(child, newPage.id);
        }
      }

      return newPage.id;
    };

    let firstPageId: string | null = null;

    // Iterate through root-level pages
    for (const page of workspaceData.pages) {
      const pageId = await insertPageRecursive(page, null);
      if (!firstPageId) {
        firstPageId = pageId;
      }
    }

    return NextResponse.json({
      success: true,
      workspaceName: workspaceData.workspaceName,
      createdCount: createdPageIds.length,
      firstPageId: firstPageId,
    });

  } catch (error: any) {
    console.error("[AI Workspace Builder ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Failed to build workspace' }, { status: 500 });
  }
}
