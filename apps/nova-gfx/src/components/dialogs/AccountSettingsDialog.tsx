/**
 * AccountSettingsDialog Wrapper for Nova-GFX
 *
 * Adapts Nova-GFX's auth system to work with the shared AccountSettingsDialog component.
 */

import { AccountSettingsDialog as SharedAccountSettingsDialog } from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { AccountSettingsAuthProps, AccountUser, AccountOrganization, OrgRole } from '@emergent-platform/ui';

// Simple toast fallback (Nova-GFX doesn't have a toast library installed)
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
  const { user, organization, signOut } = useAuthStore();

  // Adapt Nova-GFX user to shared AccountUser format
  const adaptedUser: AccountUser | null = user ? {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
    groups: [],
    preferences: undefined,
  } : null;

  // Adapt organization from auth store
  const adaptedOrganization: AccountOrganization | null = organization ? {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo_url: organization.logo_url,
    allowed_domains: organization.allowed_domains,
    settings: organization.settings,
  } : null;

  // Create auth props adapter
  const authProps: AccountSettingsAuthProps = {
    user: adaptedUser,
    organization: adaptedOrganization,
    isSuperuser: user?.is_superuser || false,
    isOrgAdmin: user?.is_superuser || false, // For now, superusers are org admins
    permissions: [],
    refreshUser: async () => {
      // Re-initialize to refresh user data
      await useAuthStore.getState().initialize();
    },
    signOut: async () => {
      await signOut();
    },
    // Stub methods - organization features not implemented yet
    getOrganizationMembers: async () => [],
    getInvitations: async () => [],
    sendInvitation: async () => ({ success: false, error: 'Not implemented' }),
    revokeInvitation: async () => ({ success: false, error: 'Not implemented' }),
    updateMemberRole: async () => ({ success: false, error: 'Not implemented' }),
    removeMember: async () => ({ success: false, error: 'Not implemented' }),
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
