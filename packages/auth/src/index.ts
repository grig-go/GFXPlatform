// Main exports for @gfx/auth package

// Types
export type {
  AppUser,
  Organization,
  OrganizationSettings,
  Invitation,
  ImpersonationStatus,
  OrganizationWithStats,
  UserWithOrg,
  AuthState,
} from './types';

// Store
export { useAuthStore, initializeAuthStore } from './authStore';

// Hooks
export {
  useAuth,
  useOrganization,
  useIsAdmin,
  useIsSuperuser,
  useIsImpersonating,
  useCanManageOrganizations,
  useCanManageUsers,
  useInvitations,
  useMembers,
  useSuperuser,
  useEffectiveOrgId,
  useAccessToken,
} from './hooks';

// Utilities
export {
  isEmergentEmail,
  hasAdminRole,
  canSignUpWithoutInvite,
  withTimeout,
  withTimeoutNull,
  fetchWithTimeout,
} from './utils';
