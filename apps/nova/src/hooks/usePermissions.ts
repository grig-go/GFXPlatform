/**
 * usePermissions Hook
 *
 * Provides permission checking utilities for the current user.
 * Used for frontend enforcement of permissions.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PermissionKey,
  PAGE_READ_PERMISSIONS,
  PAGE_WRITE_PERMISSIONS,
  SYSTEM_PERMISSIONS,
  PermissionCheckOptions,
} from '../types/permissions';

interface UsePermissionsReturn {
  // Check if user has a specific permission
  hasPermission: (permission: PermissionKey, options?: PermissionCheckOptions) => boolean;

  // Check if user has any of the given permissions
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;

  // Check if user has all of the given permissions
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;

  // Check if user can read a specific page
  canReadPage: (pageKey: string) => boolean;

  // Check if user can write to a specific page
  canWritePage: (pageKey: string) => boolean;

  // Check if user can write to a specific channel (Pulsar)
  canWriteChannel: (channelId: string) => boolean;

  // Check if user is admin (can manage users)
  isAdmin: boolean;

  // Check if user is superuser
  isSuperuser: boolean;

  // Check if user is pending (read-only)
  isPending: boolean;

  // Check if user is active
  isActive: boolean;

  // Get all user permissions
  permissions: string[];

  // Check if system is locked
  systemLocked: boolean;

  // Loading state
  isLoading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const {
    user,
    isSuperuser,
    isAdmin,
    isPending,
    systemLocked,
    isLoading,
    channelAccess,
  } = useAuth();

  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  const isActive = useMemo(() => {
    return user?.status === 'active';
  }, [user?.status]);

  // Check if user has a specific permission
  const hasPermission = useCallback((
    permission: PermissionKey,
    options?: PermissionCheckOptions
  ): boolean => {
    // Superusers have all permissions
    if (isSuperuser) return true;

    // Not authenticated or inactive users have no permissions
    if (!user || user.status === 'inactive') return false;

    // Pending users only get read permissions
    if (isPending && permission.endsWith('.write')) {
      return false;
    }

    // Check wildcard (superuser indicator)
    if (permissions.includes('*')) return true;

    // Check specific permission
    return permissions.includes(permission);
  }, [user, isSuperuser, isPending, permissions]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((perms: PermissionKey[]): boolean => {
    if (isSuperuser) return true;
    return perms.some(p => hasPermission(p));
  }, [isSuperuser, hasPermission]);

  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((perms: PermissionKey[]): boolean => {
    if (isSuperuser) return true;
    return perms.every(p => hasPermission(p));
  }, [isSuperuser, hasPermission]);

  // Check if user can read a specific page
  const canReadPage = useCallback((pageKey: string): boolean => {
    // Superusers can read everything
    if (isSuperuser) return true;

    // System pages require specific permissions
    if (pageKey === 'users_groups' || pageKey === 'ai_connections' || pageKey === 'channels') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.VIEW_ALL_DATA as PermissionKey);
    }

    if (pageKey === 'dashboard_config') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.MANAGE_DASHBOARD_CONFIG as PermissionKey);
    }

    // Get required permission for this page
    const requiredPermission = PAGE_READ_PERMISSIONS[pageKey];
    if (!requiredPermission) {
      // No permission required for this page
      return true;
    }

    return hasPermission(requiredPermission);
  }, [isSuperuser, isAdmin, hasPermission]);

  // Check if user can write to a specific page
  const canWritePage = useCallback((pageKey: string): boolean => {
    // Superusers can write everywhere
    if (isSuperuser) return true;

    // Pending users cannot write
    if (isPending) return false;

    // Inactive users cannot write
    if (user?.status === 'inactive') return false;

    // System pages require admin
    if (pageKey === 'users_groups') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.MANAGE_USERS as PermissionKey);
    }

    if (pageKey === 'ai_connections') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.MANAGE_AI_CONNECTIONS as PermissionKey);
    }

    if (pageKey === 'channels') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.MANAGE_CHANNELS as PermissionKey);
    }

    if (pageKey === 'dashboard_config') {
      return isAdmin || hasPermission(SYSTEM_PERMISSIONS.MANAGE_DASHBOARD_CONFIG as PermissionKey);
    }

    // Get required permission for this page
    const requiredPermission = PAGE_WRITE_PERMISSIONS[pageKey];
    if (!requiredPermission) {
      // No permission required for this page - allow if authenticated
      return !!user;
    }

    return hasPermission(requiredPermission);
  }, [isSuperuser, isPending, user, isAdmin, hasPermission]);

  // Check if user can write to a specific channel (Pulsar)
  const canWriteChannel = useCallback((channelId: string): boolean => {
    // Superusers can write to all channels
    if (isSuperuser) return true;

    // Pending users cannot write
    if (isPending) return false;

    // Check channel-specific access
    const access = channelAccess.find(ca => ca.channel_id === channelId);
    return access?.can_write ?? false;
  }, [isSuperuser, isPending, channelAccess]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canReadPage,
    canWritePage,
    canWriteChannel,
    isAdmin,
    isSuperuser,
    isPending,
    isActive,
    permissions,
    systemLocked,
    isLoading,
  };
}

// Utility hook for checking a single permission
export function useHasPermission(permission: PermissionKey): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

// Utility hook for checking page read access
export function useCanReadPage(pageKey: string): boolean {
  const { canReadPage } = usePermissions();
  return canReadPage(pageKey);
}

// Utility hook for checking page write access
export function useCanWritePage(pageKey: string): boolean {
  const { canWritePage } = usePermissions();
  return canWritePage(pageKey);
}
