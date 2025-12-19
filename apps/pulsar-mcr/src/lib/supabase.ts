import { createClient } from '@supabase/supabase-js';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY, migrateLocalStorageToCookie } from './cookieStorage';

const supabaseUrl = import.meta.env.VITE_PULSAR_MCR_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PULSAR_MCR_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Migrate any existing localStorage sessions to cookie storage
// This ensures users don't get logged out during the transition
migrateLocalStorageToCookie([
  'sb-auth-token', // Old Pulsar key
  `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`, // Default Supabase key
]);

// Create the base client with cookie storage for cross-app session sharing
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: cookieStorage,
    storageKey: SHARED_AUTH_STORAGE_KEY
  }
});

// Store the original from method
const originalFrom = supabaseClient.from.bind(supabaseClient);

// Helper to refresh session if needed (must be declared before enhancedFrom uses it)
export const refreshSessionIfNeeded = async () => {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  
  if (!session) {
    console.warn('No active session found');
    return null;
  }

  // Check if session is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : new Date(0);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  
  if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
    console.log('Session expiring soon, refreshing...');
    const { data: { session: refreshedSession }, error: refreshError } = await supabaseClient.auth.refreshSession();
    
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      return null;
    }
    
    return refreshedSession;
  }
  
  return session;
};

// Enhanced from method - just returns the original, session refresh is handled by Supabase
const enhancedFrom = (table: string) => {
  // Return the original query builder - Supabase handles token refresh automatically
  return originalFrom(table);
};

// Override the from method to add auth checking for RLS tables
supabaseClient.from = enhancedFrom;

// Session monitoring and auto-refresh
let sessionMonitorInterval: NodeJS.Timeout | null = null;

export const startSessionMonitor = () => {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval);
  }
  
  // Check session every 4 minutes (sessions typically last 1 hour)
  sessionMonitorInterval = setInterval(async () => {
    try {
      await refreshSessionIfNeeded();
    } catch (error) {
      console.warn('Session monitor error:', error);
    }
  }, 4 * 60 * 1000); // 4 minutes
};

export const stopSessionMonitor = () => {
  if (sessionMonitorInterval) {
    clearInterval(sessionMonitorInterval);
    sessionMonitorInterval = null;
  }
};

// Listen for auth state changes - only for session monitor management
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    startSessionMonitor();
  } else if (event === 'SIGNED_OUT') {
    stopSessionMonitor();
  }
});

// Ensure session is properly initialized from cookie storage
// This fixes issues where Supabase reads the cookie but doesn't set the auth headers
// IMPORTANT: We check the cookie FIRST before calling any Supabase auth methods,
// because getSession() can hang if the internal auth lock is stuck.
const ensureSessionInitialized = async () => {
  // First, check if there's a session in cookie storage
  const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);

  if (storedSession) {
    try {
      const sessionData = JSON.parse(storedSession);
      console.log('[Supabase] Found stored session data, keys:', Object.keys(sessionData));

      const accessToken = sessionData.access_token;
      const refreshToken = sessionData.refresh_token;

      if (accessToken && refreshToken) {
        console.log('[Supabase] Restoring session from cookie storage');
        try {
          await Promise.race([
            supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('setSession timeout')), 5000)
            )
          ]);
          console.log('[Supabase] Session restored successfully');
        } catch (e) {
          console.warn('[Supabase] setSession timed out or failed:', e);
          // Clear the potentially corrupted cookie
          cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
        }
      } else {
        console.warn('[Supabase] Cookie exists but missing tokens:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
        // Clear invalid cookie
        cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('[Supabase] Error parsing session from cookie:', e);
      // Clear corrupted cookie
      cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
    }
  } else {
    console.log('[Supabase] No stored session cookie found');
  }
};

// Export a promise that resolves when session is ready
export const sessionReady = ensureSessionInitialized();

// Export both the enhanced client and the original if needed
export const supabase = supabaseClient;
export const supabaseAdmin = originalFrom; // Use this if you need to bypass the check

// Helper to check current auth status
export const checkAuthStatus = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    isAuthenticated: !!session,
    user: session?.user || null,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
  };
};

// Helper to ensure auth before operation
export const ensureAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
};
