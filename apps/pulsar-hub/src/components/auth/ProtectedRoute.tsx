/**
 * Protected Route Component
 *
 * Wraps components that require authentication or specific permissions.
 * Handles loading states, authentication checks, and permission verification.
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { LoginPage } from './LoginPage';
import { SignUpPage } from './SignUpPage';
import { SystemLocked } from './SystemLocked';
import type { PermissionKey } from '../../types/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  appName?: 'Nova' | 'Pulsar';
  // Optional: Require specific permission(s) to access
  requiredPermission?: PermissionKey;
  requiredPermissions?: PermissionKey[];
  requireAll?: boolean; // If true, user must have ALL permissions. Default: any
  // Optional: Custom fallback when permission denied
  fallback?: React.ReactNode;
  // Optional: Page key for page-level permission check
  pageKey?: string;
}

export function ProtectedRoute({
  children,
  appName = 'Pulsar',
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  pageKey,
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, systemLocked } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canReadPage,
  } = usePermissions();

  // Track auth view (login or signup)
  const [authView, setAuthView] = useState<'login' | 'signup'>(() => {
    // Check URL for signup route or invite token
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (path === '/signup' || urlParams.has('invite')) {
      return 'signup';
    }
    return 'login';
  });

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show system locked screen if no superuser exists
  if (systemLocked) {
    return <SystemLocked appName={appName} />;
  }

  // Show login or signup if not authenticated
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return (
        <SignUpPage
          appName={appName}
          onNavigateToLogin={() => setAuthView('login')}
          onSignUpSuccess={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onNavigateToSignUp={() => setAuthView('signup')}
      />
    );
  }

  // Check page-level permission
  if (pageKey && !canReadPage(pageKey)) {
    return fallback || <PermissionDenied />;
  }

  // Check specific permission(s) if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || <PermissionDenied />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequired = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequired) {
      return fallback || <PermissionDenied />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Permission denied fallback component
function PermissionDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

// Higher-order component version for class components or alternative usage
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
