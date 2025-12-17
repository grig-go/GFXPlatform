import { createClient } from "@supabase/supabase-js";

// Pulsar Hub uses the same Supabase project as Nexus
const supabaseUrl = import.meta.env.VITE_PULSAR_HUB_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_PULSAR_HUB_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables (VITE_PULSAR_HUB_SUPABASE_URL or VITE_SUPABASE_URL). Check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export URL and key for edge function calls
export { supabaseUrl, supabaseAnonKey as publicAnonKey };
