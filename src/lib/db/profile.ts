import { SupabaseClient } from '@supabase/supabase-js';

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(supabase: SupabaseClient, userId: string, data: any) {
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return updatedProfile;
}

export async function updateWorkspaceName(supabase: SupabaseClient, userId: string, name: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ workspace_name: name })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
