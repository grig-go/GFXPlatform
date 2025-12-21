// services/projectService.ts
// Service for project CRUD operations via Supabase RPC

import { supabase } from '../../lib/supabase';
import type { Project, CreateProjectParams, UpdateProjectParams } from '../../types/project';

/**
 * Fetch all projects
 */
export async function getProjects(): Promise<{ success: boolean; data?: Project[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('pulsarvs_get_projects');
    
    if (error) {
      console.error('Error fetching projects:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to fetch projects' };
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error in getProjects:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch the currently active project with full details
 */
export async function getActiveProject(): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('pulsarvs_get_active_project');
    
    if (error) {
      console.error('Error fetching active project:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'No active project' };
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
    const { data, error } = await supabase.rpc('pulsarvs_create_project', {
      p_name: params.name,
      p_description: params.description || null,
      p_default_channel_id: params.default_channel_id || null,
      p_default_instance_id: params.default_instance_id || null,
      p_color: params.color || 'blue',
      p_icon: params.icon || '📁',
      p_settings: params.settings || {}
    });
    
    if (error) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to create project' };
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
    const { data, error } = await supabase.rpc('pulsarvs_update_project', {
      p_id: params.id,
      p_name: params.name || null,
      p_description: params.description || null,
      p_default_channel_id: params.default_channel_id || null,
      p_default_instance_id: params.default_instance_id || null,
      p_color: params.color || null,
      p_icon: params.icon || null,
      p_settings: params.settings || null
    });
    
    if (error) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to update project' };
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
    const { data, error } = await supabase.rpc('pulsarvs_set_active_project', {
      p_id: projectId
    });
    
    if (error) {
      console.error('Error setting active project:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to set active project' };
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
    const { data, error } = await supabase.rpc('pulsarvs_delete_project', {
      p_id: projectId
    });
    
    if (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to delete project' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteProject:', error);
    return { success: false, error: String(error) };
  }
}
