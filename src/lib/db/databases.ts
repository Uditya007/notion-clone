import { SupabaseClient } from '@supabase/supabase-js';

export async function getDatabase(supabase: SupabaseClient, pageId: string) {
  let { data: database, error } = await supabase
    .from('databases')
    .select('*')
    .eq('page_id', pageId)
    .maybeSingle();

  if (error) throw error;

  if (!database) {
    const { data: page } = await supabase.from('pages').select('user_id').eq('id', pageId).single();
    if (!page) throw new Error('Page not found');

    const { data: newDb, error: createError } = await supabase
      .from('databases')
      .insert([{ page_id: pageId, user_id: page.user_id }])
      .select()
      .single();

    if (createError) throw createError;
    database = newDb;
  }

  const { data: columns, error: colsError } = await supabase
    .from('db_columns')
    .select('*')
    .eq('database_id', database.id)
    .order('position', { ascending: true });

  if (colsError) throw colsError;

  const { data: rows, error: rowsError } = await supabase
    .from('db_rows')
    .select('*')
    .eq('database_id', database.id)
    .order('position', { ascending: true });

  if (rowsError) throw rowsError;

  return {
    ...database,
    columns: columns || [],
    rows: rows || [],
  };
}

export async function createDatabase(supabase: SupabaseClient, pageId: string, userId: string) {
  const { data: database, error } = await supabase
    .from('databases')
    .insert([{ page_id: pageId, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return database;
}

export async function addColumn(supabase: SupabaseClient, dbId: string, column: { name: string; type: string; options?: any; position?: number }) {
  const { data, error } = await supabase
    .from('db_columns')
    .insert([{ database_id: dbId, ...column }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateColumn(supabase: SupabaseClient, dbId: string, columnId: string, data: any) {
  const { data: updatedColumn, error } = await supabase
    .from('db_columns')
    .update(data)
    .eq('id', columnId)
    .eq('database_id', dbId)
    .select()
    .single();

  if (error) throw error;
  return updatedColumn;
}

export async function deleteColumn(supabase: SupabaseClient, dbId: string, columnId: string) {
  const { error } = await supabase
    .from('db_columns')
    .delete()
    .eq('id', columnId)
    .eq('database_id', dbId);

  if (error) throw error;
  return true;
}

export async function addRow(supabase: SupabaseClient, dbId: string, rowData: { cells?: any; position?: number } = {}) {
  const { data, error } = await supabase
    .from('db_rows')
    .insert([{ database_id: dbId, cells: rowData.cells || {}, position: rowData.position || 0 }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCell(supabase: SupabaseClient, dbId: string, rowId: string, columnId: string, value: any) {
  const { data: row, error: fetchError } = await supabase
    .from('db_rows')
    .select('cells')
    .eq('id', rowId)
    .eq('database_id', dbId)
    .single();

  if (fetchError) throw fetchError;

  const newCells = {
    ...(row.cells || {}),
    [columnId]: value,
  };

  const { data: updatedRow, error: updateError } = await supabase
    .from('db_rows')
    .update({ cells: newCells })
    .eq('id', rowId)
    .eq('database_id', dbId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedRow;
}

export async function deleteRow(supabase: SupabaseClient, dbId: string, rowId: string) {
  const { error } = await supabase
    .from('db_rows')
    .delete()
    .eq('id', rowId)
    .eq('database_id', dbId);

  if (error) throw error;
  return true;
}

export async function setView(supabase: SupabaseClient, dbId: string, viewType: string) {
  const { data, error } = await supabase
    .from('databases')
    .update({ view_type: viewType })
    .eq('id', dbId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
