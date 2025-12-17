// Supabase project info - loaded from environment variables
const url = import.meta.env.VITE_SUPABASE_URL || '';
export const projectId = url.replace('https://', '').replace('http://', '').replace('.supabase.co', '').split(':')[0];
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
