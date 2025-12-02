import { User, Session } from '@supabase/supabase-js';
export declare const supabase: any;
export declare function isSupabaseConfigured(): boolean;
export declare function isDevUserConfigured(): boolean;
/**
 * Initialize authentication - auto-login with dev user in development
 * Call this once on app startup
 */
export declare function initializeAuth(): Promise<User | null>;
/**
 * Get the current authenticated user
 */
export declare function getCurrentUser(): User | null;
/**
 * Check if auth has been initialized
 */
export declare function isAuthInitialized(): boolean;
/**
 * Wait for auth to be initialized
 */
export declare function waitForAuth(): Promise<User | null>;
/**
 * Sign out the current user
 */
export declare function signOut(): Promise<void>;
export type { User, Session };
//# sourceMappingURL=client.d.ts.map