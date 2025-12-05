// Client and auth
export {
  supabase,
  isSupabaseConfigured,
  isDevUserConfigured,
  initializeAuth,
  getCurrentUser,
  isAuthInitialized,
  waitForAuth,
  signOut,
} from './client';

export type { User, Session } from './client';

// Queries
export * from './queries';
