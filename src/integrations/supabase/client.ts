import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Generic database crud service
 */
export const db = {}
export const from = (tableName: string) => {
  return supabaseClient.from(tableName);
}

export type DatabaseActions = typeof from;
export const from = db.from = (tableName: string) => ({
  select: (columns: string) => {
    const result = supabaseClient.from(tableName).select(columns);
    return {
      select: result.select.bind(result),
      from: result.from.bind(result),
      insert: result.insert.bind(result),
      update: result.update.bind(result)
    }
  },
  // Other methods...
})

// Example type-safe query builder
export const getSupabaseQuery = <T>(query: string): T => {
  const { data, error } = supabaseClient.rpc(query);
  if (error) throw error;
  return data;
}