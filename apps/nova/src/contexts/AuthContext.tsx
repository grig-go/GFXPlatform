/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Handles session management, user permissions, and system lock state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
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

  // Track if initialization is in progress to prevent race conditions
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  // Check if system is locked (no superuser exists)
  const checkSystemLocked = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Auth] checkSystemLocked: querying u_users for superuser...');
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('u_users')
        .select('id')
        .eq('is_superuser', true)
        .limit(1);
      console.log('[Auth] checkSystemLocked: query took', Date.now() - startTime, 'ms');

      if (error) {
        console.error('[Auth] Error checking system lock:', error);
        return true; // Assume locked on error
      }

      console.log('[Auth] checkSystemLocked: found', data?.length || 0, 'superusers');
      return !data || data.length === 0;
    } catch (err) {
      console.error('[Auth] Error checking system lock:', err);
      return true;
    }
  }, []);

  // Fetch full user data with permissions
  const fetchUserData = useCallback(async (authUserId: string): Promise<AppUserWithPermissions | null> => {
    console.log('[Auth] fetchUserData starting for:', authUserId);
    try {
      // Fetch user from u_users
      console.log('[Auth] Fetching user from u_users...');
      console.log('[Auth] Query: u_users where auth_user_id =', authUserId);
      const startTime = Date.now();
      const { data: userData, error: userError } = await supabase
        .from('u_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();
      console.log('[Auth] u_users query completed in', Date.now() - startTime, 'ms');

      if (userError || !userData) {
        console.error('[Auth] Error fetching user data:', userError);
        return null;
      }
      console.log('[Auth] User found:', userData.email);

      const appUser = userData as AppUser;

      // If user is superuser, they have all permissions
      if (appUser.is_superuser) {
        console.log('[Auth] User is superuser, returning early');
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

        groupPermissions = groupPermsData
          ?.map((p: any) => getPermKey(p))
          .filter(Boolean) || [];
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

      const directPermissions = directPermsData
        ?.map((p: any) => getPermKey(p))
        .filter(Boolean) || [];

      // Combine and deduplicate permissions
      const allPermissions = [...new Set([...groupPermissions, ...directPermissions])];

      // Fetch channel access for Pulsar
      const { data: channelAccessData, error: channelAccessError } = await supabase
        .from('u_channel_access')
        .select('*')
        .eq('user_id', appUser.id);

      if (channelAccessError) {
        console.error('Error fetching channel access:', channelAccessError);
      }

      setChannelAccess(channelAccessData || []);

      console.log('[Auth] fetchUserData complete, permissions:', allPermissions.length);
      return {
        ...appUser,
        groups,
        permissions: allPermissions,
        directPermissions,
      };
    } catch (err) {
      console.error('[Auth] Error in fetchUserData:', err);
      return null;
    }
  }, []);

  // Handle session change
  const handleSessionChange = useCallback(async (session: Session | null) => {
    console.log('[Auth] handleSessionChange called, session:', !!session);
    if (!session) {
      console.log('[Auth] No session, clearing state');
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

    console.log('[Auth] Fetching user data...');
    const userData = await fetchUserData(session.user.id);
    console.log('[Auth] User data result:', userData ? 'found' : 'not found');

    if (!userData) {
      // User exists in auth but not in u_users - edge case
      console.log('[Auth] No user data, clearing state');
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
      return;
    }

    // Check if user is admin (has manage_users permission or is in Administrators group)
    const isAdmin = userData.is_superuser ||
      userData.permissions.includes('system.manage_users') ||
      userData.groups.some(g => g.name === 'Administrators');

    console.log('[Auth] Setting authenticated state, isAdmin:', isAdmin, 'isSuperuser:', userData.is_superuser);
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
    console.log('[Auth] State updated, isLoading set to false');
  }, [fetchUserData]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('[Auth] Starting initialization...');
      initializingRef.current = true;
      try {
        // Check system lock state
        console.log('[Auth] Checking system lock...');
        const isLocked = await checkSystemLocked();
        console.log('[Auth] System locked:', isLocked);

        if (!mounted) return;

        setState(prev => ({ ...prev, systemLocked: isLocked }));

        // Get current session
        console.log('[Auth] Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[Auth] Session result:', { hasSession: !!session, error });

        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        if (!mounted) return;

        if (session) {
          console.log('[Auth] Processing session for user:', session.user.email);
          await handleSessionChange(session);
          console.log('[Auth] Session change handled');
        } else {
          console.log('[Auth] No session, setting isLoading to false');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.error('[Auth] Error during auth initialization:', err);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
      console.log('[Auth] Initialization complete');
      initializingRef.current = false;
      initializedRef.current = true;
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[Auth] Auth state change:', event, '| initializing:', initializingRef.current, '| initialized:', initializedRef.current);

        // Skip INITIAL_SESSION and SIGNED_IN during initialization - we handle it in initialize()
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !initializedRef.current) {
          console.log('[Auth] Skipping auth event during initialization');
          return;
        }

        if (event === 'SIGNED_OUT') {
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
        } else if (session && initializedRef.current) {
          console.log('[Auth] Processing auth state change for session');
          await handleSessionChange(session);
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
      const { data, error } = await supabase.auth.signInWithPassword({
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

    // Always clear all Supabase localStorage keys to ensure clean logout
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Also call official signOut to clear server-side session
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors - localStorage is already cleared
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

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshUser,
    getChannelAccess,
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
