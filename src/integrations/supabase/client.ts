import { createClient } from '@supabase/supabase-js';

// TODO: Gere seus tipos Supabase e substitua 'any' por 'Database'
// npx supabase gen types typescript --project-id "dqnzwlumxbbissehrumv" --schema public > src/types/supabase.ts
// Em seguida, importe e use: import { Database } from '@/types/supabase';
// export const supabase = createClient<Database>(
export const supabase = createClient<any>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);