// services/projectService.ts
// Service for project CRUD operations via Supabase Edge Functions

import { supabase, getEdgeFunctionUrl } from '../../lib/supabase';
import type { Project, CreateProjectParams, UpdateProjectParams } from '../../types/project';

// Edge function URL for PulsarVS projects
const PROJECTS_EDGE_FN = () => {
  const url = getEdgeFunctionUrl('pulsarvs-projects');
  console.log('[projectService] PROJECTS_EDGE_FN called, URL:', url);
  return url;
};

/**
 * Helper to get auth headers for edge function calls
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('[projectService] getAuthHeaders - session:', session?.user?.email, 'error:', error?.message);
  console.log('[projectService] getAuthHeaders - access_token exists:', !!session?.access_token);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
}

/**
 * Fetch all projects
 */
export async function getProjects(): Promise<{ success: boolean; data?: Project[]; error?: string }> {
  try {
    const url = PROJECTS_EDGE_FN();
    console.log('[projectService] getProjects - URL:', url);

    const headers = await getAuthHeaders();
    console.log('[projectService] getProjects - headers:', JSON.stringify(headers));

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('[projectService] getProjects - response status:', response.status, response.statusText);

    const data = await response.json();
    console.log('[projectService] getProjects - response data:', JSON.stringify(data));

    if (!response.ok || !data.success) {
      console.error('[projectService] Error fetching projects:', data.error);
      return { success: false, error: data.error || 'Failed to fetch projects' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('[projectService] Error in getProjects:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch a specific project by ID
 */
export async function getProject(projectId: string): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}?id=${projectId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error fetching project:', data.error);
      return { success: false, error: data.error || 'Failed to fetch project' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in getProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch the currently active project with full details
 */
export async function getActiveProject(): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}?active=true`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error fetching active project:', data.error);
      return { success: false, error: data.error || 'No active project' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in getActiveProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create a new project
 */
export async function createProject(params: CreateProjectParams): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: params.name,
        description: params.description || null,
        default_channel_id: params.default_channel_id || null,
        default_instance_id: params.default_instance_id || null,
        color: params.color || 'blue',
        icon: params.icon || '📁',
        settings: params.settings || {},
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error creating project:', data.error);
      return { success: false, error: data.error || 'Failed to create project' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in createProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(params: UpdateProjectParams): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: params.id,
        name: params.name || undefined,
        description: params.description || undefined,
        default_channel_id: params.default_channel_id || undefined,
        default_instance_id: params.default_instance_id || undefined,
        color: params.color || undefined,
        icon: params.icon || undefined,
        settings: params.settings || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error updating project:', data.error);
      return { success: false, error: data.error || 'Failed to update project' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in updateProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Set a project as active (deactivates others)
 */
export async function setActiveProject(projectId: string): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: projectId,
        action: 'setActive',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error setting active project:', data.error);
      return { success: false, error: data.error || 'Failed to set active project' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in setActiveProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}?id=${projectId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error deleting project:', data.error);
      return { success: false, error: data.error || 'Failed to delete project' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteProject:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Batch delete multiple projects
 */
export async function deleteProjects(projectIds: string[]): Promise<{ success: boolean; deleted_count?: number; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${PROJECTS_EDGE_FN()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        action: 'delete',
        ids: projectIds,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Error batch deleting projects:', data.error);
      return { success: false, error: data.error || 'Failed to delete projects' };
    }

    return { success: true, deleted_count: data.deleted_count };
  } catch (error) {
    console.error('Error in deleteProjects:', error);
    return { success: false, error: String(error) };
  }
}
