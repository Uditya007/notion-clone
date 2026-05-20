import { SupabaseClient } from '@supabase/supabase-js';

export async function getPages(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPage(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createPage(supabase: SupabaseClient, data: { user_id: string; title?: string; parent_id?: string | null; icon?: string; type?: string }) {
  const { data: page, error } = await supabase
    .from('pages')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return page;
}

export async function updatePage(supabase: SupabaseClient, id: string, data: any) {
  const { data: page, error } = await supabase
    .from('pages')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return page;
}

export async function deletePage(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('pages')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function restorePage(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('pages')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function permanentlyDeletePage(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function getDeletedPages(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleFavorite(supabase: SupabaseClient, id: string, isFavorite: boolean) {
  const { data, error } = await supabase
    .from('pages')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
