import { createClient } from "@supabase/supabase-js";

// Pulsar Hub uses the same Supabase project as Nexus
const supabaseUrl = import.meta.env.VITE_PULSAR_HUB_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PULSAR_HUB_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables (VITE_PULSAR_HUB_SUPABASE_URL, VITE_PULSAR_HUB_SUPABASE_ANON_KEY). Check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export project info for edge function calls
export const projectId = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
export const publicAnonKey = supabaseAnonKey;
