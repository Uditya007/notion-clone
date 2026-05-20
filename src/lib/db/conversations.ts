import { SupabaseClient } from '@supabase/supabase-js';

export async function getConversations(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createConversation(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user_id: userId, title: 'New chat' }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addMessage(supabase: SupabaseClient, conversationId: string, role: string, content: string) {
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert([{ conversation_id: conversationId, role, content }])
    .select()
    .single();

  if (msgError) throw msgError;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return message;
}

export async function getMessages(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function deleteConversation(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function updateConversationTitle(supabase: SupabaseClient, id: string, title: string) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
