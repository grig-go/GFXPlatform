/**
 * Authentication Context for Pulsar
 *
 * Provides authentication state and methods throughout the application.
 * Handles session management, user permissions, and system lock state.
 * Compatible with Nova's shared auth system for SSO.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  supabase,
  sessionReady,
  receiveAuthTokenFromUrl,
  cookieStorage,
  SHARED_AUTH_STORAGE_KEY,
  withAutoRecovery,
  startConnectionMonitor,
  stopConnectionMonitor,
} from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type {
  AuthState,
  AppUserWithPermissions,
  AppUser,
  Group,
  ChannelAccess,
  Organization,
} from '../types/permissions';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getChannelAccess: (channelId: string) => ChannelAccess | undefined;
  canWriteToChannel: (channelId: string) => boolean;
  channelAccess: ChannelAccess[];
  // Organization impersonation (superuser only)
  availableOrganizations: Organization[];
  impersonateOrganization: (org: Organization | null) => void;
  clearImpersonation: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isSuperuser: false,
    isAdmin: false,
    isPending: false,
    systemLocked: false,
    organization: null,
    impersonatedOrganization: null,
    effectiveOrganization: null,
  });

  const [channelAccess, setChannelAccess] = useState<ChannelAccess[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);

  // Track if initialization is in progress to prevent race conditions
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  // Check if system is locked (no superuser exists)
  const checkSystemLocked = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('u_users')
        .select('id')
        .eq('is_superuser', true)
        .limit(1);

      if (error) {
        console.error('Error checking system lock:', error);
        return true; // Assume locked on error
      }

      return !data || data.length === 0;
    } catch (err) {
      console.error('Error checking system lock:', err);
      return true;
    }
  }, []);

  // Fetch full user data with permissions and organization
  const fetchUserData = useCallback(async (authUserId: string): Promise<{ user: AppUserWithPermissions; organization: Organization | null } | null> => {
    try {
      console.log('[AuthContext] Fetching user data for auth_user_id:', authUserId);
      console.log('[AuthContext] Starting u_users query with organization join...');

      // Fetch user from u_users with organization (like Nova does)
      const result = await withAutoRecovery(
        (client) => client
          .from('u_users')
          .select(`
            *,
            u_organizations (*)
          `)
          .eq('auth_user_id', authUserId)
          .single(),
        10000,
        'fetchUserData'
      );
      const { data: userData, error: userError } = result as { data: any; error: any };

      console.log('[AuthContext] User data result:', { userData, userError });

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      // Extract organization from joined data (like Nova does)
      const { u_organizations: orgData, ...userFields } = userData;
      const organization = orgData as Organization | null;
      const appUser = userFields as AppUser;
      console.log('[AuthContext] Extracted organization:', organization?.name);

      // If user is superuser, they have all permissions
      if (appUser.is_superuser) {
        // Fetch all channel access for superuser (they can write to all)
        const { data: allChannels } = await supabase
          .from('channels')
          .select('id');

        const superuserChannelAccess: ChannelAccess[] = (allChannels || []).map(c => ({
          id: `su-${c.id}`,
          user_id: appUser.id,
          channel_id: c.id,
          can_write: true,
          created_at: new Date().toISOString(),
        }));

        setChannelAccess(superuserChannelAccess);

        return {
          user: {
            ...appUser,
            groups: [],
            permissions: ['*'], // Wildcard for superuser
            directPermissions: [],
          },
          organization,
        };
      }

      // Fetch user's groups
      const { data: groupMemberships, error: groupError } = await supabase
        .from('u_group_members')
        .select(`
          group_id,
          u_groups (*)
        `)
        .eq('user_id', appUser.id);

      if (groupError) {
        console.error('Error fetching group memberships:', groupError);
      }

      const groups: Group[] = groupMemberships
        ?.map((m: any) => m.u_groups)
        .filter(Boolean) || [];

      // Fetch permissions from groups
      const groupIds = groups.map(g => g.id);
      let groupPermissions: string[] = [];

      // Helper to construct permission key from database fields
      const getPermKey = (p: any): string | null => {
        if (!p?.u_permissions) return null;
        const perm = p.u_permissions;
        return `${perm.app_key}.${perm.resource}.${perm.action}`;
      };

      if (groupIds.length > 0) {
        const { data: groupPermsData, error: groupPermsError } = await supabase
          .from('u_group_permissions')
          .select(`
            permission_id,
            u_permissions (app_key, resource, action)
          `)
          .in('group_id', groupIds);

        if (groupPermsError) {
          console.error('Error fetching group permissions:', groupPermsError);
        }

        groupPermissions = (groupPermsData
          ?.map((p: any) => getPermKey(p))
          .filter((p): p is string => p !== null) || []);
      }

      // Fetch direct user permissions
      const { data: directPermsData, error: directPermsError } = await supabase
        .from('u_user_permissions')
        .select(`
          permission_id,
          u_permissions (app_key, resource, action)
        `)
        .eq('user_id', appUser.id);

      if (directPermsError) {
        console.error('Error fetching direct permissions:', directPermsError);
      }

      const directPermissions = (directPermsData
        ?.map((p: any) => getPermKey(p))
        .filter((p): p is string => p !== null) || []);

      // Combine and deduplicate permissions
      const allPermissions = [...new Set([...groupPermissions, ...directPermissions])] as string[];

      // Fetch channel access for Pulsar
      const { data: channelAccessData, error: channelAccessError } = await supabase
        .from('u_channel_access')
        .select('*')
        .eq('user_id', appUser.id);

      if (channelAccessError) {
        console.error('Error fetching channel access:', channelAccessError);
      }

      setChannelAccess(channelAccessData || []);

      return {
        user: {
          ...appUser,
          groups,
          permissions: allPermissions,
          directPermissions,
        },
        organization,
      };
    } catch (err) {
      console.error('Error in fetchUserData:', err);
      return null;
    }
  }, []);

  // Handle session change
  const handleSessionChange = useCallback(async (session: Session | null, isInitialLoad = false) => {
    console.log('[AuthContext] handleSessionChange called with session:', session ? 'exists' : 'null', 'isInitialLoad:', isInitialLoad);

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
        isPending: false,
      }));
      setChannelAccess([]);
      return;
    }

    console.log('[AuthContext] Session user id:', session.user?.id);
    const result = await fetchUserData(session.user.id);
    console.log('[AuthContext] fetchUserData returned:', result ? 'user found' : 'null');

    if (!result) {
      // Only clear auth state on initial load or if we've never been authenticated
      // Don't kick user out if fetchUserData fails during a token refresh
      setState(prev => {
        if (isInitialLoad || !prev.isAuthenticated) {
          console.log('[AuthContext] Clearing auth state - initial load or not authenticated');
          return {
            ...prev,
            user: null,
            organization: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isSuperuser: false,
            isAdmin: false,
            isPending: false,
          };
        }
        // Keep existing auth state if we were already authenticated
        console.log('[AuthContext] Keeping existing auth state - fetchUserData failed but already authenticated');
        return { ...prev, isLoading: false };
      });
      return;
    }

    const { user: userData, organization } = result;

    // Check if user is admin (has manage_users permission or is in Administrators group)
    const isAdmin = userData.is_superuser ||
      userData.permissions.includes('system.manage_users') ||
      userData.groups.some(g => g.name === 'Administrators');

    // For superusers, fetch all available organizations for impersonation
    if (userData.is_superuser) {
      try {
        const { data: allOrgs, error: orgsError } = await supabase
          .from('u_organizations')
          .select('*')
          .order('name');

        if (orgsError) {
          console.error('Error fetching organizations for superuser:', orgsError);
        } else {
          console.log('[AuthContext] Fetched organizations for superuser:', allOrgs?.length || 0);
          setAvailableOrganizations(allOrgs || []);
        }
      } catch (err) {
        console.error('Error fetching organizations for superuser:', err);
      }
    }

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
      isAdmin,
      isPending: userData.status === 'pending',
      effectiveOrganization: prev.impersonatedOrganization || organization,
    }));
  }, [fetchUserData]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('[AuthContext] Starting initialization...');
      initializingRef.current = true;

      try {
        // Check for auth token in URL (from cross-app SSO)
        // This must happen BEFORE sessionReady to store the token first
        const receivedToken = receiveAuthTokenFromUrl();
        if (receivedToken) {
          console.log('[AuthContext] Received auth token from URL (cross-app SSO)');
        }

        // Wait for session to be properly initialized from cookie storage
        console.log('[AuthContext] Waiting for session restoration from cookie storage...');
        await sessionReady;
        console.log('[AuthContext] Session restoration complete');

        // Check system lock state
        console.log('[AuthContext] Checking system lock...');
        const isLocked = await checkSystemLocked();
        console.log('[AuthContext] System locked:', isLocked);

        if (!mounted) return;

        setState(prev => ({ ...prev, systemLocked: isLocked }));

        // Get current session
        console.log('[AuthContext] Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] Session result:', { hasSession: !!session, error });

        if (error) {
          console.error('[AuthContext] Error getting session:', error);
        }

        if (!mounted) return;

        if (session) {
          console.log('[AuthContext] Processing session for user:', session.user.email);
          await handleSessionChange(session, true); // isInitialLoad = true
          console.log('[AuthContext] Session change handled');
        } else {
          console.log('[AuthContext] No session, setting isLoading to false');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error('[AuthContext] Error during auth initialization:', err);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }

      console.log('[AuthContext] Initialization complete');
      initializingRef.current = false;
      initializedRef.current = true;
    };

    initialize();

    // Start connection health monitor to detect and recover from stuck connections
    startConnectionMonitor();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[AuthContext] Auth state change:', event, '| initializing:', initializingRef.current, '| initialized:', initializedRef.current);

        // Skip INITIAL_SESSION and SIGNED_IN during initialization - we handle it in initialize()
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !initializedRef.current) {
          console.log('[AuthContext] Skipping auth event during initialization');
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] SIGNED_OUT - clearing auth state');
          setState(prev => ({
            ...prev,
            user: null,
            organization: null,
            session: null,
            isAuthenticated: false,
            isSuperuser: false,
            isAdmin: false,
            isPending: false,
          }));
          setChannelAccess([]);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // TOKEN_REFRESHED: Only update session tokens, don't re-fetch user data
          console.log('[AuthContext] Token refreshed, updating session tokens only');
          setState(prev => ({
            ...prev,
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at || 0,
            },
          }));
        } else if (event === 'SIGNED_IN' && session && initializedRef.current) {
          // SIGNED_IN after initialization: Check if this is a session recovery or new login
          let shouldRefetch = false;

          setState(prev => {
            const currentUserId = prev.user?.auth_user_id;
            const newUserId = session.user.id;

            if (currentUserId && currentUserId === newUserId) {
              // Same user - just update session tokens
              console.log('[AuthContext] SIGNED_IN for same user, updating session tokens only');
              return {
                ...prev,
                session: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
              };
            }
            // Different user or no previous user - need full refresh
            shouldRefetch = true;
            return prev;
          });

          if (shouldRefetch) {
            console.log('[AuthContext] SIGNED_IN with different/new user, fetching user data');
            await handleSessionChange(session, true);
          }
        } else if (session && initializedRef.current) {
          // Other events (USER_UPDATED, etc.): Full user data refresh
          console.log('[AuthContext] Processing auth state change for session, event:', event);
          await handleSessionChange(session, false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      stopConnectionMonitor();
    };
  }, [checkSystemLocked, handleSessionChange]);

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

      // Session change will be handled by the auth listener
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    // Clear React state immediately
    setState(prev => ({
      ...prev,
      user: null,
      organization: null,
      impersonatedOrganization: null,
      effectiveOrganization: null,
      session: null,
      isAuthenticated: false,
      isSuperuser: false,
      isAdmin: false,
      isPending: false,
    }));
    setChannelAccess([]);
    setAvailableOrganizations([]);
    sessionStorage.removeItem('pulsar_impersonated_org');

    // Clear the shared auth cookie (already imported at top of file)
    cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);

    // Also clear any legacy localStorage keys for backwards compatibility
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Call official signOut to clear server-side session
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors - storage is already cleared
    }
  }, []);

  // Refresh user data (e.g., after permission changes)
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleSessionChange(session);
    }
  }, [handleSessionChange]);

  // Get channel access for a specific channel
  const getChannelAccess = useCallback((channelId: string): ChannelAccess | undefined => {
    return channelAccess.find(ca => ca.channel_id === channelId);
  }, [channelAccess]);

  // Check if user can write to a specific channel
  const canWriteToChannel = useCallback((channelId: string): boolean => {
    // Superusers can write to all channels
    if (state.isSuperuser) return true;

    // Pending users cannot write
    if (state.isPending) return false;

    // Check channel-specific access
    const access = channelAccess.find(ca => ca.channel_id === channelId);
    return access?.can_write ?? false;
  }, [state.isSuperuser, state.isPending, channelAccess]);

  // Impersonate an organization (superuser only)
  const impersonateOrganization = useCallback((org: Organization | null) => {
    if (!state.isSuperuser) {
      console.warn('Only superusers can impersonate organizations');
      return;
    }

    setState(prev => ({
      ...prev,
      impersonatedOrganization: org,
      effectiveOrganization: org || prev.organization,
    }));

    // Store impersonation in sessionStorage so it persists across page refreshes
    if (org) {
      sessionStorage.setItem('pulsar_impersonated_org', JSON.stringify(org));
    } else {
      sessionStorage.removeItem('pulsar_impersonated_org');
    }
  }, [state.isSuperuser]);

  // Clear impersonation
  const clearImpersonation = useCallback(() => {
    setState(prev => ({
      ...prev,
      impersonatedOrganization: null,
      effectiveOrganization: prev.organization,
    }));
    sessionStorage.removeItem('pulsar_impersonated_org');
  }, []);

  // Restore impersonation from sessionStorage on mount
  useEffect(() => {
    if (state.isSuperuser && state.isAuthenticated) {
      const stored = sessionStorage.getItem('pulsar_impersonated_org');
      if (stored) {
        try {
          const org = JSON.parse(stored) as Organization;
          setState(prev => ({
            ...prev,
            impersonatedOrganization: org,
            effectiveOrganization: org,
          }));
        } catch {
          sessionStorage.removeItem('pulsar_impersonated_org');
        }
      }
    }
  }, [state.isSuperuser, state.isAuthenticated]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshUser,
    getChannelAccess,
    canWriteToChannel,
    channelAccess,
    availableOrganizations,
    impersonateOrganization,
    clearImpersonation,
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

// Export context for testing
export { AuthContext };
