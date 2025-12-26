import { create } from 'zustand';
import { supabase, isSupabaseConfigured, receiveAuthTokenFromUrl, sessionReady, signOut as sharedSignOut } from '@/lib/supabase';

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
    .from('u_users')
    .select(`
      id,
      email,
      full_name,
      org_role,
      organization_id,
      u_organizations (
        id,
        name,
        slug
      )
    `)
    .eq('auth_user_id', userId)
    .single();

  if (userData && !userError) {
    const org = userData.u_organizations as unknown as Organization | null;
    set({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        organizationId: userData.organization_id,
        organizationName: org?.name || null,
        role: userData.org_role,
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

// Create store WITHOUT persist - Supabase SDK handles cookie storage for SSO
export const useAuthStore = create<AuthState>()((set, get) => ({
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

    if (!isSupabaseConfigured() || !supabase) {
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

      // Get current session (matches Nova/Pulsar-Hub's simple approach)
      console.log('[Auth] Getting session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[Auth] Session result:', { hasSession: !!session, error });

      if (error) {
        console.error('[Auth] Error getting session:', error);
      }

      if (session) {
        console.log('[Auth] Processing session for user:', session.user.email);
        set({ accessToken: session.access_token });
        await fetchAndSetUserData(session.user.id, set);
      } else {
        console.log('[Auth] No existing session found');
      }
    } catch (err) {
      console.error('[Auth] Error during auth initialization:', err);
      // Don't set error - allow app to function
    } finally {
      set({ isLoading: false, isInitialized: true });
      console.log('[Auth] Initialization complete');
    }

    // Subscribe to auth state changes for token refresh
    // Note: This matches Nova/Pulsar's onAuthStateChange pattern exactly
    if (supabase && !authListenerSetup) {
      authListenerSetup = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        const isInitialized = get().isInitialized;
        console.log('[Auth] Auth state change:', event, '| initialized:', isInitialized);

        // Skip INITIAL_SESSION and SIGNED_IN during initialization - we handle it in initialize()
        // This prevents race conditions where setSession triggers SIGNED_IN before initialize() completes
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !isInitialized) {
          console.log('[Auth] Skipping auth event during initialization');
          return;
        }

        if (event === 'SIGNED_OUT') {
          set({ user: null, organization: null, accessToken: null, error: null });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // TOKEN_REFRESHED: Only update access token, don't re-fetch user data
          console.log('[Auth] Token refreshed, updating access token only');
          set({ accessToken: session.access_token });
        } else if (event === 'SIGNED_IN' && session && isInitialized) {
          // SIGNED_IN after initialization: Check if this is a session recovery or new login
          const currentUser = get().user;

          if (currentUser && currentUser.id === session.user.id) {
            // Same user - just update access token, don't refetch
            console.log('[Auth] SIGNED_IN for same user, updating access token only');
            set({ accessToken: session.access_token });
            return;
          }

          // Different user or no previous user - full refresh needed
          console.log('[Auth] SIGNED_IN with different/new user, fetching user data');
          set({ accessToken: session.access_token });
          await fetchAndSetUserData(session.user.id, set);
        } else if (session && isInitialized) {
          // Other events (USER_UPDATED, etc.): Full user data refresh
          console.log('[Auth] Processing auth state change for session, event:', event);
          set({ accessToken: session.access_token });
          await fetchAndSetUserData(session.user.id, set);
        }
      });
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

          if (data.user && data.session) {
            // Store access token
            set({ accessToken: data.session.access_token });

            // Fetch user data
            const { data: userData } = await supabase
              .from('u_users')
              .select(`
                id,
                email,
                full_name,
                org_role,
                organization_id,
                u_organizations (
                  id,
                  name,
                  slug
                )
              `)
              .eq('auth_user_id', data.user.id)
              .single();

            if (userData) {
              const org = userData.u_organizations as unknown as Organization | null;
              set({
                user: {
                  id: userData.id,
                  email: userData.email,
                  name: userData.full_name,
                  organizationId: userData.organization_id,
                  organizationName: org?.name || null,
                  role: userData.org_role,
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
                .from('u_organizations')
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
              .from('u_users')
              .insert({
                auth_user_id: authData.user.id,
                email,
                full_name: name,
                organization_id: organizationId,
                org_role: userRole,
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
        // Clear state first for immediate UI response
        set({ user: null, organization: null, accessToken: null, error: null });

        // Use the shared signOut which properly handles SSO cookie cleanup
        // This calls beginSignOut() to prevent infinite loops, then clears the shared cookie
        // IMPORTANT: This must happen BEFORE clearing localStorage, otherwise
        // Supabase's internal getItem calls will try to restore from cookie
        console.log('[Auth] Signing out via shared signOut...');
        await sharedSignOut();
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
            .from('u_invitations')
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
            .from('u_invitations')
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
            .from('u_invitations')
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
            .from('u_invitations')
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
          const { data, error } = await supabase
            .from('u_users')
            .select('id, email, full_name, org_role')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('Error fetching members:', error);
            return [];
          }

          return (data || []).map(u => ({
            id: u.id,
            email: u.email,
            name: u.full_name,
            organizationId: organization.id,
            organizationName: organization.name,
            role: u.org_role,
            isEmergentUser: isEmergentEmail(u.email),
          }));
        } catch {
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
            .from('u_users')
            .update({ org_role: role })
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
            .from('u_users')
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
}));
