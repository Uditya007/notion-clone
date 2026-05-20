import { SupabaseClient } from '@supabase/supabase-js';

export interface PageHistoryEntry {
  id: string;
  page_id: string;
  user_id: string;
  user_email: string;
  action_type: 'title' | 'content' | 'icon' | 'cover';
  old_val: string | null;
  new_val: string | null;
  created_at: string;
}

// Resilient in-memory fallback list to cache page version records
let localHistoryCache: Record<string, PageHistoryEntry[]> = {};

export async function logPageHistory(
  supabase: SupabaseClient,
  pageId: string,
  userId: string,
  userEmail: string,
  actionType: 'title' | 'content' | 'icon' | 'cover',
  oldVal: string | null,
  newVal: string | null
): Promise<PageHistoryEntry | null> {
  // Guard clause against logging identical states
  if (oldVal === newVal) return null;

  const newEntry: PageHistoryEntry = {
    id: Math.random().toString(36).substring(7),
    page_id: pageId,
    user_id: userId,
    user_email: userEmail,
    action_type: actionType,
    old_val: oldVal,
    new_val: newVal,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('page_history')
      .insert([newEntry])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("[History DB Fallback] Storing in local cache:", err);
    if (!localHistoryCache[pageId]) {
      localHistoryCache[pageId] = [];
    }
    localHistoryCache[pageId].unshift(newEntry);
    return newEntry;
  }
}

export async function getPageHistory(supabase: SupabaseClient, pageId: string): Promise<PageHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('page_history')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("[History DB Fallback] Fetching from local cache:", err);
    return localHistoryCache[pageId] || [];
  }
}

export async function restorePageVersion(supabase: SupabaseClient, pageId: string, entryId: string): Promise<boolean> {
  try {
    let entry: PageHistoryEntry | undefined;

    // Search cache first
    entry = localHistoryCache[pageId]?.find(e => e.id === entryId);

    // If not found in cache, lookup in DB
    if (!entry) {
      const { data, error } = await supabase
        .from('page_history')
        .select('*')
        .eq('id', entryId)
        .single();

      if (!error && data) {
        entry = data;
      }
    }

    if (!entry) return false;

    // Update active page using dynamic payload structure
    const updates: Record<string, any> = {};
    if (entry.action_type === 'title') updates.title = entry.old_val;
    if (entry.action_type === 'content') updates.content = entry.old_val;
    if (entry.action_type === 'icon') updates.icon = entry.old_val;
    if (entry.action_type === 'cover') updates.cover_image = entry.old_val;

    const { error: pageErr } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', pageId);

    if (pageErr) throw pageErr;

    // Remove the entry and newer entries from history upon successful rollback
    if (localHistoryCache[pageId]) {
      localHistoryCache[pageId] = localHistoryCache[pageId].filter(e => e.id !== entryId);
    }

    return true;
  } catch (err) {
    console.error("[Restore Page Version Error]:", err);
    return false;
  }
}
