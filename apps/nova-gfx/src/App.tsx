import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Designer } from '@/components/designer/Designer';
import { Player } from '@/components/player/Player';
import { NovaPlayer } from '@/pages/NovaPlayer';
import { Preview } from '@/pages/Preview';
import { ProjectList } from '@/pages/ProjectList';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/components/settings';
import { PrivateRoute } from '@/components/auth';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmProvider } from '@/hooks/useConfirm';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize auth on app startup
    const init = async () => {
      await initialize();
      setAuthReady(true);
    };
    init();
  }, [initialize]);

  // Show loading while auth initializes
  if (!authReady) {
    return (
      <div className="dark absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Using absolute positioning to fill the fixed #root container */}
      <div className="dark absolute inset-0 overflow-hidden">
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

          {/* Settings routes */}
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/:tab"
            element={
              <PrivateRoute>
                <SettingsPage />
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
    </BrowserRouter>
  );
}
