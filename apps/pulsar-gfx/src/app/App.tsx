import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Router } from './Router';
import { useProjectStore } from '@/stores/projectStore';
import { useChannelStore } from '@/stores/channelStore';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { Loader2 } from 'lucide-react';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Track if this effect was cleaned up (for StrictMode)
    let cancelled = false;
    let unsubscribeChannelStatus: (() => void) | null = null;

    async function init() {
      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            setError('Supabase is not configured. Check your environment variables.');
            setIsInitialized(true);
          }
          return;
        }

        // Initialize authentication first
        console.log('Initializing auth...');
        await useAuthStore.getState().initialize();
        if (cancelled) return;
        console.log('Auth initialized');

        // Load user preferences BEFORE loading projects/channels
        // Call directly on the store to ensure we use the singleton's loadingPromise
        console.log('Loading user preferences...');
        await useUIPreferencesStore.getState().loadPreferences();
        if (cancelled) return;
        console.log('Preferences loaded, state:', {
          lastProjectId: useUIPreferencesStore.getState().lastProjectId,
          isLoaded: useUIPreferencesStore.getState().isLoaded,
        });

        // Then load initial data
        console.log('Loading projects and channels...');
        await Promise.all([
          useProjectStore.getState().loadProjects(),
          useChannelStore.getState().loadChannels(),
        ]);
        if (cancelled) return;
        console.log('Data loaded');

        // Subscribe to channel status changes (player online/offline)
        // This resets page on-air states when channels go offline
        unsubscribeChannelStatus = useChannelStore.getState().subscribeToChannelStatus();
        console.log('Subscribed to channel status updates');

        // Check for project ID in URL query params (for "Open in Pulsar" from Nova)
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('project');

        // Restore last project from preferences
        const prefs = useUIPreferencesStore.getState();
        const projects = useProjectStore.getState().projects;
        console.log('Restoring project:', {
          projectIdFromUrl,
          lastProjectId: prefs.lastProjectId,
          projectsCount: projects.length,
        });

        // Priority: URL param > saved preference > first project
        if (projectIdFromUrl) {
          const urlProject = projects.find(p => p.id === projectIdFromUrl);
          if (urlProject) {
            console.log('Selecting project from URL:', urlProject.name);
            await useProjectStore.getState().selectProject(projectIdFromUrl);
            prefs.setLastProjectId(projectIdFromUrl);
            // Clean up URL by removing the query param
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            console.warn('Project from URL not found:', projectIdFromUrl);
          }
        } else if (prefs.lastProjectId) {
          const savedProject = projects.find(p => p.id === prefs.lastProjectId);
          if (savedProject) {
            console.log('Selecting saved project:', savedProject.name);
            await useProjectStore.getState().selectProject(prefs.lastProjectId);
          } else if (projects.length > 0) {
            console.log('Saved project not found, selecting first project:', projects[0].name);
            await useProjectStore.getState().selectProject(projects[0].id);
            prefs.setLastProjectId(projects[0].id);
          }
        } else if (projects.length > 0) {
          console.log('No saved project, selecting first project:', projects[0].name);
          await useProjectStore.getState().selectProject(projects[0].id);
          prefs.setLastProjectId(projects[0].id);
        }
        if (cancelled) return;

        setIsInitialized(true);
      } catch (err) {
        console.error('App initialization error:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize app');
          setIsInitialized(true);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (unsubscribeChannelStatus) {
        unsubscribeChannelStatus();
      }
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing Pulsar GFX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Initialization Error</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider />
      <AppInitializer>
        <Router />
      </AppInitializer>
    </BrowserRouter>
  );
}
