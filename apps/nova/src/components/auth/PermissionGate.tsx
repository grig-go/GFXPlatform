/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions.
 * Useful for hiding UI elements that the user doesn't have access to.
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionKey } from '../../types/permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  // Single permission check
  permission?: PermissionKey;
  // Multiple permissions - user must have ANY of these (default)
  permissions?: PermissionKey[];
  // If true, user must have ALL permissions instead of any
  requireAll?: boolean;
  // Page-level permission check
  pageKey?: string;
  // Check for write access instead of read
  writeAccess?: boolean;
  // Require admin role
  adminOnly?: boolean;
  // Require superuser
  superuserOnly?: boolean;
  // Fallback to render when permission denied (default: nothing)
  fallback?: React.ReactNode;
  // If true, show fallback instead of hiding completely
  showFallback?: boolean;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  pageKey,
  writeAccess = false,
  adminOnly = false,
  superuserOnly = false,
  fallback = null,
  showFallback = false,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canReadPage,
    canWritePage,
    isAdmin,
    isSuperuser,
  } = usePermissions();

  // Check superuser requirement
  if (superuserOnly && !isSuperuser) {
    return showFallback ? <>{fallback}</> : null;
  }

  // Check admin requirement
  if (adminOnly && !isAdmin && !isSuperuser) {
    return showFallback ? <>{fallback}</> : null;
  }

  // Check page-level permission
  if (pageKey) {
    const hasPageAccess = writeAccess ? canWritePage(pageKey) : canReadPage(pageKey);
    if (!hasPageAccess) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return showFallback ? <>{fallback}</> : null;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasRequired = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequired) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // All checks passed
  return <>{children}</>;
}

// Hook version for conditional logic in components
export function usePermissionGate(options: Omit<PermissionGateProps, 'children' | 'fallback' | 'showFallback'>): boolean {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canReadPage,
    canWritePage,
    isAdmin,
    isSuperuser,
  } = usePermissions();

  const {
    permission,
    permissions,
    requireAll = false,
    pageKey,
    writeAccess = false,
    adminOnly = false,
    superuserOnly = false,
  } = options;

  // Check superuser requirement
  if (superuserOnly && !isSuperuser) {
    return false;
  }

  // Check admin requirement
  if (adminOnly && !isAdmin && !isSuperuser) {
    return false;
  }

  // Check page-level permission
  if (pageKey) {
    const hasPageAccess = writeAccess ? canWritePage(pageKey) : canReadPage(pageKey);
    if (!hasPageAccess) {
      return false;
    }
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return false;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasRequired = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequired) {
      return false;
    }
  }

  return true;
}
