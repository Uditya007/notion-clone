import { SupabaseClient } from '@supabase/supabase-js';

export async function getTasks(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTask(supabase: SupabaseClient, userId: string, title: string) {
  const { data: maxTask } = await supabase
    .from('tasks')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = maxTask ? (maxTask.position || 0) + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert([{ user_id: userId, title, completed: false, position }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(supabase: SupabaseClient, id: string, data: any) {
  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updatedTask;
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function reorderTasks(supabase: SupabaseClient, userId: string, taskIds: string[]) {
  const promises = taskIds.map((id, index) =>
    supabase
      .from('tasks')
      .update({ position: index })
      .eq('id', id)
      .eq('user_id', userId)
  );

  await Promise.all(promises);
  return true;
}
