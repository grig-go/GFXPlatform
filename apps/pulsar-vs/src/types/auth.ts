/**
 * Authentication Types for Pulsar-VS
 * Simplified version focused on what Pulsar-VS needs
 */

// User status
export type UserStatus = 'active' | 'pending' | 'inactive';

// Organization role
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

// Organization structure
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// User from u_users table
export interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  is_superuser: boolean;
  organization_id: string;
  org_role: OrgRole;
  created_at: string;
  updated_at: string;
}

// Auth context state
export interface AuthState {
  user: AppUser | null;
  organization: Organization | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
}
