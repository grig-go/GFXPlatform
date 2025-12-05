import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/components/settings';
import { PrivateRoute } from '@/components/auth';

export function Router() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes with layout */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        {/* Default redirect to templates */}
        <Route index element={<Navigate to="/templates" replace />} />

        {/* Templates page - templates on left, playlists on right */}
        <Route path="templates" element={<TemplatesPage />} />

        {/* Pages/workspace - pages on left, playlists on right */}
        <Route path="workspace" element={<WorkspacePage />} />

        {/* Custom UI builder */}
        <Route path="custom-ui" element={<div className="h-full flex items-center justify-center text-muted-foreground">Custom UI Builder - Coming Soon</div>} />
        <Route path="custom-ui/:id" element={<div className="h-full flex items-center justify-center text-muted-foreground">Custom UI Editor - Coming Soon</div>} />
      </Route>

      {/* Settings routes (outside main layout) */}
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

      {/* Catch all - redirect to workspace */}
      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  );
}
