/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Handles session management, user permissions, and system lock state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, sessionReady, startConnectionMonitor, stopConnectionMonitor, withAutoRecovery } from '../utils/supabase';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY } from '../lib/cookieStorage';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type {
  AuthState,
  AppUserWithPermissions,
  AppUser,
  Group,
  ChannelAccess,
  Organization,
  Invitation,
  OrgRole,
} from '../types/permissions';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getChannelAccess: (channelId: string) => ChannelAccess | undefined;
  channelAccess: ChannelAccess[];
  // Organization management
  getOrganizationMembers: () => Promise<AppUser[]>;
  sendInvitation: (email: string, role: OrgRole) => Promise<{ error: Error | null; invitation?: Invitation }>;
  revokeInvitation: (invitationId: string) => Promise<{ error: Error | null }>;
  getInvitations: () => Promise<Invitation[]>;
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

      // Use withAutoRecovery to handle stuck connections
      const { data, error } = await withAutoRecovery(
        (client) => client
          .from('u_users')
          .select('id')
          .eq('is_superuser', true)
          .limit(1),
        10000,
        'checkSystemLocked'
      );
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

  // Fetch full user data with permissions and organization
  const fetchUserData = useCallback(async (authUserId: string): Promise<{ user: AppUserWithPermissions; organization: Organization } | null> => {
    console.log('[Auth] fetchUserData starting for:', authUserId);
    try {
      // Fetch user from u_users with organization
      console.log('[Auth] Fetching user from u_users...');
      console.log('[Auth] Query: u_users where auth_user_id =', authUserId);
      const startTime = Date.now();
      const { data: userData, error: userError } = await withAutoRecovery(
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
      console.log('[Auth] u_users query completed in', Date.now() - startTime, 'ms');

      if (userError || !userData) {
        console.error('[Auth] Error fetching user data:', userError);
        return null;
      }
      console.log('[Auth] User found:', userData.email);
      console.log('[Auth] Raw userData:', JSON.stringify(userData, null, 2));

      // Extract organization from joined data
      const { u_organizations: orgData, ...userFields } = userData;
      console.log('[Auth] Extracted orgData:', orgData);
      const organization = orgData as Organization;
      const appUser = userFields as AppUser;

      // If user is superuser, they have all permissions
      if (appUser.is_superuser) {
        console.log('[Auth] User is superuser, returning early');
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
        user: {
          ...appUser,
          groups,
          permissions: allPermissions,
          directPermissions,
        },
        organization,
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
        organization: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isSuperuser: false,
        isAdmin: false,
        isOrgAdmin: false,
        isPending: false,
      }));
      setChannelAccess([]);
      return;
    }

    console.log('[Auth] Fetching user data...');
    const result = await fetchUserData(session.user.id);
    console.log('[Auth] User data result:', result ? 'found' : 'not found');

    if (!result) {
      // User exists in auth but not in u_users - edge case
      console.log('[Auth] No user data, clearing state');
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
        isPending: false,
      }));
      return;
    }

    const { user: userData, organization } = result;

    // Check if user is admin (has manage_users permission or is in Administrators group)
    const isAdmin = userData.is_superuser ||
      userData.permissions.includes('system.manage_users') ||
      userData.groups.some(g => g.name === 'Administrators');

    // Check if user is org admin (owner or admin in their organization)
    const isOrgAdmin = userData.org_role === 'owner' || userData.org_role === 'admin';

    console.log('[Auth] Setting authenticated state, isAdmin:', isAdmin, 'isSuperuser:', userData.is_superuser, 'isOrgAdmin:', isOrgAdmin);
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
      isOrgAdmin,
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
        // Wait for session to be restored from cookie storage before proceeding
        console.log('[Auth] Waiting for session restoration from cookie storage...');
        await sessionReady;
        console.log('[Auth] Session restoration complete');

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

    // Start connection health monitor to detect and recover from stuck connections
    startConnectionMonitor();

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
            organization: null,
            session: null,
            isAuthenticated: false,
            isSuperuser: false,
            isAdmin: false,
            isOrgAdmin: false,
            isPending: false,
          }));
          setChannelAccess([]);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // TOKEN_REFRESHED: Only update session tokens, don't re-fetch user data
          // User data hasn't changed, just the access token was refreshed
          console.log('[Auth] Token refreshed, updating session tokens only');
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
          // _recoverAndRefresh emits SIGNED_IN when recovering session on page focus
          // Only refetch user data if the user ID changed (actual new login)
          let shouldRefetch = false;

          setState(prev => {
            const currentUserId = prev.user?.auth_user_id;
            const newUserId = session.user.id;

            if (currentUserId && currentUserId === newUserId) {
              // Same user - just update session tokens, don't refetch user data
              // This prevents unnecessary DB calls from _recoverAndRefresh
              console.log('[Auth] SIGNED_IN for same user, updating session tokens only');
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

          // Full refresh only if user changed or no previous user
          if (shouldRefetch) {
            console.log('[Auth] SIGNED_IN with different/new user, fetching user data');
            await handleSessionChange(session);
          }
        } else if (session && initializedRef.current) {
          // Other events (USER_UPDATED, etc.): Full user data refresh
          console.log('[Auth] Processing auth state change for session, event:', event);
          await handleSessionChange(session);
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
      organization: null,
      session: null,
      isAuthenticated: false,
      isSuperuser: false,
      isAdmin: false,
      isOrgAdmin: false,
      isPending: false,
    }));
    setChannelAccess([]);

    // Clear the shared auth cookie (this is where the session is stored)
    cookieStorage.removeItem(SHARED_AUTH_STORAGE_KEY);

    // Also clear any legacy localStorage keys for backwards compatibility
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Also call official signOut to clear server-side session
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

  // Get members of the current organization
  const getOrganizationMembers = useCallback(async (): Promise<AppUser[]> => {
    if (!state.user?.organization_id) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('u_users')
        .select('*')
        .eq('organization_id', state.user.organization_id)
        .order('full_name');

      if (error) {
        console.error('Error fetching organization members:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching organization members:', err);
      return [];
    }
  }, [state.user?.organization_id]);

  // Send an invitation to join the organization
  const sendInvitation = useCallback(async (email: string, role: OrgRole): Promise<{ error: Error | null; invitation?: Invitation }> => {
    if (!state.user?.organization_id || !state.user?.id) {
      return { error: new Error('No organization or user ID available') };
    }

    try {
      const { data, error } = await supabase
        .from('u_invitations')
        .insert({
          email,
          organization_id: state.user.organization_id,
          invited_by: state.user.id,
          role,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending invitation:', error);
        return { error: new Error(error.message) };
      }

      return { error: null, invitation: data };
    } catch (err) {
      console.error('Error sending invitation:', err);
      return { error: err as Error };
    }
  }, [state.user?.organization_id, state.user?.id]);

  // Revoke an invitation
  const revokeInvitation = useCallback(async (invitationId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from('u_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('Error revoking invitation:', error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      console.error('Error revoking invitation:', err);
      return { error: err as Error };
    }
  }, []);

  // Get pending invitations for the organization
  const getInvitations = useCallback(async (): Promise<Invitation[]> => {
    if (!state.user?.organization_id) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('u_invitations')
        .select('*')
        .eq('organization_id', state.user.organization_id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching invitations:', err);
      return [];
    }
  }, [state.user?.organization_id]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshUser,
    getChannelAccess,
    channelAccess,
    getOrganizationMembers,
    sendInvitation,
    revokeInvitation,
    getInvitations,
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
