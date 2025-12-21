/**
 * Types for the shared AccountSettingsDialog component
 */

export interface AccountUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  updated_at: string;
  groups?: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
}

export interface AccountOrganization {
  id: string;
  name: string;
  slug?: string;
}

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrgMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  org_role: OrgRole;
}

export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
  created_at: string;
}

// Props that each app must provide
export interface AccountSettingsAuthProps {
  user: AccountUser | null;
  organization: AccountOrganization | null;
  isSuperuser: boolean;
  isOrgAdmin: boolean;
  permissions: string[];
  refreshUser?: () => Promise<void>;
  signOut: () => Promise<void>;
  // Organization management
  getOrganizationMembers?: () => Promise<OrgMember[]>;
  getInvitations?: () => Promise<Invitation[]>;
  sendInvitation?: (email: string, role: OrgRole) => Promise<{ success: boolean; error?: string }>;
  revokeInvitation?: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole?: (userId: string, role: OrgRole) => Promise<{ success: boolean; error?: string }>;
  removeMember?: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

// Supabase-like client interface (minimal)
export interface SupabaseClientLike {
  from: (table: string) => {
    select: (columns?: string) => any;
    insert: (data: any) => any;
    update: (data: any) => any;
    delete: () => any;
  };
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: File, options?: any) => Promise<{ data: any; error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  auth: {
    updateUser: (data: { password?: string }) => Promise<{ error: any }>;
    signOut: (options?: { scope?: string }) => Promise<{ error: any }>;
  };
  rpc: (fn: string, params: any) => Promise<{ data: any; error: any }>;
  functions: {
    invoke: (fn: string, options: { body: any }) => Promise<{ data: any; error: any }>;
  };
}

export interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auth: AccountSettingsAuthProps;
  supabase: SupabaseClientLike;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
  // Optional custom tabs
  customTabs?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
    showIf?: (auth: AccountSettingsAuthProps) => boolean;
  }>;
}
