import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Timeout helper for async operations
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Timeout helper that resolves to null instead of rejecting
function withTimeoutNull<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<T | null>((resolve) =>
      setTimeout(() => resolve(null), ms)
    ),
  ]);
}

// Types
export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
  organizationName: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  isEmergentUser: boolean;
  isAdmin: boolean; // true if role is 'owner' or 'admin'
}

export interface OrganizationSettings {
  ai_model?: string;
  ai_image_model?: string;
  gemini_api_key?: string;
  claude_api_key?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: OrganizationSettings;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedByEmail?: string;
}

interface AuthState {
  // State
  user: AppUser | null;
  organization: Organization | null;
  accessToken: string | null; // JWT access token for API calls
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, inviteToken?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;

  // Invitation actions (admin only)
  sendInvitation: (email: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  getInvitations: () => Promise<Invitation[]>;
  revokeInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  resendInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;

  // Organization member actions
  getOrganizationMembers: () => Promise<AppUser[]>;
  updateMemberRole: (userId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Organization settings actions
  updateOrganizationSettings: (settings: Partial<OrganizationSettings>) => Promise<{ success: boolean; error?: string }>;
}

// Check if we're in dev mode (set VITE_DEV_MODE=false to simulate production)
export const isDevMode = (): boolean => {
  const devModeEnv = import.meta.env.VITE_DEV_MODE;
  // Default to true on localhost if not explicitly set to 'false'
  if (devModeEnv === 'false' || devModeEnv === false) {
    return false;
  }
  return import.meta.env.DEV || window.location.hostname === 'localhost';
};

// Helper to check if email is from emergent.new domain
export const isEmergentEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@emergent.new');
};

// Helper to check if role has admin privileges
export const hasAdminRole = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

// Allowed email domains for signup (without invitation)
const ALLOWED_DOMAINS = ['emergent.new'];

const canSignUpWithoutInvite = (email: string): boolean => {
  // In dev mode, allow any email to sign up
  if (isDevMode()) {
    return true;
  }
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

// Track if auth listener is already set up
let authListenerSetup = false;

// Helper to fetch user data and update state
async function fetchAndSetUserData(
  userId: string,
  set: (state: Partial<AuthState>) => void
): Promise<void> {
  if (!supabase) return;

  const { data: userData, error: userError } = await supabase
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
        settings
      )
    `)
    .eq('id', userId)
    .single();

  if (userData && !userError) {
    const org = userData.organizations as unknown as (Organization & { settings?: OrganizationSettings }) | null;
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
      } : null,
    });
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        // If already initialized, just return (prevents re-init loops)
        if (get().isInitialized) {
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          set({ isInitialized: true, isLoading: false });
          return;
        }

        set({ isLoading: true });

        // Helper for fetch with timeout
        const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 5000): Promise<Response | null> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (e) {
            clearTimeout(timeoutId);
            if (e instanceof Error && e.name === 'AbortError') {
              console.warn('Auth request timed out');
            }
            return null;
          }
        };

        try {
          // Check localStorage for existing session (REST-based approach)
          let storedSession: { access_token?: string; refresh_token?: string; user?: { id: string } } | null = null;
          try {
            const storedData = localStorage.getItem('sb-ihdoylhzekyluiiigxxc-auth-token');
            if (storedData) {
              storedSession = JSON.parse(storedData);
            }
          } catch (e) {
            console.warn('Failed to read stored session:', e);
          }

          if (storedSession?.access_token && storedSession?.user?.id) {
            // Verify token is still valid by fetching user data via REST (with 5s timeout)
            const userResponse = await fetchWithTimeout(
              `${supabaseUrl}/rest/v1/users?id=eq.${storedSession.user.id}&select=id,email,name,role,organization_id,organizations(id,name,slug,settings)`,
              {
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${storedSession.access_token}`,
                },
              },
              5000
            );

            if (userResponse?.ok) {
              const users = await userResponse.json();
              const userData = users[0];

              if (userData) {
                const org = userData.organizations as (Organization & { settings?: OrganizationSettings }) | null;
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
                  } : null,
                });
              }
            } else if (userResponse?.status === 401) {
              // Token expired, try to refresh
              if (storedSession.refresh_token) {
                const refreshResponse = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                  },
                  body: JSON.stringify({ refresh_token: storedSession.refresh_token }),
                }, 5000);

                if (refreshResponse?.ok) {
                  const refreshData = await refreshResponse.json();
                  // Update stored session
                  localStorage.setItem('sb-ihdoylhzekyluiiigxxc-auth-token', JSON.stringify({
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
                  localStorage.removeItem('sb-ihdoylhzekyluiiigxxc-auth-token');
                }
              }
            } else if (!userResponse) {
              // Request timed out or failed - use cached data from Zustand persist if available
              console.warn('Auth verification failed, using cached session data');
              // Still set the access token so API calls can work
              set({ accessToken: storedSession.access_token });
            }
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
          // Don't set error - allow app to function with cached data
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email, password) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          return { success: false, error: 'Supabase not configured' };
        }

        set({ isLoading: true, error: null });

        try {
          // Sign in via REST API
          const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
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

          // Store session in localStorage for persistence
          try {
            localStorage.setItem('sb-ihdoylhzekyluiiigxxc-auth-token', JSON.stringify({
              access_token: accessToken,
              refresh_token: authData.refresh_token,
              expires_at: authData.expires_at,
              user: authData.user,
            }));
          } catch (e) {
            console.warn('Failed to persist session:', e);
          }

          // Fetch user data via REST API
          const userResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=id,email,name,role,organization_id,organizations(id,name,slug,settings)`,
            {
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (userResponse.ok) {
            const users = await userResponse.json();
            const userData = users[0];

            if (userData) {
              const org = userData.organizations as (Organization & { settings?: OrganizationSettings }) | null;
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
                } : null,
                isLoading: false,
              });
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
        if (!supabase) {
          return { success: false, error: 'Supabase not configured' };
        }

        set({ isLoading: true, error: null });

        try {
          // Check if user can sign up
          const canSignUp = canSignUpWithoutInvite(email);

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
            const { data: validation, error: validationError } = await supabase
              .rpc('validate_invitation_token', { invite_token: inviteToken });

            if (validationError || !validation?.[0]?.is_valid) {
              set({ isLoading: false });
              return {
                success: false,
                error: validation?.[0]?.error_message || 'Invalid invitation'
              };
            }

            // Verify email matches invitation
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
          const { data: authData, error: authError } = await supabase.auth.signUp({
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
              // Use invitation org
              organizationId = inviteData.organization_id;
              userRole = inviteData.role;

              // Get org name
              const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', organizationId)
                .single();
              orgName = org?.name || 'Organization';

              // Accept the invitation
              await supabase.rpc('accept_invitation', {
                invite_token: inviteToken,
                user_id: authData.user.id,
              });
            } else {
              // Use domain-based organization matching
              // This will find an existing org for the email domain or create a new one
              const { data: orgResult, error: orgError } = await supabase
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
              // If this is a new org, user is owner; otherwise they're a member
              userRole = orgData.is_new ? 'owner' : 'member';
            }

            // Create user record
            const { error: userError } = await supabase
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
              // Don't fail signup, user can still log in
            }

            // Set state
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

        // Clear state first for immediate UI response
        set({ user: null, organization: null, accessToken: null, error: null });

        // Clear persisted auth storage
        try {
          localStorage.removeItem('emergent-auth');
          localStorage.removeItem('sb-ihdoylhzekyluiiigxxc-auth-token');
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }

        // Sign out via REST API (non-blocking, fire-and-forget)
        if (accessToken) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseAnonKey) {
            fetch(`${supabaseUrl}/auth/v1/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            }).catch(() => {
              // Ignore errors - user is already logged out locally
            });
          }
        }
      },

      clearError: () => set({ error: null }),

      // Admin actions
      sendInvitation: async (email, role = 'member') => {
        const { user, organization } = get();
        if (!supabase || !user?.isAdmin || !organization) {
          return { success: false, error: 'Not authorized to send invitations' };
        }

        try {
          const { error } = await supabase
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

          console.log(`Invitation created for ${email} - email notification not yet implemented`);

          return { success: true };
        } catch (err) {
          return { success: false, error: 'Failed to send invitation' };
        }
      },

      getInvitations: async () => {
        const { user, organization } = get();
        if (!supabase || !user?.isAdmin || !organization) {
          return [];
        }

        try {
          const { data, error } = await supabase
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
        if (!supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          const { error } = await supabase
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
        if (!supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          // Extend expiration
          const { error } = await supabase
            .from('invitations')
            .update({
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', invitationId);

          if (error) {
            return { success: false, error: error.message };
          }

          console.log('Invitation resent - email notification not yet implemented');

          return { success: true };
        } catch {
          return { success: false, error: 'Failed to resend invitation' };
        }
      },

      getOrganizationMembers: async () => {
        const { organization } = get();
        if (!supabase || !organization) {
          return [];
        }

        try {
          // Query without timeout wrapper - let Supabase handle its own timeouts
          const { data, error } = await supabase
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
        if (!supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        try {
          const { error } = await supabase
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
        if (!supabase || !user?.isAdmin) {
          return { success: false, error: 'Not authorized' };
        }

        // Don't allow removing yourself
        if (userId === user.id) {
          return { success: false, error: 'Cannot remove yourself' };
        }

        try {
          // Set organization to null (soft remove from org)
          const { error } = await supabase
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
        if (!supabase || !organization) {
          return { success: false, error: 'No organization' };
        }

        try {
          // Merge new settings with existing ones
          const currentSettings = organization.settings || {};
          const updatedSettings = { ...currentSettings, ...settings };

          const { error } = await supabase
            .from('organizations')
            .update({ settings: updatedSettings })
            .eq('id', organization.id);

          if (error) {
            return { success: false, error: error.message };
          }

          // Update local state
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
    }),
    {
      name: 'emergent-auth', // Shared key between Nova and Pulsar for SSO
      partialize: (state) => ({
        // Persist user info including organization for project creation
        // Full data will be refreshed on initialize()
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
      }),
    }
  )
);
