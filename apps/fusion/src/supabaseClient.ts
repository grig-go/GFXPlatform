import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const publicAnonKey = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl,
      publicAnonKey,
      { auth: { persistSession: true, detectSessionInUrl: true } }
    );
  }
  return supabaseInstance;
})();