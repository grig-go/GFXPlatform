/**
 * Authentication Context for Pulsar
 *
 * Provides authentication state and methods throughout the application.
 * Handles session management, user permissions, and system lock state.
 * Compatible with Nova's shared auth system for SSO.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, sessionReady } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type {
  AuthState,
  AppUserWithPermissions,
  AppUser,
  Group,
  ChannelAccess,
} from '../types/permissions';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getChannelAccess: (channelId: string) => ChannelAccess | undefined;
  canWriteToChannel: (channelId: string) => boolean;
  channelAccess: ChannelAccess[];
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
  });

  const [channelAccess, setChannelAccess] = useState<ChannelAccess[]>([]);

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

  // Fetch full user data with permissions
  const fetchUserData = useCallback(async (authUserId: string): Promise<AppUserWithPermissions | null> => {
    try {
      console.log('[AuthContext] Fetching user data for auth_user_id:', authUserId);
      console.log('[AuthContext] Starting u_users query...');

      // Fetch user from u_users - use maybeSingle to avoid errors when no rows
      // Add timeout to detect hanging queries
      const queryPromise = supabase
        .from('u_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 10s')), 10000);
      });

      const { data: userData, error: userError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('[AuthContext] User data result:', { userData, userError });

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      const appUser = userData as AppUser;

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
          ...appUser,
          groups: [],
          permissions: ['*'], // Wildcard for superuser
          directPermissions: [],
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
        ...appUser,
        groups,
        permissions: allPermissions,
        directPermissions,
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
    const userData = await fetchUserData(session.user.id);
    console.log('[AuthContext] fetchUserData returned:', userData ? 'user found' : 'null');

    if (!userData) {
      // Only clear auth state on initial load or if we've never been authenticated
      // Don't kick user out if fetchUserData fails during a token refresh
      setState(prev => {
        if (isInitialLoad || !prev.isAuthenticated) {
          console.log('[AuthContext] Clearing auth state - initial load or not authenticated');
          return {
            ...prev,
            user: null,
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

    // Check if user is admin (has manage_users permission or is in Administrators group)
    const isAdmin = userData.is_superuser ||
      userData.permissions.includes('system.manage_users') ||
      userData.groups.some(g => g.name === 'Administrators');

    setState(prev => ({
      ...prev,
      user: userData,
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
    }));
  }, [fetchUserData]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // Wait for session to be properly initialized from cookie storage
      await sessionReady;

      // Check system lock state
      const isLocked = await checkSystemLocked();

      if (!mounted) return;

      setState(prev => ({ ...prev, systemLocked: isLocked }));

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      }

      if (!mounted) return;

      if (session) {
        await handleSessionChange(session, true); // isInitialLoad = true
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[AuthContext] Auth state change event:', event, 'session:', session ? 'exists' : 'null');

        // Skip INITIAL_SESSION - we handle initialization ourselves
        if (event === 'INITIAL_SESSION') {
          console.log('[AuthContext] Skipping INITIAL_SESSION event - handled by initialize()');
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] SIGNED_OUT - clearing auth state');
          setState(prev => ({
            ...prev,
            user: null,
            session: null,
            isAuthenticated: false,
            isSuperuser: false,
            isAdmin: false,
            isPending: false,
          }));
          setChannelAccess([]);
        } else if (event === 'SIGNED_IN' && session) {
          // SIGNED_IN can fire on visibility change even if already authenticated
          // Only treat as initial load if not already authenticated
          setState(prev => {
            if (prev.isAuthenticated) {
              // Already authenticated - just update session tokens, don't refetch user data
              console.log('[AuthContext] SIGNED_IN but already authenticated - just updating session tokens');
              return {
                ...prev,
                session: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
              };
            }
            // Not authenticated - need to fetch user data
            console.log('[AuthContext] SIGNED_IN and not authenticated - fetching user data');
            handleSessionChange(session, true);
            return prev;
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token refresh - don't kick user out on failure, just update session tokens
          console.log('[AuthContext] TOKEN_REFRESHED - updating session');
          setState(prev => {
            if (prev.isAuthenticated && prev.session) {
              return {
                ...prev,
                session: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
              };
            }
            return prev;
          });
        } else if (session) {
          // Other events with session - only process if not already authenticated
          console.log('[AuthContext] Other event with session:', event);
          setState(prev => {
            if (!prev.isAuthenticated) {
              // Not authenticated, try to authenticate
              handleSessionChange(session, true);
            }
            return prev;
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
      session: null,
      isAuthenticated: false,
      isSuperuser: false,
      isAdmin: false,
      isPending: false,
    }));
    setChannelAccess([]);

    // Clear the shared auth cookie
    const { cookieStorage, SHARED_AUTH_STORAGE_KEY } = await import('../lib/cookieStorage');
    cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);

    // Also clear any legacy localStorage keys
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

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshUser,
    getChannelAccess,
    canWriteToChannel,
    channelAccess,
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
