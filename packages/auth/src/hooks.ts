import { useAuthStore } from './authStore';
import type { AppUser, Organization, Invitation } from './types';

/**
 * Hook to get the current authenticated user
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signOut = useAuthStore((state) => state.signOut);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}

/**
 * Hook to get the current organization context
 * Respects impersonation for superusers
 */
export function useOrganization() {
  const organization = useAuthStore((state) => state.organization);
  const isImpersonating = useAuthStore((state) => state.isImpersonating);
  const impersonatedOrgId = useAuthStore((state) => state.impersonatedOrgId);
  const impersonatedOrgName = useAuthStore((state) => state.impersonatedOrgName);
  const getEffectiveOrganizationId = useAuthStore((state) => state.getEffectiveOrganizationId);
  const updateOrganizationSettings = useAuthStore((state) => state.updateOrganizationSettings);

  // Get effective organization (considering impersonation)
  const effectiveOrganization: Organization | null = isImpersonating && impersonatedOrgId
    ? {
        id: impersonatedOrgId,
        name: impersonatedOrgName || '',
        slug: '',
      }
    : organization;

  return {
    organization,
    effectiveOrganization,
    effectiveOrganizationId: getEffectiveOrganizationId(),
    isImpersonating,
    updateOrganizationSettings,
  };
}

/**
 * Hook to check if current user is an admin (owner or admin role)
 */
export function useIsAdmin(): boolean {
  const user = useAuthStore((state) => state.user);
  return user?.isAdmin ?? false;
}

/**
 * Hook to check if current user is the superuser
 */
export function useIsSuperuser(): boolean {
  return useAuthStore((state) => state.isSuperuser);
}

/**
 * Hook to check if currently impersonating an organization
 */
export function useIsImpersonating() {
  const isImpersonating = useAuthStore((state) => state.isImpersonating);
  const impersonatedOrgId = useAuthStore((state) => state.impersonatedOrgId);
  const impersonatedOrgName = useAuthStore((state) => state.impersonatedOrgName);
  const endImpersonation = useAuthStore((state) => state.endImpersonation);

  return {
    isImpersonating,
    impersonatedOrgId,
    impersonatedOrgName,
    endImpersonation,
  };
}

/**
 * Hook to check if user can manage organizations (superuser only)
 */
export function useCanManageOrganizations(): boolean {
  return useAuthStore((state) => state.canManageOrganizations());
}

/**
 * Hook to check if user can manage users (superuser or org admin)
 */
export function useCanManageUsers(): boolean {
  return useAuthStore((state) => state.canManageUsers());
}

/**
 * Hook for invitation management
 */
export function useInvitations() {
  const sendInvitation = useAuthStore((state) => state.sendInvitation);
  const getInvitations = useAuthStore((state) => state.getInvitations);
  const revokeInvitation = useAuthStore((state) => state.revokeInvitation);
  const resendInvitation = useAuthStore((state) => state.resendInvitation);

  return {
    sendInvitation,
    getInvitations,
    revokeInvitation,
    resendInvitation,
  };
}

/**
 * Hook for member management
 */
export function useMembers() {
  const getOrganizationMembers = useAuthStore((state) => state.getOrganizationMembers);
  const updateMemberRole = useAuthStore((state) => state.updateMemberRole);
  const removeMember = useAuthStore((state) => state.removeMember);

  return {
    getOrganizationMembers,
    updateMemberRole,
    removeMember,
  };
}

/**
 * Hook for superuser actions
 */
export function useSuperuser() {
  const isSuperuser = useAuthStore((state) => state.isSuperuser);
  const isImpersonating = useAuthStore((state) => state.isImpersonating);
  const impersonatedOrgId = useAuthStore((state) => state.impersonatedOrgId);
  const impersonatedOrgName = useAuthStore((state) => state.impersonatedOrgName);
  const impersonateOrganization = useAuthStore((state) => state.impersonateOrganization);
  const endImpersonation = useAuthStore((state) => state.endImpersonation);
  const checkSuperuserStatus = useAuthStore((state) => state.checkSuperuserStatus);

  return {
    isSuperuser,
    isImpersonating,
    impersonatedOrgId,
    impersonatedOrgName,
    impersonateOrganization,
    endImpersonation,
    checkSuperuserStatus,
  };
}

/**
 * Hook to get effective organization ID (respects impersonation)
 */
export function useEffectiveOrgId(): string | null {
  return useAuthStore((state) => state.getEffectiveOrganizationId());
}

/**
 * Hook to get access token for API calls
 */
export function useAccessToken(): string | null {
  return useAuthStore((state) => state.accessToken);
}
