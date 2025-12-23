// Supabase credentials for PulsarVS (Emergent Nova Dev project)
// Loaded from environment variables - try Pulsar-specific first, then fallback to shared
export const supabaseUrl = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_PULSAR_VS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
