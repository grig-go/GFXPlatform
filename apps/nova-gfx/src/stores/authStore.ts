import { create } from 'zustand';
import { supabase, isSupabaseConfigured, setJwtExpiredHandler, resetJwtExpiredTrigger, receiveAuthTokenFromUrl, sessionReady } from '@/lib/supabase';
import { initializeAIModelsFromBackend } from '@/lib/ai';

// Default dev organization ID - used when user has no organization_id
// This matches the dev organization in the database
const DEV_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

// Types matching current u_users table schema
export interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: 'active' | 'pending' | 'inactive';
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  // Organization fields - will be populated from u_users once org columns are added
  // For now, we use a default dev organization
  organization_id?: string;
}

// Organization type
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  allowed_domains: string[];
  created_at: string;
  updated_at: string;
}

// Helper to get the user's organization ID with fallback to dev org
export const getOrganizationId = (user: AppUser | null): string | null => {
  if (!user) return null;
  return user.organization_id || DEV_ORGANIZATION_ID;
};

interface AuthState {
  // State
  user: AppUser | null;
  organization: Organization | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateOrganizationSettings: (settings: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
}

// Check if we're in dev mode
export const isDevMode = (): boolean => {
  const devModeEnv = import.meta.env.VITE_DEV_MODE;
  if (devModeEnv === 'false' || devModeEnv === false) {
    return false;
  }
  return import.meta.env.DEV || window.location.hostname === 'localhost';
};

// Helper to check if email is from emergent.new domain
export const isEmergentEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@emergent.new');
};

// Helper to fetch organization data
async function fetchOrganization(organizationId: string): Promise<Organization | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('u_organizations')
    .select('id, name, slug, settings, allowed_domains, created_at, updated_at')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    console.warn('[Auth] Could not fetch organization:', error?.message);
    return null;
  }

  console.log('[Auth] Fetched organization settings:', {
    orgId: data.id,
    orgName: data.name,
    settings: data.settings,
    hasAiModel: !!data.settings?.ai_model,
  });

  return data as Organization;
}

// Create store WITHOUT persist - Supabase SDK handles cookie storage for SSO
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  organization: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    // If already initialized, just return
    if (get().isInitialized) {
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      set({ isInitialized: true, isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      // Check for auth token in URL (from cross-app SSO)
      // This must happen BEFORE checking session to store the token first
      const receivedToken = receiveAuthTokenFromUrl();
      if (receivedToken) {
        console.log('[Auth] Received auth token from URL (cross-app SSO)');
      }

      // Wait for session to be restored from cookie storage before proceeding
      console.log('[Auth] Waiting for session restoration from cookie storage...');
      await sessionReady;
      console.log('[Auth] Session restoration complete');

      // Use Supabase SDK to get session - it reads from cookie storage automatically
      // This enables SSO because all apps share the same cookie
      console.log('[Auth] Checking for existing session via Supabase SDK...');

      // Try to get session with a generous timeout (15s) - token refresh can be slow
      let session = null;
      let sessionError = null;

      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }, error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Session check timed out after 15s')), 15000)
          )
        ]);
        session = result.data?.session;
        sessionError = result.error;
      } catch (err: any) {
        console.warn('[Auth] Session check error:', err.message);
        sessionError = err;

        // On timeout, try one more time with a direct call (no timeout)
        // This handles cases where the network is just slow
        console.log('[Auth] Retrying session check without timeout...');
        try {
          const retryResult = await supabase.auth.getSession();
          session = retryResult.data?.session;
          sessionError = retryResult.error;
          if (session) {
            console.log('[Auth] Retry successful - found session');
          }
        } catch (retryErr) {
          console.warn('[Auth] Retry also failed:', retryErr);
        }
      }

      if (sessionError && !session) {
        console.warn('[Auth] Session check failed:', sessionError.message || sessionError);
      }

      if (session?.access_token && session?.user?.id) {
        console.log('[Auth] Found valid session for:', session.user.email);

        // Fetch user data from u_users table - simple query matching current schema
        const { data: userData, error: userError } = await supabase
          .from('u_users')
          .select('id, auth_user_id, email, full_name, avatar_url, status, is_superuser, created_at, updated_at, last_login, organization_id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (userData && !userError) {
          const orgId = userData.organization_id || DEV_ORGANIZATION_ID;
          const organization = await fetchOrganization(orgId);

          set({
            accessToken: session.access_token,
            user: userData as AppUser,
            organization,
          });
          console.log('[Auth] User data loaded successfully:', userData.email);
          if (organization) {
            console.log('[Auth] Organization loaded:', organization.name);
            // Initialize AI models from backend providers
            initializeAIModelsFromBackend().catch(err => {
              console.warn('[Auth] Failed to initialize AI models:', err);
            });
          }
        } else {
          console.warn('[Auth] Could not fetch user data:', userError?.message);
          // Still set the access token so API calls can work
          set({ accessToken: session.access_token });
        }
      } else {
        console.log('[Auth] No existing session found');
      }
    } catch (err) {
      console.error('[Auth] Initialization error:', err);
      // Don't set error - allow app to function
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // Subscribe to auth state changes for token refresh
    if (supabase) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] Auth state change:', event);

        if (event === 'SIGNED_OUT') {
          set({ user: null, organization: null, accessToken: null, error: null });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('[Auth] Token refreshed successfully');
          set({ accessToken: session.access_token });
        } else if (event === 'SIGNED_IN' && session) {
          // Update access token
          set({ accessToken: session.access_token });

          // Refresh user data
          const { data: userData } = await supabase
            .from('u_users')
            .select('id, auth_user_id, email, full_name, avatar_url, status, is_superuser, created_at, updated_at, last_login, organization_id')
            .eq('auth_user_id', session.user.id)
            .single();

          if (userData) {
            const orgId = userData.organization_id || DEV_ORGANIZATION_ID;
            const organization = await fetchOrganization(orgId);
            set({ user: userData as AppUser, organization });
            // Initialize AI models from backend providers
            if (organization) {
              initializeAIModelsFromBackend().catch(err => {
                console.warn('[Auth] Failed to initialize AI models:', err);
              });
            }
          }
        }
      });

      // Handle visibility change - refresh session when user comes back to the app
      // This prevents stale connections after long idle periods
      let lastVisibilityCheck = Date.now();
      const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
          const timeSinceLastCheck = Date.now() - lastVisibilityCheck;

          // Only refresh if we've been away for more than 5 minutes
          if (timeSinceLastCheck > REFRESH_THRESHOLD) {
            console.log(`[Auth] App became visible after ${Math.round(timeSinceLastCheck / 1000)}s, refreshing session...`);

            try {
              // This will trigger TOKEN_REFRESHED if the token was refreshed
              const { data, error } = await supabase.auth.getSession();

              if (error) {
                console.warn('[Auth] Session refresh failed:', error.message);
              } else if (data.session) {
                console.log('[Auth] Session still valid');
                set({ accessToken: data.session.access_token });
              } else {
                console.log('[Auth] No session found after visibility change');
                set({ user: null, organization: null, accessToken: null });
              }
            } catch (err) {
              console.warn('[Auth] Error refreshing session on visibility change:', err);
            }
          }

          lastVisibilityCheck = Date.now();
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      // Set up JWT expiration handler for automatic logout
      // This triggers when any API call returns 401 with "JWT expired"
      setJwtExpiredHandler(() => {
        console.log('[Auth] JWT expired - automatically signing out user');
        get().signOut();
      });
    }
  },

  signIn: async (email, password) => {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    set({ isLoading: true, error: null });

    try {
      // Sign in via Supabase SDK - this automatically stores the session in cookie storage
      console.log('[Auth] Signing in via Supabase SDK...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('[Auth] Sign in error:', authError.message);
        set({ error: authError.message, isLoading: false });
        return { success: false, error: authError.message };
      }

      const session = authData.session;
      const authUser = authData.user;

      if (!session?.access_token || !authUser?.id) {
        set({ error: 'Invalid response from auth server', isLoading: false });
        return { success: false, error: 'Invalid response from auth server' };
      }

      console.log('[Auth] Signed in successfully, fetching user data...');

      // Reset the JWT expired trigger so it can fire again if needed
      resetJwtExpiredTrigger();

      // Store access token
      set({ accessToken: session.access_token });

      // Fetch user data from u_users table - include organization_id
      const { data: userData, error: userError } = await supabase
        .from('u_users')
        .select('id, auth_user_id, email, full_name, avatar_url, status, is_superuser, created_at, updated_at, last_login, organization_id')
        .eq('auth_user_id', authUser.id)
        .single();

      if (userData && !userError) {
        const orgId = userData.organization_id || DEV_ORGANIZATION_ID;
        const organization = await fetchOrganization(orgId);

        set({
          user: userData as AppUser,
          organization,
          isLoading: false,
        });
        console.log('[Auth] User data loaded successfully:', userData.email);
        if (organization) {
          console.log('[Auth] Organization loaded:', organization.name);
          // Initialize AI models from backend providers
          initializeAIModelsFromBackend().catch(err => {
            console.warn('[Auth] Failed to initialize AI models:', err);
          });
        }
      } else {
        console.warn('[Auth] Could not fetch user data:', userError?.message);
        set({ isLoading: false });
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      console.error('[Auth] Sign in error:', message);
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  signOut: async () => {
    // Clear state first for immediate UI response
    set({ user: null, organization: null, accessToken: null, error: null });

    // Clear legacy localStorage keys
    try {
      localStorage.removeItem('emergent-auth');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }

    // Sign out via Supabase SDK - this automatically clears the cookie storage
    if (supabase) {
      console.log('[Auth] Signing out via Supabase SDK...');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn('[Auth] Sign out error:', err);
      }
    }
  },

  clearError: () => set({ error: null }),

  updateOrganizationSettings: async (settings: Record<string, any>) => {
    const { organization, accessToken } = get();

    console.log('[Auth] updateOrganizationSettings called:', { settings, hasOrganization: !!organization });

    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    if (!organization) {
      console.warn('[Auth] No organization loaded - cannot update settings');
      return { success: false, error: 'No organization loaded' };
    }

    try {
      // Merge new settings with existing settings
      const updatedSettings = {
        ...(organization.settings || {}),
        ...settings,
      };

      console.log('[Auth] Updating organization settings:', { orgId: organization.id, updatedSettings });

      const { error } = await supabase
        .from('u_organizations')
        .update({ settings: updatedSettings })
        .eq('id', organization.id);

      if (error) {
        console.error('[Auth] Failed to update organization settings:', error.message);
        return { success: false, error: error.message };
      }

      // Update local state
      set({
        organization: {
          ...organization,
          settings: updatedSettings,
        },
      });

      console.log('[Auth] Organization settings updated successfully:', updatedSettings);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      console.error('[Auth] Failed to update organization settings:', message);
      return { success: false, error: message };
    }
  },
}));
