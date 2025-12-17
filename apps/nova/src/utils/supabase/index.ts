/**
 * Central export for all Supabase utilities
 * 
 * Import from this file to access Supabase client and configuration helpers
 */

// Supabase client
export { supabase, getSupabaseClient } from './client';

// Configuration helpers (with environment variable support)
export {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getProjectId,
  getEdgeFunctionUrl,
  getRestUrl,
  getSupabaseHeaders,
} from './config';

