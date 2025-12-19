/**
 * GFX Project Service
 * Handles all CRUD operations for gfx_projects stored in the GFX Supabase instance.
 */

import { gfxRestSelect, gfxRestInsert, gfxRestUpdate } from '../utils/supabase/gfxConfig';

// Types from @emergent-platform/types
export interface Project {
  id: string;
  organization_id: string;
  created_by: string | null;
  updated_by?: string | null;
  name: string;
  description: string | null;
  slug: string;
  custom_url_slug: string | null;
  canvas_width: number;
  canvas_height: number;
  frame_rate: number;
  background_color: string;
  api_key: string;
  api_enabled: boolean;
  is_live: boolean;
  archived: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  interactive_enabled?: boolean;
}

export interface Layer {
  id: string;
  project_id: string;
  name: string;
  layer_type: string;
  z_index: number;
  position_anchor: string;
  position_offset_x: number;
  position_offset_y: number;
  width: number;
  height: number;
  auto_out: boolean;
  allow_multiple: boolean;
  transition_in: string;
  transition_in_duration: number;
  transition_out: string;
  transition_out_duration: number;
  enabled: boolean;
  always_on: boolean;
  locked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  project_id: string;
  layer_id: string;
  name: string;
  description: string | null;
  html_template: string;
  css_styles: string;
  sort_order: number;
  enabled: boolean;
  locked?: boolean;
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROJECTS
// ============================================

export async function fetchProjects(organizationId?: string): Promise<Project[]> {
  const result = await gfxRestSelect<Project>(
    'gfx_projects',
    '*',
    organizationId ? { column: 'organization_id', value: organizationId } : undefined,
    10000
  );

  if (result.error) {
    console.error('Error fetching projects:', result.error);
    return [];
  }

  // Filter out archived and sort by updated_at (descending)
  return (result.data || [])
    .filter((p) => !p.archived)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const result = await gfxRestSelect<Project>(
    'gfx_projects',
    '*',
    { column: 'id', value: projectId },
    10000
  );

  if (result.error || !result.data?.[0]) {
    console.error('Error fetching project:', result.error);
    return null;
  }
  return result.data[0];
}

export async function createProject(
  project: Partial<Project> & { organization_id: string; created_by?: string },
  accessToken?: string
): Promise<Project | null> {
  if (!project.organization_id) {
    console.error('Error: organization_id is required to create a project');
    throw new Error('Organization is required to create a project');
  }

  const canvasWidth = project.canvas_width || 1920;
  const canvasHeight = project.canvas_height || 1080;
  const TIMEOUT = 10000;

  console.log('[createProject] Creating new project via GFX REST API...');

  // Step 1: Create the project
  const projectResult = await gfxRestInsert<Project>('gfx_projects', {
    name: project.name || 'Untitled Project',
    description: project.description || null,
    slug: project.slug || `project-${Date.now()}`,
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
    frame_rate: project.frame_rate || 30,
    background_color: project.background_color || 'transparent',
    interactive_enabled: project.interactive_enabled || false,
    organization_id: project.organization_id,
    created_by: project.created_by || null,
  }, TIMEOUT, accessToken);

  if (projectResult.error || !projectResult.data?.[0]) {
    console.error('Error creating project:', projectResult.error);
    return null;
  }

  const data = projectResult.data[0];
  console.log(`[createProject] Project created: ${data.id}`);

  // Step 2: Create default design system (fire and forget)
  gfxRestInsert('gfx_project_design_systems', {
    project_id: data.id,
  }, TIMEOUT).catch((err: unknown) => console.warn('Design system creation failed:', err));

  // Step 3: Create default layers
  const defaultLayers = [
    {
      name: 'Background',
      layer_type: 'background',
      z_index: 10,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: canvasWidth,
      height: canvasHeight,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 500,
      enabled: true,
      always_on: true,
    },
    {
      name: 'Fullscreen',
      layer_type: 'fullscreen',
      z_index: 100,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: canvasWidth,
      height: canvasHeight,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 300,
      enabled: true,
      always_on: false,
    },
    {
      name: 'Lower Third',
      layer_type: 'lower-third',
      z_index: 300,
      position_anchor: 'bottom-left',
      position_offset_x: Math.round(canvasWidth * 0.04),
      position_offset_y: Math.round(-canvasHeight * 0.11),
      width: Math.round(canvasWidth * 0.36),
      height: Math.round(canvasHeight * 0.14),
      auto_out: true,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 400,
      transition_out: 'fade',
      transition_out_duration: 300,
      enabled: true,
      always_on: false,
    },
    {
      name: 'Bug',
      layer_type: 'bug',
      z_index: 450,
      position_anchor: 'top-right',
      position_offset_x: Math.round(-canvasWidth * 0.02),
      position_offset_y: Math.round(canvasHeight * 0.04),
      width: Math.round(canvasWidth * 0.1),
      height: Math.round(canvasHeight * 0.074),
      auto_out: false,
      allow_multiple: true,
      transition_in: 'fade',
      transition_in_duration: 300,
      transition_out: 'fade',
      transition_out_duration: 200,
      enabled: true,
      always_on: false,
    },
  ];

  const layersResult = await gfxRestInsert<Layer>('gfx_layers',
    defaultLayers.map((l, i) => ({
      project_id: data.id,
      ...l,
      locked: false,
      sort_order: i,
    })),
    TIMEOUT
  );

  if (layersResult.error) {
    console.error('Error creating default layers:', layersResult.error);
  } else {
    const createdLayers = layersResult.data || [];
    console.log(`[createProject] Created ${createdLayers.length} default layers`);

    // Create a default blank template under the Fullscreen layer
    const fullscreenLayer = createdLayers.find((l: Layer) => l.layer_type === 'fullscreen');
    if (fullscreenLayer) {
      const templateResult = await gfxRestInsert<Template>('gfx_templates', {
        project_id: data.id,
        layer_id: fullscreenLayer.id,
        name: 'Blank',
        description: 'Default blank template',
        html_template: '<div class="gfx-root"></div>',
        css_styles: '',
        sort_order: 0,
        enabled: true,
      }, TIMEOUT);

      if (templateResult.error) {
        console.error('Error creating default blank template:', templateResult.error);
      } else {
        console.log(`[createProject] Created default blank template`);
      }
    }
  }

  console.log(`[createProject] Project creation complete: ${data.id}`);
  return data;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
  const result = await gfxRestUpdate(
    'gfx_projects',
    { ...updates, updated_at: new Date().toISOString() },
    { column: 'id', value: projectId }
  );

  if (result.error) {
    console.error('Error updating project:', result.error);
    return false;
  }
  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  console.log('[deleteProject] Archiving project:', projectId);

  const result = await gfxRestUpdate(
    'gfx_projects',
    { archived: true, updated_at: new Date().toISOString() },
    { column: 'id', value: projectId }
  );

  if (result.error) {
    console.error('[deleteProject] Error:', result.error);
    return false;
  }

  // Also delete from localStorage if it exists
  try {
    localStorage.removeItem(`nova-project-${projectId}`);
    console.log('[deleteProject] Removed from localStorage');
  } catch (err) {
    console.error('[deleteProject] Error removing from localStorage:', err);
  }

  return true;
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  try {
    const project = await fetchProject(projectId);
    if (!project) {
      console.error('Project not found:', projectId);
      return null;
    }

    // Create new project with same settings
    const newProject = await createProject({
      name: `${project.name} (Copy)`,
      description: project.description,
      canvas_width: project.canvas_width,
      canvas_height: project.canvas_height,
      frame_rate: project.frame_rate,
      background_color: project.background_color,
      interactive_enabled: project.interactive_enabled,
      organization_id: project.organization_id,
    });

    if (!newProject) {
      console.error('Failed to create duplicated project');
      return null;
    }

    // Note: For full duplication with layers, templates, elements, etc.,
    // you would need to duplicate those as well. This is a simple copy.
    console.log(`[duplicateProject] Project duplicated: ${newProject.id}`);
    return newProject;
  } catch (error) {
    console.error('Error duplicating project:', error);
    return null;
  }
}

// ============================================
// LAYERS
// ============================================

export async function fetchLayers(projectId: string): Promise<Layer[]> {
  const result = await gfxRestSelect<Layer>(
    'gfx_layers',
    '*',
    { column: 'project_id', value: projectId },
    10000
  );

  if (result.error) {
    console.error('Error fetching layers:', result.error);
    return [];
  }

  return (result.data || [])
    .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
    .map((layer) => ({
      ...layer,
      enabled: layer.enabled ?? true,
      locked: layer.locked ?? false,
    }));
}

// ============================================
// TEMPLATES
// ============================================

export async function fetchTemplates(projectId: string): Promise<Template[]> {
  const result = await gfxRestSelect<Template>(
    'gfx_templates',
    '*',
    { column: 'project_id', value: projectId },
    10000
  );

  if (result.error) {
    console.error('Error fetching templates:', result.error);
    return [];
  }

  return (result.data || [])
    .filter((t) => !t.archived)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((template) => ({
      ...template,
      enabled: template.enabled ?? true,
      locked: template.locked ?? false,
    }));
}
