import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Designer } from '@/components/designer/Designer';
import { Player } from '@/components/player/Player';
import { NovaPlayer } from '@/pages/NovaPlayer';
import { Preview } from '@/pages/Preview';
import { ProjectList } from '@/pages/ProjectList';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { PrivateRoute } from '@/components/auth';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, applyTheme } from '@/stores/themeStore';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { initializeMapboxKey } from '@/stores/mapboxStore';

// Apply initial theme from localStorage before React renders to prevent flash
const storedTheme = localStorage.getItem('nova-theme-preference');
if (storedTheme) {
  try {
    const parsed = JSON.parse(storedTheme);
    const theme = parsed.state?.theme || 'dark';
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.add(resolved);
  } catch {
    document.documentElement.classList.add('dark');
  }
} else {
  document.documentElement.classList.add('dark');
}

// Routes that don't require auth initialization
const PUBLIC_ROUTES = ['/preview', '/play', '/player'];

function AppContent() {
  const location = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  // Check if current path is a public route that doesn't need auth
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    // Pre-fetch Mapbox API key from backend (non-blocking)
    initializeMapboxKey().catch((err) => {
      console.warn('[App] Failed to pre-fetch Mapbox key:', err);
    });

    // Skip auth initialization for public routes
    if (isPublicRoute) {
      setAuthReady(true);
      return;
    }

    // Initialize auth on app startup
    const init = async () => {
      await initialize();
      setAuthReady(true);
    };
    init();
  }, [initialize, isPublicRoute]);

  // Show loading while auth initializes (only for non-public routes)
  if (!authReady && !isPublicRoute) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-sm">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Global confirm dialog */}
      <ConfirmProvider />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectList />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <PrivateRoute>
              <Designer />
            </PrivateRoute>
          }
        />

        {/* Public player routes (for OBS/broadcast) */}
        <Route path="/preview" element={<Preview />} />
        <Route path="/play/:projectSlug" element={<Player />} />
        <Route path="/play/:orgSlug/:projectSlug" element={<Player />} />
        <Route path="/player/:channelId" element={<NovaPlayer />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
