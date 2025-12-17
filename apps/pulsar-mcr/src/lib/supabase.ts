import { createClient } from '@supabase/supabase-js';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY, migrateLocalStorageToCookie } from './cookieStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    detectSessionInUrl: true,
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
const ensureSessionInitialized = async () => {
  // First check if Supabase already has a session
  const { data: { session: existingSession } } = await supabaseClient.auth.getSession();

  if (existingSession) {
    return;
  }

  // If no session but cookie exists, manually set it
  const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  if (storedSession) {
    try {
      const sessionData = JSON.parse(storedSession);
      if (sessionData.access_token && sessionData.refresh_token) {
        await supabaseClient.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
      }
    } catch (e) {
      console.error('[Supabase] Error restoring session from cookie:', e);
    }
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
