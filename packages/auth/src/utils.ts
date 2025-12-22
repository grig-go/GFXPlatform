// Auth utility functions

/**
 * Check if email is from emergent.new domain
 */
export const isEmergentEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@emergent.new');
};

/**
 * Check if role has admin privileges (owner or admin)
 */
export const hasAdminRole = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

/**
 * Allowed email domains for signup without invitation
 */
const ALLOWED_DOMAINS = ['emergent.new'];

/**
 * Check if email can sign up without an invitation
 */
export const canSignUpWithoutInvite = (email: string, isDevMode: boolean): boolean => {
  if (isDevMode) {
    return true;
  }
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

/**
 * Timeout helper for async operations - rejects on timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Timeout helper that resolves to null instead of rejecting
 */
export function withTimeoutNull<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<T | null>((resolve) =>
      setTimeout(() => resolve(null), ms)
    ),
  ]);
}

/**
 * Fetch with timeout helper
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 5000
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      console.warn('Auth request timed out');
    }
    return null;
  }
}
