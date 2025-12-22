import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthState, AppUser, Organization, OrganizationSettings, Invitation } from './types';
import { isEmergentEmail, hasAdminRole, canSignUpWithoutInvite, fetchWithTimeout, withTimeout } from './utils';

// Store configuration
interface AuthStoreConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabase: SupabaseClient | null;
  isDevMode: boolean;
  storageKey?: string; // localStorage key prefix
}

let config: AuthStoreConfig | null = null;
let authListenerSetup = false;

/**
 * Initialize the auth store with Supabase configuration
 * Must be called before using useAuthStore
 */
export function initializeAuthStore(cfg: AuthStoreConfig): void {
  config = cfg;
}

/**
 * Get current config - throws if not initialized
 */
function getConfig(): AuthStoreConfig {
  if (!config) {
    throw new Error('Auth store not initialized. Call initializeAuthStore() first.');
  }
  return config;
}

/**
 * Get Supabase storage key based on URL
 */
function getSupabaseStorageKey(): string {
  const cfg = getConfig();
  // Extract project ID from Supabase URL
  const match = cfg.supabaseUrl.match(/https:\/\/([^.]+)\./);
  const projectId = match ? match[1] : 'default';
  return `sb-${projectId}-auth-token`;
}

// Helper to fetch user data and update state
async function fetchAndSetUserData(
  userId: string,
  set: (state: Partial<AuthState>) => void
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.supabase) return;

  const { data: userData, error: userError } = await cfg.supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      organization_id,
      organizations (
        id,
        name,
        slug,
        settings,
        max_projects,
        max_storage_mb
      )
    `)
    .eq('id', userId)
    .single();

  if (userData && !userError) {
    const org = userData.organizations as unknown as (Organization & {
      settings?: OrganizationSettings;
      max_projects?: number;
      max_storage_mb?: number;
    }) | null;

    set({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        organizationId: userData.organization_id,
        organizationName: org?.name || null,
        role: userData.role,
        isEmergentUser: isEmergentEmail(userData.email),
        isAdmin: hasAdminRole(userData.role),
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
        settings: org.settings,
        maxProjects: org.max_projects,
        maxStorageMb: org.max_storage_mb,
      } : null,
    });
  }
}

// Helper to check superuser status
async function checkSuperuserStatusImpl(
  set: (state: Partial<AuthState>) => void
): Promise<void> {
  const cfg = getConfig();
  if (!cfg.supabase) return;

  try {
    const { data, error } = await cfg.supabase.rpc('get_impersonation_status');

    if (!error && data) {
      set({
        isSuperuser: data.is_superuser || false,
        isImpersonating: data.is_impersonating || false,
        impersonatedOrgId: data.impersonated_organization_id || null,
        impersonatedOrgName: data.impersonated_organization_name || null,
      });
    }
  } catch (err) {
    console.warn('Failed to check superuser status:', err);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      organization: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      isSuperuser: false,
      isImpersonating: false,
      impersonatedOrgId: null,
      impersonatedOrgName: null,

      initialize: async () => {
        // If already initialized, just return
        if (get().isInitialized) {
          return;
        }

        const cfg = getConfig();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          set({ isInitialized: true, isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          // Check localStorage for existing session
          const storageKey = getSupabaseStorageKey();
          let storedSession: {
            access_token?: string;
            refresh_token?: string;
            user?: { id: string }
          } | null = null;

          try {
            const storedData = localStorage.getItem(storageKey);
            if (storedData) {
              storedSession = JSON.parse(storedData);
            }
          } catch (e) {
            console.warn('Failed to read stored session:', e);
          }

          if (storedSession?.access_token && storedSession?.user?.id) {
            // Verify token is still valid by fetching user data
            const userResponse = await fetchWithTimeout(
              `${cfg.supabaseUrl}/rest/v1/users?id=eq.${storedSession.user.id}&select=id,email,name,role,organization_id,organizations(id,name,slug,settings,max_projects,max_storage_mb)`,
              {
                headers: {
                  'apikey': cfg.supabaseAnonKey,
                  'Authorization': `Bearer ${storedSession.access_token}`,
                },
              },
              5000
            );

            if (userResponse?.ok) {
              const users = await userResponse.json();
              const userData = users[0];

              if (userData) {
                const org = userData.organizations as (Organization & {
                  settings?: OrganizationSettings;
                  max_projects?: number;
                  max_storage_mb?: number;
                }) | null;

                set({
                  accessToken: storedSession.access_token,
                  user: {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    organizationId: userData.organization_id,
                    organizationName: org?.name || null,
                    role: userData.role,
                    isEmergentUser: isEmergentEmail(userData.email),
                    isAdmin: hasAdminRole(userData.role),
                  },
                  organization: org ? {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    settings: org.settings,
                    maxProjects: org.max_projects,
                    maxStorageMb: org.max_storage_mb,
                  } : null,
                });

                // Check superuser status
                await checkSuperuserStatusImpl(set);
              }
            } else if (userResponse?.status === 401) {
              // Token expired, try to refresh
              if (storedSession.refresh_token) {
                const refreshResponse = await fetchWithTimeout(
                  `${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': cfg.supabaseAnonKey,
                    },
                    body: JSON.stringify({ refresh_token: storedSession.refresh_token }),
                  },
                  5000
                );

                if (refreshResponse?.ok) {
                  const refreshData = await refreshResponse.json();
                  localStorage.setItem(storageKey, JSON.stringify({
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    expires_at: refreshData.expires_at,
                    user: refreshData.user,
                  }));
                  // Recursively initialize with new token
                  set({ isInitialized: false });
                  await get().initialize();
                  return;
                } else {
                  // Refresh failed, clear session
                  localStorage.removeItem(storageKey);
                }
              }
            } else if (!userResponse) {
              // Request timed out - use cached data
              console.warn('Auth verification failed, using cached session data');
              set({ accessToken: storedSession.access_token });
            }
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email, password) => {
        const cfg = getConfig();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          return { success: false, error: 'Supabase not configured' };
        }

        set({ isLoading: true, error: null });

        try {
          // Sign in via REST API
          const authResponse = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': cfg.supabaseAnonKey,
            },
            body: JSON.stringify({ email, password }),
          });

          if (!authResponse.ok) {
            const errorData = await authResponse.json().catch(() => ({}));
            const errorMessage = errorData.error_description || errorData.msg || 'Invalid login credentials';
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          const authData = await authResponse.json();
          const accessToken = authData.access_token;
          const userId = authData.user?.id;

          if (!accessToken || !userId) {
            set({ error: 'Invalid response from auth server', isLoading: false });
            return { success: false, error: 'Invalid response from auth server' };
          }

          // Store access token
          set({ accessToken });

          // Store session in localStorage
          const storageKey = getSupabaseStorageKey();
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              access_token: accessToken,
              refresh_token: authData.refresh_token,
              expires_at: authData.expires_at,
              user: authData.user,
            }));
          } catch (e) {
            console.warn('Failed to persist session:', e);
          }

          // Fetch user data
          const userResponse = await fetch(
            `${cfg.supabaseUrl}/rest/v1/users?id=eq.${userId}&select=id,email,name,role,organization_id,organizations(id,name,slug,settings,max_projects,max_storage_mb)`,
            {
              headers: {
                'apikey': cfg.supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (userResponse.ok) {
            const users = await userResponse.json();
            const userData = users[0];

            if (userData) {
              const org = userData.organizations as (Organization & {
                settings?: OrganizationSettings;
                max_projects?: number;
                max_storage_mb?: number;
              }) | null;

              set({
                user: {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  organizationId: userData.organization_id,
                  organizationName: org?.name || null,
                  role: userData.role,
                  isEmergentUser: isEmergentEmail(userData.email),
                  isAdmin: hasAdminRole(userData.role),
                },
                organization: org ? {
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  settings: org.settings,
                  maxProjects: org.max_projects,
                  maxStorageMb: org.max_storage_mb,
                } : null,
                isLoading: false,
              });

              // Check superuser status after login
              await checkSuperuserStatusImpl(set);
            } else {
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }

          return { success: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign in failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      signUp: async (email, password, name, inviteToken) => {
        const cfg = getConfig();
        if (!cfg.supabase) {
          return { success: false, error: 'Supabase not configured' };
        }

        set({ isLoading: true, error: null });

        try {
          // Check if user can sign up
          const canSignUp = canSignUpWithoutInvite(email, cfg.isDevMode);

          if (!canSignUp && !inviteToken) {
            set({ isLoading: false });
            return {
              success: false,
              error: 'You need an invitation to sign up. Contact an admin at emergent.new.'
            };
          }

          // If has invite token, validate it
          let inviteData: { organization_id: string; role: string } | null = null;
          if (inviteToken) {
            const { data: validation, error: validationError } = await cfg.supabase
              .rpc('validate_invitation_token', { invite_token: inviteToken });

            if (validationError || !validation?.[0]?.is_valid) {
              set({ isLoading: false });
              return {
                success: false,
                error: validation?.[0]?.error_message || 'Invalid invitation'
              };
            }

            if (validation[0].email.toLowerCase() !== email.toLowerCase()) {
              set({ isLoading: false });
              return {
                success: false,
                error: 'Email does not match invitation'
              };
            }

            inviteData = {
              organization_id: validation[0].organization_id,
              role: validation[0].role,
            };
          }

          // Create auth user
          const { data: authData, error: authError } = await cfg.supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          });

          if (authError) {
            set({ error: authError.message, isLoading: false });
            return { success: false, error: authError.message };
          }

          if (authData.user) {
            let organizationId: string;
            let orgName: string;
            let userRole: string;

            if (inviteData) {
              organizationId = inviteData.organization_id;
              userRole = inviteData.role;

              const { data: org } = await cfg.supabase
                .from('organizations')
                .select('name')
                .eq('id', organizationId)
                .single();
              orgName = org?.name || 'Organization';

              await cfg.supabase.rpc('accept_invitation', {
                invite_token: inviteToken,
                user_id: authData.user.id,
              });
            } else {
              const { data: orgResult, error: orgError } = await cfg.supabase
                .rpc('get_or_create_org_for_email', {
                  user_email: email,
                  user_name: name,
                });

              if (orgError || !orgResult || orgResult.length === 0) {
                console.error('Error finding/creating organization:', orgError);
                set({ isLoading: false });
                return { success: false, error: 'Failed to create organization' };
              }

              const orgData = orgResult[0];
              organizationId = orgData.org_id;
              orgName = orgData.org_name;
              userRole = orgData.is_new ? 'owner' : 'member';
            }

            // Create user record
            const { error: userError } = await cfg.supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email,
                name,
                organization_id: organizationId,
                role: userRole,
              });

            if (userError) {
              console.error('Error creating user record:', userError);
            }

            set({
              user: {
                id: authData.user.id,
                email,
                name,
                organizationId,
                organizationName: orgName,
                role: userRole as AppUser['role'],
                isEmergentUser: isEmergentEmail(email),
                isAdmin: hasAdminRole(userRole),
              },
              organization: {
                id: organizationId,
                name: orgName,
                slug: '',
              },
              isLoading: false,
            });

            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Failed to create account' };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign up failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      signOut: async () => {
        const { accessToken } = get();
        const cfg = getConfig();

        // Clear state first
        set({
          user: null,
          organization: null,
          accessToken: null,
          error: null,
          isSuperuser: false,
          isImpersonating: false,
          impersonatedOrgId: null,
          impersonatedOrgName: null,
        });

        // Clear persisted auth storage
        try {
          localStorage.removeItem('emergent-auth');
          localStorage.removeItem(getSupabaseStorageKey());
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }

        // Sign out via REST API (non-blocking)
        if (accessToken && cfg.supabaseUrl && cfg.supabaseAnonKey) {
          fetch(`${cfg.supabaseUrl}/auth/v1/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': cfg.supabaseAnonKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }).catch(() => {
            // Ignore errors
          });
        }
      },

      clearError: () => set({ error: null }),

      refreshUser: async () => {
        const { user } = get();
        if (user) {
          await fetchAndSetUserData(user.id, set);
        }
      },

      // Admin actions
      sendInvitation: async (email, role = 'member') => {
        const { user, organization } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin || !organization) {
          return { success: false, error: 'Not authorized to send invitations' };
        }

        try {
          const { error } = await cfg.supabase
            .from('invitations')
            .insert({
              email: email.toLowerCase(),
              organization_id: organization.id,
              invited_by: user.id,
              role,
            });

          if (error) {
            if (error.message.includes('unique_pending_invite')) {
              return { success: false, error: 'An invitation already exists for this email' };
            }
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to send invitation' };
        }
      },

      getInvitations: async () => {
        const { user, organization } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin || !organization) {
          return [];
        }

        try {
          const { data, error } = await cfg.supabase
            .from('invitations')
            .select('*')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching invitations:', error);
            return [];
          }

          return (data || []).map(inv => ({
            id: inv.id,
            email: inv.email,
            organizationId: inv.organization_id,
            role: inv.role,
            token: inv.token,
            expiresAt: inv.expires_at,
            acceptedAt: inv.accepted_at,
            createdAt: inv.created_at,
          }));
        } catch {
          return [];
        }
      },

      revokeInvitation: async (invitationId) => {
        const { user } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          const { error } = await cfg.supabase
            .from('invitations')
            .delete()
            .eq('id', invitationId);

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to revoke invitation' };
        }
      },

      resendInvitation: async (invitationId) => {
        const { user } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          const { error } = await cfg.supabase
            .from('invitations')
            .update({
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', invitationId);

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to resend invitation' };
        }
      },

      getOrganizationMembers: async () => {
        const { organization } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !organization) {
          return [];
        }

        try {
          const { data, error } = await cfg.supabase
            .from('users')
            .select('id, email, name, role')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('Error fetching members:', error);
            return [];
          }

          return (data || []).map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            organizationId: organization.id,
            organizationName: organization.name,
            role: u.role,
            isEmergentUser: isEmergentEmail(u.email),
            isAdmin: hasAdminRole(u.role),
          }));
        } catch (err) {
          console.error('Error fetching members:', err);
          return [];
        }
      },

      updateMemberRole: async (userId, role) => {
        const { user } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          const { error } = await cfg.supabase
            .from('users')
            .update({ role })
            .eq('id', userId);

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to update role' };
        }
      },

      removeMember: async (userId) => {
        const { user } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        if (userId === user.id) {
          return { success: false, error: 'Cannot remove yourself' };
        }

        try {
          const { error } = await cfg.supabase
            .from('users')
            .update({ organization_id: null })
            .eq('id', userId);

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to remove member' };
        }
      },

      updateOrganizationSettings: async (settings) => {
        const { organization } = get();
        const cfg = getConfig();
        if (!cfg.supabase || !organization) {
          return { success: false, error: 'No organization' };
        }

        try {
          const currentSettings = organization.settings || {};
          const updatedSettings = { ...currentSettings, ...settings };

          const { error } = await cfg.supabase
            .from('organizations')
            .update({ settings: updatedSettings })
            .eq('id', organization.id);

          if (error) {
            return { success: false, error: error.message };
          }

          set({
            organization: {
              ...organization,
              settings: updatedSettings,
            },
          });

          return { success: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to update settings';
          return { success: false, error: message };
        }
      },

      // Superuser actions
      checkSuperuserStatus: async () => {
        await checkSuperuserStatusImpl(set);
      },

      impersonateOrganization: async (orgId) => {
        const { isSuperuser } = get();
        const cfg = getConfig();

        if (!cfg.supabase || !isSuperuser) {
          return { success: false, error: 'Only superuser can impersonate organizations' };
        }

        try {
          const { data, error } = await cfg.supabase.rpc('impersonate_organization', {
            p_org_id: orgId,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data && data.success) {
            set({
              isImpersonating: true,
              impersonatedOrgId: data.organization_id,
              impersonatedOrgName: data.organization_name,
            });
            return { success: true };
          }

          return { success: false, error: data?.error || 'Failed to impersonate' };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to impersonate';
          return { success: false, error: message };
        }
      },

      endImpersonation: async () => {
        const { isSuperuser, isImpersonating } = get();
        const cfg = getConfig();

        if (!cfg.supabase || !isSuperuser || !isImpersonating) {
          return { success: false, error: 'Not currently impersonating' };
        }

        try {
          const { data, error } = await cfg.supabase.rpc('end_impersonation');

          if (error) {
            return { success: false, error: error.message };
          }

          if (data && data.success) {
            set({
              isImpersonating: false,
              impersonatedOrgId: null,
              impersonatedOrgName: null,
            });
            return { success: true };
          }

          return { success: false, error: data?.error || 'Failed to end impersonation' };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to end impersonation';
          return { success: false, error: message };
        }
      },

      // Computed helpers
      getEffectiveOrganizationId: () => {
        const { isImpersonating, impersonatedOrgId, organization } = get();
        if (isImpersonating && impersonatedOrgId) {
          return impersonatedOrgId;
        }
        return organization?.id || null;
      },

      canManageOrganizations: () => {
        return get().isSuperuser;
      },

      canManageUsers: () => {
        const { isSuperuser, user } = get();
        return isSuperuser || (user?.isAdmin ?? false);
      },
    }),
    {
      name: 'emergent-auth', // Shared key between apps for SSO
      partialize: (state) => ({
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          name: state.user.name,
          organizationId: state.user.organizationId,
          organizationName: state.user.organizationName,
          role: state.user.role,
          isEmergentUser: state.user.isEmergentUser,
          isAdmin: state.user.isAdmin,
        } : null,
        organization: state.organization,
        isSuperuser: state.isSuperuser,
        isImpersonating: state.isImpersonating,
        impersonatedOrgId: state.impersonatedOrgId,
        impersonatedOrgName: state.impersonatedOrgName,
      }),
    }
  )
);
