import { createClient } from '@supabase/supabase-js';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY } from '../../lib/cookieStorage';

// Supabase URL and public anon key (app-specific with fallback)
const supabaseUrl = import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_PULSAR_MCR_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check your .env file');
}

// Create a single supabase client for interacting with your database
const options = {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce' as const,
    storage: cookieStorage,
    storageKey: SHARED_AUTH_STORAGE_KEY
  },
  global: {
    headers: { 'x-application-name': 'template-manager' },
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, options);

/**
 * Ensure session is properly initialized from cookie storage
 */
const ensureSessionInitialized = async (): Promise<void> => {
  try {
    // First check if Supabase already has a session
    const { data: { session: existingSession } } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session init timeout')), 5000)
      )
    ]);

    if (existingSession) {
      console.log('[Supabase] Session already initialized');
      return;
    }

    // If no session but cookie exists, manually set it
    const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        console.log('[Supabase] Found stored session data, keys:', Object.keys(sessionData));

        const accessToken = sessionData.access_token;
        const refreshToken = sessionData.refresh_token;

        if (accessToken && refreshToken) {
          console.log('[Supabase] Restoring session from cookie storage');
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      } catch (e) {
        console.error('[Supabase] Error restoring session from cookie:', e);
      }
    } else {
      console.log('[Supabase] No stored session cookie found');
    }
  } catch (error) {
    console.warn('[Supabase] Session initialization timed out');
  }
};

/**
 * Promise that resolves when session is ready
 */
export const sessionReady = ensureSessionInitialized();

// Helper function to handle Supabase errors gracefully
export const handleSupabaseError = (error: any, defaultMessage = 'An unexpected error occurred') => {
  console.error('Supabase error:', error);
  
  // Extract the most useful error message
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error_description) {
    return error.error_description;
  }
  
  if (error?.details) {
    return typeof error.details === 'string' 
      ? error.details 
      : JSON.stringify(error.details);
  }
  
  return defaultMessage;
};

// Function to check if error is a "not found" error
export const isNotFoundError = (error: any) => {
  return error?.code === 'PGRST116' || // No rows returned
         error?.code === '404' || 
         error?.message?.includes('not found');
};

// Simple query builder helper
export const buildSupabaseQuery = (
  query: any,
  filters: Record<string, any> = {},
  options: {
    limit?: number,
    offset?: number,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  } = {}
) => {
  let filteredQuery = query;
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        filteredQuery = filteredQuery.in(key, value);
      } else if (typeof value === 'string' && value.includes('*')) {
        // Handle wildcard searches
        const searchTerm = value.replace(/\*/g, '%');
        filteredQuery = filteredQuery.ilike(key, searchTerm);
      } else {
        filteredQuery = filteredQuery.eq(key, value);
      }
    }
  });
  
  // Apply pagination and sorting
  if (options.orderBy) {
    filteredQuery = filteredQuery.order(
      options.orderBy, 
      { ascending: options.orderDirection !== 'desc' }
    );
  }
  
  if (options.limit) {
    filteredQuery = filteredQuery.limit(options.limit);
  }
  
  if (options.offset) {
    filteredQuery = filteredQuery.offset(options.offset);
  }
  
  return filteredQuery;
};

export default supabase;