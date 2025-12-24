/**
 * User Permissions System Types for Pulsar
 *
 * Defines all types for the user authentication and permission system.
 * Shared structure with Nova for SSO compatibility.
 */

// User status enum
export type UserStatus = 'active' | 'pending' | 'inactive';

// Organization role enum
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

// Application keys
export type AppKey = 'system' | 'nova' | 'pulsar';

// Organization structure
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  allowed_domains?: string[];
  created_at: string;
  updated_at: string;
}

// Permission structure from database
export interface Permission {
  id: string;
  app_key: AppKey;
  resource: string;
  action: 'read' | 'write' | 'admin';
  description: string | null;
}

// Helper to construct permission key from database fields
export function getPermissionKey(permission: Permission): string {
  return `${permission.app_key}.${permission.resource}.${permission.action}`;
}

// Helper to get display name from permission
export function getPermissionDisplayName(permission: Permission): string {
  const resourceTitle = permission.resource.charAt(0).toUpperCase() + permission.resource.slice(1);
  const actionTitle = permission.action.charAt(0).toUpperCase() + permission.action.slice(1);
  return `${resourceTitle} ${actionTitle}`;
}

// Group structure
export interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Group with permissions (for display)
export interface GroupWithPermissions extends Group {
  permissions: string[]; // Permission keys
  memberCount?: number;
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
  created_at: string;
  updated_at: string;
}

// User with their computed permissions
export interface AppUserWithPermissions extends AppUser {
  groups: Group[];
  permissions: string[]; // All permission keys (from groups + direct)
  directPermissions: string[]; // Only directly assigned permission keys
}

// Channel access for Pulsar
export interface ChannelAccess {
  id: string;
  user_id: string;
  channel_id: string;
  can_write: boolean;
  created_at: string;
}

// Page settings
export interface PageSetting {
  id: string;
  app_key: AppKey;
  page_key: string;
  page_name: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  app_key: AppKey;
  action: 'create' | 'update' | 'delete';
  resource_type: string;
  resource_id: string;
  resource_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// User organization membership
export interface UserOrganization {
  organization: Organization;
  role: OrgRole;
}

// Auth context state
export interface AuthState {
  user: AppUserWithPermissions | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAdmin: boolean;
  isPending: boolean;
  systemLocked: boolean; // True if no superuser exists
  // Organization support
  organization: Organization | null; // User's actual organization
  impersonatedOrganization: Organization | null; // Organization being impersonated (superuser only)
  effectiveOrganization: Organization | null; // The org to use for queries (impersonated or actual)
}

// Permission check options
export interface PermissionCheckOptions {
  requireAll?: boolean; // If true, user must have ALL permissions. Default: any
}

// System-level permissions
export const SYSTEM_PERMISSIONS = {
  MANAGE_USERS: 'system.manage_users',
  MANAGE_GROUPS: 'system.manage_groups',
  MANAGE_PERMISSIONS: 'system.manage_permissions',
  VIEW_AUDIT_LOG: 'system.view_audit_log',
  MANAGE_APPS: 'system.manage_apps',
  MANAGE_CHANNELS: 'system.manage_channels',
  MANAGE_AI_CONNECTIONS: 'system.manage_ai_connections',
  MANAGE_PAGE_VISIBILITY: 'system.manage_page_visibility',
  MANAGE_DASHBOARD_CONFIG: 'system.manage_dashboard_config',
  VIEW_ALL_DATA: 'system.view_all_data',
} as const;

// Pulsar permissions
export const PULSAR_PERMISSIONS = {
  // Channel Playlists (write is per-channel via channel_access)
  CHANNEL_PLAYLISTS_READ: 'pulsar.channel_playlists.read',
  CHANNEL_PLAYLISTS_WRITE: 'pulsar.channel_playlists.write',
  // Graphics
  GRAPHICS_READ: 'pulsar.graphics.read',
  GRAPHICS_WRITE: 'pulsar.graphics.write',
  // Tickers
  TICKERS_READ: 'pulsar.tickers.read',
  TICKERS_WRITE: 'pulsar.tickers.write',
  // Banners
  BANNERS_READ: 'pulsar.banners.read',
  BANNERS_WRITE: 'pulsar.banners.write',
  // Alerts
  ALERTS_READ: 'pulsar.alerts.read',
  ALERTS_WRITE: 'pulsar.alerts.write',
  // Rundowns
  RUNDOWNS_READ: 'pulsar.rundowns.read',
  RUNDOWNS_WRITE: 'pulsar.rundowns.write',
  // Templates
  TEMPLATES_READ: 'pulsar.templates.read',
  TEMPLATES_WRITE: 'pulsar.templates.write',
  // Outputs
  OUTPUTS_READ: 'pulsar.outputs.read',
  OUTPUTS_WRITE: 'pulsar.outputs.write',
  // Preview
  PREVIEW_READ: 'pulsar.preview.read',
  PREVIEW_WRITE: 'pulsar.preview.write',
  // Settings
  SETTINGS_READ: 'pulsar.settings.read',
  SETTINGS_WRITE: 'pulsar.settings.write',
} as const;

// All permissions combined
export const ALL_PERMISSIONS = {
  ...SYSTEM_PERMISSIONS,
  ...PULSAR_PERMISSIONS,
} as const;

// Permission key type
export type PermissionKey = typeof ALL_PERMISSIONS[keyof typeof ALL_PERMISSIONS];

// Pulsar page keys
export type PulsarPageKey =
  | 'channel_playlists'
  | 'graphics'
  | 'tickers'
  | 'banners'
  | 'alerts'
  | 'rundowns'
  | 'templates'
  | 'outputs'
  | 'preview'
  | 'settings'
  | 'users_groups'
  | 'channels';

// Map of page keys to their required read permissions
export const PAGE_READ_PERMISSIONS: Record<string, PermissionKey> = {
  channel_playlists: PULSAR_PERMISSIONS.CHANNEL_PLAYLISTS_READ,
  graphics: PULSAR_PERMISSIONS.GRAPHICS_READ,
  tickers: PULSAR_PERMISSIONS.TICKERS_READ,
  banners: PULSAR_PERMISSIONS.BANNERS_READ,
  alerts: PULSAR_PERMISSIONS.ALERTS_READ,
  rundowns: PULSAR_PERMISSIONS.RUNDOWNS_READ,
  templates: PULSAR_PERMISSIONS.TEMPLATES_READ,
  outputs: PULSAR_PERMISSIONS.OUTPUTS_READ,
  preview: PULSAR_PERMISSIONS.PREVIEW_READ,
  settings: PULSAR_PERMISSIONS.SETTINGS_READ,
};

// Map of page keys to their required write permissions
export const PAGE_WRITE_PERMISSIONS: Record<string, PermissionKey> = {
  channel_playlists: PULSAR_PERMISSIONS.CHANNEL_PLAYLISTS_WRITE,
  graphics: PULSAR_PERMISSIONS.GRAPHICS_WRITE,
  tickers: PULSAR_PERMISSIONS.TICKERS_WRITE,
  banners: PULSAR_PERMISSIONS.BANNERS_WRITE,
  alerts: PULSAR_PERMISSIONS.ALERTS_WRITE,
  rundowns: PULSAR_PERMISSIONS.RUNDOWNS_WRITE,
  templates: PULSAR_PERMISSIONS.TEMPLATES_WRITE,
  outputs: PULSAR_PERMISSIONS.OUTPUTS_WRITE,
  preview: PULSAR_PERMISSIONS.PREVIEW_WRITE,
  settings: PULSAR_PERMISSIONS.SETTINGS_WRITE,
};
