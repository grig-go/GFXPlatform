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
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
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
        slug
      )
    `)
    .eq('id', userId)
    .single();

  if (userData && !userError) {
    const org = userData.organizations as unknown as Organization | null;
    set({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        organizationId: userData.organization_id,
        organizationName: org?.name || null,
        role: userData.role,
        isEmergentUser: isEmergentEmail(userData.email),
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
      } : null,
    });
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        // If already initialized, just return (prevents re-init loops)
        if (get().isInitialized) {
          return;
        }

        if (!isSupabaseConfigured() || !supabase) {
          set({ isInitialized: true, isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          // Get current session with a timeout to prevent hanging
          // If session fetch times out, continue without session (user can log in manually)
          const sessionResult = await withTimeoutNull(
            supabase.auth.getSession(),
            5000 // 5 second timeout
          );

          const session = sessionResult?.data?.session;

          if (session?.user) {
            // Fetch user data from our users table (also with timeout)
            try {
              await withTimeout(
                fetchAndSetUserData(session.user.id, set),
                5000,
                'Fetch user data'
              );
            } catch (userDataErr) {
              console.warn('Failed to fetch user data (continuing):', userDataErr);
              // Continue anyway - user is authenticated but we don't have their full profile
            }
          } else if (sessionResult === null) {
            console.warn('Auth session check timed out - continuing without session');
          }

          // Set up auth listener only once
          if (!authListenerSetup) {
            authListenerSetup = true;
            supabase.auth.onAuthStateChange(async (event, session) => {
              if (event === 'SIGNED_OUT') {
                set({ user: null, organization: null });
              } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                // Refresh user data without re-initializing
                await fetchAndSetUserData(session.user.id, set);
              }
            });
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
          set({ error: 'Failed to initialize authentication' });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email, password) => {
        if (!supabase) {
          return { success: false, error: 'Supabase not configured' };
        }

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          if (data.user) {
            // Fetch user data
            const { data: userData } = await supabase
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
                  slug
                )
              `)
              .eq('id', data.user.id)
              .single();

            if (userData) {
              const org = userData.organizations as unknown as Organization | null;
              set({
                user: {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  organizationId: userData.organization_id,
                  organizationName: org?.name || null,
                  role: userData.role,
                  isEmergentUser: isEmergentEmail(userData.email),
                },
                organization: org ? {
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                } : null,
                isLoading: false,
              });
            }
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
              // Create new organization for emergent.new users
              const orgSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
              orgName = name ? `${name}'s Workspace` : 'My Workspace';

              const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({
                  name: orgName,
                  slug: orgSlug,
                  settings: {},
                })
                .select()
                .single();

              if (orgError) {
                console.error('Error creating organization:', orgError);
                set({ isLoading: false });
                return { success: false, error: 'Failed to create organization' };
              }

              organizationId = newOrg.id;
              userRole = 'owner';
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
        if (supabase) {
          await supabase.auth.signOut();
        }
        set({ user: null, organization: null, error: null });
      },

      clearError: () => set({ error: null }),

      // Admin actions
      sendInvitation: async (email, role = 'member') => {
        const { user, organization } = get();
        if (!supabase || !user?.isEmergentUser || !organization) {
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
        if (!supabase || !user?.isEmergentUser || !organization) {
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
        if (!supabase || !user?.isEmergentUser) {
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
        if (!supabase || !user?.isEmergentUser) {
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
          const { data, error } = await withTimeout(
            supabase
              .from('users')
              .select('id, email, name, role')
              .eq('organization_id', organization.id)
              .order('created_at', { ascending: true }),
            10000,
            'Fetch organization members'
          );

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
          }));
        } catch (err) {
          console.error('Error fetching members:', err);
          return [];
        }
      },

      updateMemberRole: async (userId, role) => {
        const { user } = get();
        if (!supabase || !user?.isEmergentUser) {
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
        if (!supabase || !user?.isEmergentUser) {
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
    }),
    {
      name: 'emergent-auth', // Shared key between Nova and Pulsar for SSO
      partialize: (state) => ({
        // Only persist user basic info for fast hydration
        // Full data will be refreshed on initialize()
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          name: state.user.name,
          isEmergentUser: state.user.isEmergentUser,
        } : null,
      }),
    }
  )
);
