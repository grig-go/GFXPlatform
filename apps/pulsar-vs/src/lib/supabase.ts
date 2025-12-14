import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../src/supabaseConfig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});