import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Designer } from '@/components/designer/Designer';
import { Player } from '@/components/player/Player';
import { Preview } from '@/pages/Preview';
import { ProjectList } from '@/pages/ProjectList';
import { initializeAuth, isSupabaseConfigured } from '@/lib/supabase';

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Initialize auth on app startup
    const init = async () => {
      if (isSupabaseConfigured()) {
        await initializeAuth();
      }
      setAuthReady(true);
    };
    init();
  }, []);

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
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:projectId" element={<Designer />} />
          <Route path="/preview" element={<Preview />} />
          {/* Player routes - can use project slug or ID */}
          <Route path="/play/:projectSlug" element={<Player />} />
          <Route path="/play/:orgSlug/:projectSlug" element={<Player />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
