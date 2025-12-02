import { supabase, getCurrentUser } from '../client';
import type { Project, Layer, Folder, Template } from '@emergent-platform/types';

/**
 * Get all projects for the current user's organization
 */
export async function getProjects(): Promise<Project[]> {
  if (!supabase) return [];

  const user = getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data;
}

/**
 * Create a new project
 */
export async function createProject(project: Partial<Project>): Promise<Project | null> {
  if (!supabase) return null;

  const user = getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...project,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data;
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return null;
  }

  return data;
}

/**
 * Archive a project (soft delete)
 */
export async function archiveProject(projectId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('projects')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (error) {
    console.error('Error archiving project:', error);
    return false;
  }

  return true;
}

/**
 * Delete a project permanently
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}

/**
 * Get all layers for a project
 */
export async function getProjectLayers(projectId: string): Promise<Layer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('layers')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching layers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all folders for a project
 */
export async function getProjectFolders(projectId: string): Promise<Folder[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all templates for a project
 */
export async function getProjectTemplates(projectId: string): Promise<Template[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('project_id', projectId)
    .eq('archived', false)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data || [];
}
