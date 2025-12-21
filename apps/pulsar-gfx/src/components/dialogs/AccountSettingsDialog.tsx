/**
 * AccountSettingsDialog Wrapper for Pulsar-GFX
 *
 * Adapts Pulsar-GFX's auth system to work with the shared AccountSettingsDialog component.
 */

import { AccountSettingsDialog as SharedAccountSettingsDialog } from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { AccountSettingsAuthProps, AccountUser, AccountOrganization } from '@emergent-platform/ui';

// Simple toast fallback (Pulsar-GFX doesn't have a toast library installed)
const toast = {
  success: (message: string) => console.log('[Success]', message),
  error: (message: string) => console.error('[Error]', message),
};

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsDialog({
  open,
  onOpenChange,
}: AccountSettingsDialogProps) {
  const { user, organization, signOut, getOrganizationMembers, getInvitations, sendInvitation, revokeInvitation, updateMemberRole, removeMember } = useAuthStore();

  // Adapt Pulsar-GFX user to shared AccountUser format
  const adaptedUser: AccountUser | null = user ? {
    id: user.id,
    email: user.email,
    full_name: user.name,
    avatar_url: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    groups: [],
    preferences: undefined,
  } : null;

  // Adapt organization from auth store
  const adaptedOrganization: AccountOrganization | null = organization ? {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo_url: undefined,
    allowed_domains: [],
    settings: {},
  } : null;

  // Create auth props adapter
  const authProps: AccountSettingsAuthProps = {
    user: adaptedUser,
    organization: adaptedOrganization,
    isSuperuser: user?.isEmergentUser || false,
    isOrgAdmin: user?.role === 'owner' || user?.role === 'admin' || false,
    permissions: [],
    refreshUser: async () => {
      // Re-initialize to refresh user data
      await useAuthStore.getState().initialize();
    },
    signOut: async () => {
      await signOut();
    },
    getOrganizationMembers: async () => {
      const members = await getOrganizationMembers();
      return members.map(m => ({
        id: m.id,
        email: m.email,
        full_name: m.name,
        avatar_url: null,
        org_role: m.role,
        status: 'active' as const,
      }));
    },
    getInvitations: async () => {
      const invitations = await getInvitations();
      return invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expiresAt,
        accepted_at: inv.acceptedAt,
        created_at: inv.createdAt,
      }));
    },
    sendInvitation,
    revokeInvitation,
    updateMemberRole,
    removeMember,
  };

  // Create toast adapter
  const toastAdapter = {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
  };

  // Type the supabase client
  if (!supabase) {
    return null;
  }

  return (
    <SharedAccountSettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      auth={authProps}
      supabase={supabase as any}
      toast={toastAdapter}
    />
  );
}
