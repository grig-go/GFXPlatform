import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireEmergent?: boolean;
}

export function PrivateRoute({ children, requireEmergent = false }: PrivateRouteProps) {
  const location = useLocation();
  const { user, isLoading, isInitialized } = useAuthStore();

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Requires emergent.new user but isn't one
  if (requireEmergent && !user.isEmergentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
