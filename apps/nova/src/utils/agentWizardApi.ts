/**
 * Agent Wizard API Client
 *
 * Calls the agent-wizard edge function for all database operations,
 * bypassing client-side Supabase JS to avoid auth lock issues.
 */

import { getEdgeFunctionUrl, getSupabaseAnonKey } from './supabase/config';
import { cookieStorage, SHARED_AUTH_STORAGE_KEY } from '../lib/cookieStorage';

const TIMEOUT_MS = 30000; // 30 second timeout

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

/**
 * Make a request to the agent-wizard edge function
 */
async function apiCall<T = any>(
  action: string,
  body: Record<string, any> = {}
): Promise<ApiResponse<T>> {
  const url = getEdgeFunctionUrl(`agent-wizard/${action}`);
  const anonKey = getSupabaseAnonKey();

  // Get auth token from cookie storage
  let authToken: string | null = null;
  try {
    const storedSession = cookieStorage.getItem(SHARED_AUTH_STORAGE_KEY);
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      authToken = sessionData.access_token;
    }
  } catch (e) {
    console.warn('[AgentWizardApi] Failed to get auth token:', e);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`[AgentWizardApi] Calling ${action}...`);
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`[AgentWizardApi] ${action} completed in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}` };
    }

    return { data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { error: `Request timed out after ${TIMEOUT_MS}ms` };
    }

    console.error(`[AgentWizardApi] ${action} failed:`, error);
    return { error: error.message || 'Request failed' };
  }
}

/**
 * Check if a slug already exists
 */
export async function checkSlugExists(
  slug: string,
  excludeId?: string
): Promise<{ exists: boolean; error?: string }> {
  const result = await apiCall<{ exists: boolean; slug: string }>('check-slug', {
    slug,
    excludeId,
  });

  if (result.error) {
    return { exists: false, error: result.error };
  }

  return { exists: result.data?.exists ?? false };
}

/**
 * List data sources by category
 */
export async function listDataSources(
  categories?: string[]
): Promise<{ data: any[]; error?: string }> {
  const result = await apiCall<{ data: any[]; count: number }>('data-sources', {
    categories,
  });

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data?.data ?? [] };
}

/**
 * Save a data source (insert or update)
 */
export async function saveDataSource(
  source: {
    id?: string;
    isExisting?: boolean;
    name: string;
    type: string;
    category: string;
    active?: boolean;
    api_config?: any;
    database_config?: any;
    file_config?: any;
    rss_config?: any;
  }
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any; isNew: boolean }>('save-source', source);

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * Save an agent (endpoint + data sources)
 */
export async function saveAgent(
  agent: {
    id?: string;
    isEdit?: boolean;
    name: string;
    slug: string;
    description?: string;
    format: string;
    formatOptions?: any;
    environment?: string;
    autoStart?: boolean;
    generateDocs?: boolean;
    transforms?: any[];
    relationships?: any[];
    cache?: string;
    auth?: string;
    requiresAuth?: boolean;
    authConfig?: any;
    status?: string;
    dataSourceIds?: string[];
  }
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any; isEdit: boolean }>('save-agent', agent);

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * Delete an agent
 */
export async function deleteAgent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const result = await apiCall<{ success: boolean; id: string }>('delete-agent', { id });

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: result.data?.success ?? false };
}

/**
 * Get current user info
 */
export async function getUser(): Promise<{ userId?: string; error?: string }> {
  const result = await apiCall<{ userId: string | null; authenticated: boolean }>('get-user');

  if (result.error) {
    return { error: result.error };
  }

  return { userId: result.data?.userId || undefined };
}

/**
 * List sports leagues
 */
export async function listLeagues(): Promise<{ data: any[]; error?: string }> {
  const result = await apiCall<{ data: any[] }>('list-leagues');

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data?.data ?? [] };
}

/**
 * List seasons for a league
 */
export async function listSeasons(
  leagueId: string
): Promise<{ data: any[]; error?: string }> {
  const result = await apiCall<{ data: any[] }>('list-seasons', { leagueId });

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data?.data ?? [] };
}

/**
 * List all current seasons (across all leagues)
 */
export async function listCurrentSeasons(): Promise<{ data: any[]; error?: string }> {
  const result = await apiCall<{ data: any[] }>('list-current-seasons');

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data?.data ?? [] };
}

/**
 * Delete a data source
 */
export async function deleteDataSource(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const result = await apiCall<{ success: boolean; id: string }>('delete-source', { id });

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: result.data?.success ?? false };
}

/**
 * Get a data source by ID
 */
export async function getDataSource(
  id: string
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any }>('get-source', { id });

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * List all agents with their data sources
 */
export async function listAgents(): Promise<{ data: any[]; error?: string }> {
  const result = await apiCall<{ data: any[] }>('list-agents');

  if (result.error) {
    return { data: [], error: result.error };
  }

  return { data: result.data?.data ?? [] };
}

/**
 * Get a single agent by ID with full data
 */
export async function getAgent(
  id: string
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any }>('get-agent', { id });

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * Duplicate an agent
 */
export async function duplicateAgent(
  id: string
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any }>('duplicate-agent', { id });

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * Toggle agent active status
 */
export async function toggleAgentStatus(
  id: string,
  active: boolean
): Promise<{ data?: any; error?: string }> {
  const result = await apiCall<{ data: any }>('toggle-agent-status', { id, active });

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data?.data };
}

/**
 * Cleanup unused Nova data sources
 */
export async function cleanupNovaSources(): Promise<{ cleaned: number; message?: string; error?: string }> {
  const result = await apiCall<{ cleaned: number; message: string }>('cleanup-nova-sources');

  if (result.error) {
    return { cleaned: 0, error: result.error };
  }

  return { cleaned: result.data?.cleaned ?? 0, message: result.data?.message };
}
