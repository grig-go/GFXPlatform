import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { usePlaylistStore } from './playlistStore';
import { usePageStore } from './pageStore';

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
  selectProject: (projectId: string) => Promise<void>;
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
      // Load all projects (not just published) for now
      const { data, error } = await supabase
        .from('gfx_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projects: Project[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        published: p.published,
        thumbnailUrl: p.thumbnail_url,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }));

      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  selectProject: async (projectId: string) => {
    console.log('[projectStore] selectProject called with:', projectId);
    // Clear templates immediately to force UI update
    set({ isLoading: true, error: null, templates: [] });
    try {
      // Load project
      const { data: project, error: projectError } = await supabase
        .from('gfx_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('[projectStore] Error loading project:', projectError);
        throw projectError;
      }

      console.log('[projectStore] Loaded project:', project.name);

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

      console.log('[projectStore] Raw template data from DB:', templateData?.length, 'templates');
      console.log('[projectStore] Template names:', templateData?.map((t: any) => t.name));

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
        return {
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
        };
      });

      console.log('[projectStore] Setting currentProject:', currentProject.name, 'with', templates.length, 'templates');
      set({ currentProject, templates, isLoading: false });

      // Clear and reload playlists for the new project
      console.log('[projectStore] Clearing and reloading playlists for project:', projectId);
      usePlaylistStore.getState().clearPlaylists();
      usePageStore.getState().clearPages();
      await usePlaylistStore.getState().loadPlaylists(projectId);

      console.log('[projectStore] selectProject complete');
    } catch (error) {
      console.error('[projectStore] Failed to select project:', error);
      set({ error: 'Failed to load project', isLoading: false });
    }
  },

  refreshProject: async () => {
    const currentProject = get().currentProject;
    if (!currentProject) {
      console.log('[projectStore] No current project to refresh');
      return;
    }
    console.log('[projectStore] Refreshing project:', currentProject.id);
    // Clear localStorage to force fresh data load
    localStorage.removeItem('nova-preview-data');
    // Re-select the project to reload all data
    await get().selectProject(currentProject.id);
  },

  getTemplate: (templateId: string) => {
    return get().templates.find((t) => t.id === templateId);
  },

  loadTemplateElements: async (templateId: string) => {
    try {
      console.log('[projectStore v2] Loading elements for template:', templateId);

      // First, try to get elements from localStorage (already loaded by PreviewPanel)
      let elementsFromStorage: any[] = [];
      try {
        const previewDataStr = localStorage.getItem('nova-preview-data');
        console.log('[projectStore] localStorage nova-preview-data exists:', !!previewDataStr);
        if (previewDataStr) {
          const previewData = JSON.parse(previewDataStr);
          console.log('[projectStore] previewData.elements count:', previewData.elements?.length || 0);
          if (previewData.elements && previewData.elements.length > 0) {
            console.log('[projectStore] First few elements template_ids:', previewData.elements.slice(0, 5).map((e: any) => e.template_id));
            console.log('[projectStore] Looking for template_id:', templateId);
          }
          if (previewData.elements && Array.isArray(previewData.elements)) {
            elementsFromStorage = previewData.elements.filter(
              (e: any) => e.template_id === templateId
            );
            console.log('[projectStore] Found', elementsFromStorage.length, 'elements in localStorage for template:', templateId);
          }
        }
      } catch (e) {
        console.warn('[projectStore] Failed to read from localStorage:', e);
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

        console.log('[projectStore] Using localStorage elements:', elements);

        // Update the template with elements
        const template = get().templates.find(t => t.id === templateId);
        if (template) {
          const updatedTemplate = { ...template, elements };
          console.log('[projectStore] Updating template with', elements.length, 'elements from localStorage');
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

      if (error) {
        console.error('[projectStore] Error loading elements:', error);
        throw error;
      }

      console.log('[projectStore] Raw elements data from DB:', data);

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

      console.log('[projectStore] Mapped elements from DB:', elements);

      // Update the template with elements
      const template = get().templates.find(t => t.id === templateId);
      if (template) {
        const updatedTemplate = { ...template, elements };
        console.log('[projectStore] Updating template with', elements.length, 'elements from DB');
        set({
          templates: get().templates.map(t => t.id === templateId ? updatedTemplate : t),
          selectedTemplate: updatedTemplate,
        });
      } else {
        console.warn('[projectStore] Template not found in store:', templateId);
      }

      return elements;
    } catch (error) {
      console.error('Failed to load template elements:', error);
      return [];
    }
  },

  clearProject: () => {
    set({ currentProject: null, templates: [], selectedTemplate: null });
  },
}));
