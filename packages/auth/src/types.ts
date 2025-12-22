// Core auth types shared across all apps

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
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: OrganizationSettings;
  maxProjects?: number;
  maxStorageMb?: number;
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

// Superuser-specific types
export interface ImpersonationStatus {
  isSuperuser: boolean;
  isImpersonating: boolean;
  impersonatedOrganizationId: string | null;
  impersonatedOrganizationName: string | null;
}

export interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  maxProjects: number;
  maxStorageMb: number;
  userCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithOrg {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
  organizationName: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  status: 'active' | 'pending' | 'inactive';
}

// Auth store state interface
export interface AuthState {
  // State
  user: AppUser | null;
  organization: Organization | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Superuser state
  isSuperuser: boolean;
  isImpersonating: boolean;
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;

  // Core actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, inviteToken?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;

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

  // Superuser actions
  checkSuperuserStatus: () => Promise<void>;
  impersonateOrganization: (orgId: string) => Promise<{ success: boolean; error?: string }>;
  endImpersonation: () => Promise<{ success: boolean; error?: string }>;

  // Computed helpers
  getEffectiveOrganizationId: () => string | null;
  canManageOrganizations: () => boolean;
  canManageUsers: () => boolean;
}
