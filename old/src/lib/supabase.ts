import { createClient, User, Session } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Dev user credentials (for development only)
const devUserEmail = import.meta.env.VITE_DEV_USER_EMAIL;
const devUserPassword = import.meta.env.VITE_DEV_USER_PASSWORD;

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client (will be null if credentials are missing)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null as any; // Fallback to allow app to load, but DB operations will fail

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Check if dev user is configured
export function isDevUserConfigured(): boolean {
  return Boolean(devUserEmail && devUserPassword);
}

// Track auth state
let currentUser: User | null = null;
let authInitialized = false;
let authInitPromise: Promise<User | null> | null = null;

/**
 * Initialize authentication - auto-login with dev user in development
 * Call this once on app startup
 */
export async function initializeAuth(): Promise<User | null> {
  // Return existing promise if already initializing
  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping auth');
      authInitialized = true;
      return null;
    }

    try {
      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Existing session found:', session.user.email);
        currentUser = session.user;
        authInitialized = true;
        return session.user;
      }

      // No existing session - try dev user login
      if (isDevUserConfigured()) {
        console.log('🔐 Attempting dev user login...');
        
        // Try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: devUserEmail!,
          password: devUserPassword!,
        });

        if (error) {
          // If user doesn't exist, try to create it
          if (error.message.includes('Invalid login credentials')) {
            console.log('📝 Dev user not found, creating...');
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: devUserEmail!,
              password: devUserPassword!,
              options: {
                data: {
                  name: 'Development User',
                  role: 'admin',
                },
              },
            });

            if (signUpError) {
              console.error('Failed to create dev user:', signUpError.message);
            } else if (signUpData.user) {
              console.log('✅ Dev user created:', signUpData.user.email);
              
              // Sign in after signup (in case email confirmation is disabled)
              const { data: loginData } = await supabase.auth.signInWithPassword({
                email: devUserEmail!,
                password: devUserPassword!,
              });
              
              if (loginData.user) {
                currentUser = loginData.user;
                await ensureDevUserInDatabase(loginData.user);
              }
            }
          } else {
            console.error('Dev user login failed:', error.message);
          }
        } else if (data.user) {
          console.log('✅ Dev user logged in:', data.user.email);
          currentUser = data.user;
          await ensureDevUserInDatabase(data.user);
        }
      } else {
        console.log('ℹ️ No dev user configured, running in anonymous mode');
        console.log('   Add VITE_DEV_USER_EMAIL and VITE_DEV_USER_PASSWORD to .env for auth');
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    }

    authInitialized = true;
    return currentUser;
  })();

  return authInitPromise;
}

/**
 * Ensure the dev user exists in the users table and has an organization
 */
async function ensureDevUserInDatabase(user: User): Promise<void> {
  if (!supabase) return;

  try {
    // Check if user exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      console.error('Error checking user:', fetchError);
      return;
    }

    if (!existingUser) {
      // Get or create dev organization
      let orgId = '00000000-0000-0000-0000-000000000001'; // Default dev org

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .single();

      if (!org) {
        // Create dev organization
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            id: orgId,
            name: 'Nova Development',
            slug: 'nova-dev',
            settings: {},
          });

        if (orgError && !orgError.message.includes('duplicate')) {
          console.error('Error creating dev org:', orgError);
        }
      }

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Development User',
          organization_id: orgId,
          role: 'admin',
        });

      if (userError && !userError.message.includes('duplicate')) {
        console.error('Error creating user record:', userError);
      } else {
        console.log('✅ User record created in database');
      }
    }
  } catch (err) {
    console.error('Error ensuring user in database:', err);
  }
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Check if auth has been initialized
 */
export function isAuthInitialized(): boolean {
  return authInitialized;
}

/**
 * Wait for auth to be initialized
 */
export async function waitForAuth(): Promise<User | null> {
  if (authInitialized) {
    return currentUser;
  }
  return initializeAuth();
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
    currentUser = null;
  }
}

// Re-export types for convenience
export type { User, Session };
