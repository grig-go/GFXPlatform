import '@testing-library/jest-dom';

// Mock Supabase client from the shared package
vi.mock('@emergent-platform/supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  isDevUserConfigured: vi.fn().mockReturnValue(false),
  initializeAuth: vi.fn().mockResolvedValue(null),
  getCurrentUser: vi.fn().mockReturnValue(null),
  isAuthInitialized: vi.fn().mockReturnValue(true),
  waitForAuth: vi.fn().mockResolvedValue(null),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
