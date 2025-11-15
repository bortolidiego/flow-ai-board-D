import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-my-custom-header': 'my-app-name',
    },
  },
})

// Extend the Supabase database types to include evolution_integrations
declare module '@supabase/supabase-js' {
  interface Database {
    public: {
      Tables: {
        evolution_integrations: {
          Row: {
            id: string
            pipeline_id: string
            instance_name: string
            instance_alias: string | null
            webhook_url: string
            api_url: string
            api_key: string
            phone_number: string | null
            status: string
            last_connection: string | null
            events_enabled: string[] | null
            auto_create_cards: boolean
            analyze_messages: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            pipeline_id: string
            instance_name: string
            instance_alias?: string | null
            webhook_url: string
            api_url: string
            api_key: string
            phone_number?: string | null
            status?: string
            last_connection?: string | null
            events_enabled?: string[] | null
            auto_create_cards?: boolean
            analyze_messages?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            pipeline_id?: string
            instance_name?: string
            instance_alias?: string | null
            webhook_url?: string
            api_url?: string
            api_key?: string
            phone_number?: string | null
            status?: string
            last_connection?: string | null
            events_enabled?: string[] | null
            auto_create_cards?: boolean
            analyze_messages?: boolean
            created_at?: string
            updated_at?: string
          }
        }
      }
    }
  }
}