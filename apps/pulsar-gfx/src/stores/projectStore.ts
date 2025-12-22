import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { usePlaylistStore } from './playlistStore';
import { usePageStore } from './pageStore';
import { useAuthStore } from './authStore';
import { useUIPreferencesStore } from './uiPreferencesStore';
import { fetchEndpointData } from '@/services/novaEndpointService';
import { usePreviewStore } from './previewStore';

// Edge function helper for reliable project operations (no stale connections)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchProjectsViaEdgeFunction(organizationId?: string): Promise<any[]> {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/gfx-projects`);
    if (organizationId) {
      url.searchParams.set('organization_id', organizationId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[projectStore] Edge function error:', result);
      return [];
    }
    return result.data || [];
  } catch (err) {
    console.error('[projectStore] Network error:', err);
    return [];
  }
}

// Types - these will move to @emergent-platform/types
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  published: boolean;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  projectId: string;
  layerId: string;
  name: string;
  category: string;
  layerType: string;
  layerName: string;
  elements: TemplateElement[];
  animations: {
    in: AnimationSequence;
    loop: AnimationSequence;
    out: AnimationSequence;
  };
  thumbnailUrl?: string;
  htmlTemplate?: string;
  cssStyles?: string;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
  // Data binding fields
  dataSourceId?: string | null;
  dataSourceConfig?: {
    slug?: string;
    displayField?: string;
    defaultRecordIndex?: number;
  } | null;
}

export interface TemplateElement {
  id: string;
  templateId: string;
  name: string;
  elementId?: string;
  elementType: 'text' | 'shape' | 'image' | 'video' | 'group' | 'line' | 'icon' | 'svg' | 'chart' | 'map' | 'table' | 'ticker' | 'topic-badge' | 'countdown' | 'div';
  parentElementId?: string | null;
  sortOrder?: number;
  zIndex?: number;
  positionX: number;
  positionY: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  anchorX?: number;
  anchorY?: number;
  opacity?: number;
  content: any;
  styles?: Record<string, any>;
  classes?: string[];
  visible?: boolean;
  locked?: boolean;
}

export interface AnimationSequence {
  duration: number;
  easing?: string;
  keyframes?: any[];
}

interface ProjectStore {
  // State
  projects: Project[];
  currentProject: Project | null;
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string, skipSavePreference?: boolean) => Promise<void>;
  refreshProject: () => Promise<void>;
  getTemplate: (templateId: string) => Template | undefined;
  loadTemplateElements: (templateId: string) => Promise<TemplateElement[]>;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get user's organization from auth store
      const { user } = useAuthStore.getState();

      // Use edge function for reliable project loading (no stale connections!)
      console.log('[projectStore] Loading projects via edge function...');
      const data = await fetchProjectsViaEdgeFunction(user?.organizationId);

      const projects: Project[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        published: p.published,
        thumbnailUrl: p.thumbnail_url,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }));

      console.log('[projectStore] Loaded', projects.length, 'projects');
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  selectProject: async (projectId: string, skipSavePreference = false) => {
    // Clear templates immediately to force UI update
    set({ isLoading: true, error: null, templates: [] });
    try {
      // Load project
      const { data: project, error: projectError } = await supabase
        .from('gfx_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Load layers for this project to get layer types
      const { data: layerData, error: layerError } = await supabase
        .from('gfx_layers')
        .select('id, name, layer_type')
        .eq('project_id', projectId);

      if (layerError) throw layerError;

      // Create a map of layer_id -> layer info
      const layerMap = new Map<string, { name: string; type: string }>();
      (layerData || []).forEach((layer: any) => {
        layerMap.set(layer.id, { name: layer.name, type: layer.layer_type });
      });

      // Load templates for this project - filter out archived templates
      const { data: templateData, error: templateError } = await supabase
        .from('gfx_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('archived', false)  // Filter out soft-deleted templates
        .order('updated_at', { ascending: false });

      if (templateError) throw templateError;

      const currentProject: Project = {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        published: project.published,
        thumbnailUrl: project.thumbnail_url,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      };

      const templates: Template[] = (templateData || []).map((t: any) => {
        const layerInfo = layerMap.get(t.layer_id) || { name: 'Unknown', type: 'custom' };
        const template = {
          id: t.id,
          projectId: t.project_id,
          layerId: t.layer_id,
          name: t.name,
          category: layerInfo.name,
          layerType: layerInfo.type,
          layerName: layerInfo.name,
          elements: [],  // Will be loaded separately when template is selected
          animations: {
            in: { duration: t.in_duration || 500 },
            loop: { duration: t.loop_duration || 0 },
            out: { duration: t.out_duration || 300 },
          },
          thumbnailUrl: t.thumbnail_url,
          htmlTemplate: t.html_template,
          cssStyles: t.css_styles,
          width: t.width || 1920,
          height: t.height || 1080,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          // Data binding fields
          dataSourceId: t.data_source_id || null,
          dataSourceConfig: t.data_source_config || null,
        };
        return template;
      });

      set({ currentProject, templates, isLoading: false });

      // Save last opened project to user preferences (persists to Supabase)
      // Skip saving during initial app load to avoid auth race conditions
      if (!skipSavePreference) {
        useUIPreferencesStore.getState().setLastProjectId(projectId);
      }

      // Find first template with a data source and load its data immediately
      const templateWithDataSource = templates.find(t => {
        const config = t.dataSourceConfig as { slug?: string } | null;
        return config?.slug;
      });

      if (templateWithDataSource) {
        const config = templateWithDataSource.dataSourceConfig as { slug: string };
        const slug = config.slug;

        // Load data immediately (non-blocking) and store in previewStore
        fetchEndpointData(slug).then(data => {
          if (data && data.length > 0) {
            // Use template's dataSourceId or generate a placeholder ID from slug
            const sourceId = templateWithDataSource.dataSourceId || `endpoint:${slug}`;
            usePreviewStore.getState().setDataSource(
              sourceId,
              slug,
              slug,
              data
            );
          }
        }).catch(() => {
          // Ignore errors on prefetch
        });
      }

      // Clear and reload playlists for the new project
      usePlaylistStore.getState().clearPlaylists();
      usePageStore.getState().clearPages();
      await usePlaylistStore.getState().loadPlaylists(projectId);
    } catch (error) {
      console.error('[projectStore] Failed to select project:', error);
      set({ error: 'Failed to load project', isLoading: false });
    }
  },

  refreshProject: async () => {
    const currentProject = get().currentProject;
    if (!currentProject) return;
    // Clear localStorage to force fresh data load
    localStorage.removeItem('pulsar-preview-data');
    // Re-select the project to reload all data
    await get().selectProject(currentProject.id);
  },

  getTemplate: (templateId: string) => {
    return get().templates.find((t) => t.id === templateId);
  },

  loadTemplateElements: async (templateId: string) => {
    try {
      // First, try to get elements from localStorage (already loaded by PreviewPanel)
      let elementsFromStorage: any[] = [];
      try {
        const previewDataStr = localStorage.getItem('pulsar-preview-data');
        if (previewDataStr) {
          const previewData = JSON.parse(previewDataStr);
          if (previewData.elements && Array.isArray(previewData.elements)) {
            elementsFromStorage = previewData.elements.filter(
              (e: any) => e.template_id === templateId
            );
          }
        }
      } catch {
        // Ignore localStorage read errors
      }

      // If we found elements in localStorage, use those
      if (elementsFromStorage.length > 0) {
        const elements: TemplateElement[] = elementsFromStorage.map((e: any) => ({
          id: e.id,
          templateId: e.template_id,
          name: e.name,
          elementId: e.element_id,
          elementType: e.element_type,
          parentElementId: e.parent_element_id,
          sortOrder: e.sort_order,
          zIndex: e.z_index,
          positionX: e.position_x ?? 0,
          positionY: e.position_y ?? 0,
          width: e.width,
          height: e.height,
          rotation: e.rotation ?? 0,
          scaleX: e.scale_x ?? 1,
          scaleY: e.scale_y ?? 1,
          anchorX: e.anchor_x ?? 0.5,
          anchorY: e.anchor_y ?? 0.5,
          opacity: e.opacity ?? 1,
          content: e.content,
          styles: e.styles,
          classes: e.classes,
          visible: e.visible ?? true,
          locked: e.locked ?? false,
        }));

        // Update the template with elements
        const template = get().templates.find(t => t.id === templateId);
        if (template) {
          const updatedTemplate = { ...template, elements };
          set({
            templates: get().templates.map(t => t.id === templateId ? updatedTemplate : t),
            selectedTemplate: updatedTemplate,
          });
        }

        return elements;
      }

      // Fallback: query database directly
      const { data, error } = await supabase
        .from('gfx_elements')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;

      const elements: TemplateElement[] = (data || []).map((e: any) => ({
        id: e.id,
        templateId: e.template_id,
        name: e.name,
        elementId: e.element_id,
        elementType: e.element_type,
        parentElementId: e.parent_element_id,
        sortOrder: e.sort_order,
        zIndex: e.z_index,
        positionX: e.position_x ?? 0,
        positionY: e.position_y ?? 0,
        width: e.width,
        height: e.height,
        rotation: e.rotation ?? 0,
        scaleX: e.scale_x ?? 1,
        scaleY: e.scale_y ?? 1,
        anchorX: e.anchor_x ?? 0.5,
        anchorY: e.anchor_y ?? 0.5,
        opacity: e.opacity ?? 1,
        content: e.content,
        styles: e.styles,
        classes: e.classes,
        visible: e.visible ?? true,
        locked: e.locked ?? false,
      }));

      // Update the template with elements
      const template = get().templates.find(t => t.id === templateId);
      if (template) {
        const updatedTemplate = { ...template, elements };
        set({
          templates: get().templates.map(t => t.id === templateId ? updatedTemplate : t),
          selectedTemplate: updatedTemplate,
        });
      }

      return elements;
    } catch {
      return [];
    }
  },

  clearProject: () => {
    set({ currentProject: null, templates: [], selectedTemplate: null });
  },
}));
