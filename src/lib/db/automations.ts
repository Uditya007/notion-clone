import { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export interface DbAutomationRule {
  id: string;
  db_id: string;
  trigger_col_id: string;
  trigger_val: string;
  action_type: 'email' | 'calendar' | 'ai';
  action_config?: {
    emailTo?: string;
    calendarSummary?: string;
  };
}

// In-memory fallback rules storage for maximum robustness out-of-the-box
let localRulesCache: Record<string, DbAutomationRule[]> = {};

export async function getDbAutomations(supabase: SupabaseClient, dbId: string): Promise<DbAutomationRule[]> {
  try {
    const { data, error } = await supabase
      .from('db_automations')
      .select('*')
      .eq('db_id', dbId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("[Automations DB Fallback] Using local cache:", err);
    return localRulesCache[dbId] || [];
  }
}

export async function saveDbAutomation(supabase: SupabaseClient, rule: Omit<DbAutomationRule, 'id'>): Promise<DbAutomationRule> {
  const newRule: DbAutomationRule = {
    ...rule,
    id: Math.random().toString(36).substring(7)
  };

  try {
    const { data, error } = await supabase
      .from('db_automations')
      .insert([newRule])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("[Automations DB Fallback] Saving to local cache:", err);
    if (!localRulesCache[rule.db_id]) {
      localRulesCache[rule.db_id] = [];
    }
    localRulesCache[rule.db_id].push(newRule);
    return newRule;
  }
}

export async function deleteDbAutomation(supabase: SupabaseClient, dbId: string, ruleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('db_automations')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[Automations DB Fallback] Deleting from local cache:", err);
    if (localRulesCache[dbId]) {
      localRulesCache[dbId] = localRulesCache[dbId].filter(r => r.id !== ruleId);
    }
    return true;
  }
}

// Triggers execution when a database cell changes
export async function evaluateAndTriggerAutomations(
  supabase: SupabaseClient,
  dbId: string,
  rowId: string,
  columnId: string,
  newValue: string,
  userId: string
) {
  try {
    const rules = await getDbAutomations(supabase, dbId);
    const matchingRules = rules.filter(r => r.trigger_col_id === columnId && r.trigger_val === newValue);

    if (matchingRules.length === 0) return;

    console.log(`[Database Automations] Found ${matchingRules.length} matching rules! Triggering...`);

    // Fetch database structure to have row context
    const { data: db } = await supabase
      .from('databases')
      .select('*')
      .eq('id', dbId)
      .single();

    const { data: cols } = await supabase
      .from('db_columns')
      .select('*')
      .eq('db_id', dbId);

    const { data: row } = await supabase
      .from('db_rows')
      .select('*')
      .eq('id', rowId)
      .single();

    const rowCells = row?.cells || {};
    const rowTitle = rowCells[cols?.[0]?.id || ''] || 'Untitled Row';

    for (const rule of matchingRules) {
      if (rule.action_type === 'email') {
        const toEmail = rule.action_config?.emailTo || 'user@example.com';
        console.log(`[Database Automations] Triggering Email to ${toEmail}`);
        
        // Call local Google OAuth helper/API or construct mock
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/gmail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: toEmail,
              subject: `[Automation Alert] Row updated: ${rowTitle}`,
              body: `Hello,\n\nThis is an automated notification from your Clearspace workspace. The row "${rowTitle}" has matched your trigger criteria.\n\nDatabase: ${db?.name || 'Untitled Database'}\nTrigger Match: Status is now "${newValue}".\n\nHave a great day!\nClearspace Automations Engine`
            })
          });
        } catch (emailErr) {
          console.error("[Database Automations] Email failed:", emailErr);
        }
      }

      else if (rule.action_type === 'calendar') {
        const summary = rule.action_config?.calendarSummary || `Follow up: ${rowTitle}`;
        console.log(`[Database Automations] Triggering Calendar event: "${summary}"`);
        
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google/calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary,
              description: `Automated calendar task for row "${rowTitle}". Status: ${newValue}.`
            })
          });
        } catch (calErr) {
          console.error("[Database Automations] Calendar event failed:", calErr);
        }
      }

      else if (rule.action_type === 'ai') {
        console.log(`[Database Automations] Triggering AI Row Summary`);
        
        const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (googleApiKey) {
          const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
          const systemPrompt = `You are a professional business analyst. Return ONLY a valid HTML string representing a summary of this database item. Do not wrap in code blocks.`;
          const userPrompt = `Create a beautiful brief summary for the database item:
Title: ${rowTitle}
Database Name: ${db?.name || 'Workspace Database'}
Row Columns: ${JSON.stringify(cols || [])}
Row Values: ${JSON.stringify(rowCells)}

Write a professional report explaining performance bottlenecks, strategic advantages, and next steps for this item.`;

          const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: userPrompt
          });

          let summaryHtml = text.trim();
          if (summaryHtml.startsWith('```html')) summaryHtml = summaryHtml.substring(7);
          if (summaryHtml.startsWith('```')) summaryHtml = summaryHtml.substring(3);
          if (summaryHtml.endsWith('```')) summaryHtml = summaryHtml.substring(0, summaryHtml.length - 3);

          // Create dynamic page for the AI analysis
          await supabase
            .from('pages')
            .insert([{
              user_id: userId,
              title: `AI Analysis — ${rowTitle}`,
              icon: '🤖',
              type: 'editor',
              content: summaryHtml.trim()
            }]);
        }
      }
    }
  } catch (error) {
    console.error("[Database Automations Engine Error]:", error);
  }
}
