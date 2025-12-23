/**
 * Authentication Context for Pulsar-VS
 *
 * Provides authentication state and methods throughout the application.
 * Uses shared @emergent-platform/supabase-client for SSO across all apps.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  supabase,
  sessionReady,
  startConnectionMonitor,
  stopConnectionMonitor,
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  receiveAuthTokenFromUrl,
} from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { AuthState, AppUser, Organization } from '../types/auth';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isSuperuser: false,
    isAdmin: false,
    isOrgAdmin: false,
  });

  // Track if initialization is in progress
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  // Fetch user data with organization
  const fetchUserData = useCallback(async (authUserId: string): Promise<{ user: AppUser; organization: Organization } | null> => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('u_users')
        .select(`
          *,
          u_organizations (*)
        `)
        .eq('auth_user_id', authUserId)
        .single();

      if (userError || !userData) {
        console.error('[Auth] Error fetching user data:', userError);
        return null;
      }

      // Extract organization from joined data
      const { u_organizations: orgData, ...userFields } = userData as any;
      const organization = orgData as Organization;
      const appUser = userFields as AppUser;

      return { user: appUser, organization };
    } catch (err) {
      console.error('[Auth] Error in fetchUserData:', err);
      return null;
    }
  }, []);

  // Handle session change
  const handleSessionChange = useCallback(async (session: Session | null) => {
    if (!session) {
      setState(prev => ({
        ...prev,
        user: null,
        organization: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isSuperuser: false,
        isAdmin: false,
        isOrgAdmin: false,
      }));
      return;
    }

    const result = await fetchUserData(session.user.id);

    if (!result) {
      setState(prev => ({
        ...prev,
        user: null,
        organization: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isSuperuser: false,
        isAdmin: false,
        isOrgAdmin: false,
      }));
      return;
    }

    const { user: userData, organization } = result;
    const isOrgAdmin = userData.org_role === 'owner' || userData.org_role === 'admin';

    setState(prev => ({
      ...prev,
      user: userData,
      organization,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
      },
      isLoading: false,
      isAuthenticated: true,
      isSuperuser: userData.is_superuser,
      isAdmin: userData.is_superuser || isOrgAdmin,
      isOrgAdmin,
    }));
  }, [fetchUserData]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      initializingRef.current = true;
      try {
        // Check for auth token in URL (from cross-app SSO)
        const receivedToken = receiveAuthTokenFromUrl();
        if (receivedToken) {
          console.log('[Auth] Received auth token from URL (cross-app SSO)');
        }

        // Wait for session to be restored from cookie storage
        await sessionReady;

        if (!mounted) return;

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        if (!mounted) return;

        if (session) {
          await handleSessionChange(session);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error('[Auth] Error during auth initialization:', err);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
      initializingRef.current = false;
      initializedRef.current = true;
    };

    initialize();
    startConnectionMonitor();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Skip during initialization
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !initializedRef.current) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          setState(prev => ({
            ...prev,
            user: null,
            organization: null,
            session: null,
            isAuthenticated: false,
            isSuperuser: false,
            isAdmin: false,
            isOrgAdmin: false,
          }));
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setState(prev => ({
            ...prev,
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at || 0,
            },
          }));
        } else if (event === 'SIGNED_IN' && session && initializedRef.current) {
          let shouldRefetch = false;
          setState(prev => {
            const currentUserId = prev.user?.auth_user_id;
            const newUserId = session.user.id;

            if (currentUserId && currentUserId === newUserId) {
              return {
                ...prev,
                session: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
              };
            }
            shouldRefetch = true;
            return prev;
          });

          if (shouldRefetch) {
            await handleSessionChange(session);
          }
        } else if (session && initializedRef.current) {
          await handleSessionChange(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopConnectionMonitor();
    };
  }, [handleSessionChange]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({
      ...prev,
      user: null,
      organization: null,
      session: null,
      isAuthenticated: false,
      isSuperuser: false,
      isAdmin: false,
      isOrgAdmin: false,
    }));

    // Clear the shared auth cookie
    cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);

    // Clear legacy localStorage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors - storage is already cleared
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleSessionChange(session);
    }
  }, [handleSessionChange]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
