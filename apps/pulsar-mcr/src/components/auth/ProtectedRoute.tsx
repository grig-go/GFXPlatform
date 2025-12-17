/**
 * Protected Route Component for Pulsar
 *
 * Wraps components that require authentication or specific permissions.
 * Handles loading states, authentication checks, and permission verification.
 */

import React from 'react';
import { Spinner, SpinnerSize } from '@blueprintjs/core';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { LoginPage } from './LoginPage';
import { SystemLocked } from './SystemLocked';
import type { PermissionKey } from '../../types/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Optional: Require specific permission(s) to access
  requiredPermission?: PermissionKey;
  requiredPermissions?: PermissionKey[];
  requireAll?: boolean; // If true, user must have ALL permissions. Default: any
  // Optional: Custom fallback when permission denied
  fallback?: React.ReactNode;
  // Optional: Page key for page-level permission check
  pageKey?: string;
  // Optional: Channel ID for channel-level write check
  channelId?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  pageKey,
  channelId,
}) => {
  const { isLoading, isAuthenticated, systemLocked } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canReadPage,
    canWriteChannel,
  } = usePermissions();

  // Track if we've ever been authenticated to prevent flicker during state updates
  const wasAuthenticatedRef = React.useRef(false);
  const [showLoginOverride, setShowLoginOverride] = React.useState(false);

  // Update ref when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      setShowLoginOverride(false);
    }
  }, [isAuthenticated]);

  // If we were authenticated but now not, wait a bit before showing login
  // This prevents flicker during transient state changes
  React.useEffect(() => {
    if (!isAuthenticated && wasAuthenticatedRef.current && !showLoginOverride) {
      console.log('[ProtectedRoute] Was authenticated but isAuthenticated is now false - waiting before showing login');
      const timeout = setTimeout(() => {
        // After timeout, if still not authenticated, show login
        console.log('[ProtectedRoute] Timeout reached - showing login page');
        setShowLoginOverride(true);
      }, 2000); // Wait 2 seconds before showing login

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, showLoginOverride]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary, #1c2127)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Spinner size={SpinnerSize.LARGE} />
          <p style={{ color: 'var(--text-secondary, #a7b6c2)', marginTop: '15px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show system locked screen if no superuser exists
  if (systemLocked) {
    return <SystemLocked />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    // If we were previously authenticated and timeout hasn't elapsed, show loading
    if (wasAuthenticatedRef.current && !showLoginOverride) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary, #1c2127)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Spinner size={SpinnerSize.LARGE} />
            <p style={{ color: 'var(--text-secondary, #a7b6c2)', marginTop: '15px' }}>Loading...</p>
          </div>
        </div>
      );
    }
    console.log('[ProtectedRoute] Not authenticated - showing login page');
    return <LoginPage />;
  }

  // Check page-level permission
  if (pageKey && !canReadPage(pageKey)) {
    return fallback ? <>{fallback}</> : <PermissionDenied />;
  }

  // Check channel-level write permission
  if (channelId && !canWriteChannel(channelId)) {
    return fallback ? <>{fallback}</> : <PermissionDenied />;
  }

  // Check specific permission(s) if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback ? <>{fallback}</> : <PermissionDenied />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequired = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequired) {
      return fallback ? <>{fallback}</> : <PermissionDenied />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Permission denied fallback component
const PermissionDenied: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#1c2127',
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(219, 55, 55, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <span style={{ fontSize: '40px' }}>🚫</span>
        </div>
        <h2 style={{ color: '#f5f8fa', marginBottom: '10px' }}>Access Denied</h2>
        <p style={{ color: '#a7b6c2' }}>
          You don't have permission to access this page. Contact your administrator if you believe
          this is an error.
        </p>
      </div>
    </div>
  );
};

export default ProtectedRoute;
