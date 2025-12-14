// Supabase project info - loaded from environment variables
const url = import.meta.env.VITE_PULSAR_VS_SUPABASE_URL || '';
export const projectId = url.replace('https://', '').replace('.supabase.co', '');
export const publicAnonKey = import.meta.env.VITE_PULSAR_VS_SUPABASE_ANON_KEY || '';
