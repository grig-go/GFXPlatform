// Page Library Store - stores standalone pages at project level for drag-and-drop to playlists
import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';

export interface LibraryPage {
  id: string;
  projectId: string;
  templateId: string;
  name: string;
  payload: Record<string, any>;
  duration?: number;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PageLibraryState {
  // All pages in the project's library
  pages: LibraryPage[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPageLibrary: (projectId: string) => Promise<void>;
  addToLibrary: (page: {
    projectId: string;
    organizationId: string;
    templateId: string;
    name: string;
    payload?: Record<string, any>;
    duration?: number;
    tags?: string[];
  }) => Promise<LibraryPage>;
  updateLibraryPage: (pageId: string, updates: Partial<Pick<LibraryPage, 'name' | 'payload' | 'duration' | 'tags'>>) => Promise<void>;
  removeFromLibrary: (pageId: string) => Promise<void>;
  clearLibrary: () => void;
}

export const usePageLibraryStore = create<PageLibraryState>((set) => ({
  pages: [],
  isLoading: false,
  error: null,

  loadPageLibrary: async (projectId: string) => {
    set({ isLoading: true, error: null });
    console.log('[pageLibraryStore] Loading page library for project:', projectId);
    try {
      const { data, error } = await supabase.rpc('get_page_library', { p_project_id: projectId });

      if (error) throw error;

      console.log('[pageLibraryStore] Found library pages:', data?.length || 0);

      const pages: LibraryPage[] = (data || []).map((p: any) => ({
        id: p.id,
        projectId: p.project_id,
        templateId: p.template_id,
        name: p.name,
        payload: p.payload || {},
        duration: p.duration,
        tags: p.tags || [],
        usageCount: p.usage_count || 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      set({ pages, isLoading: false });
    } catch (error: any) {
      console.error('[pageLibraryStore] Error loading page library:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addToLibrary: async (page) => {
    console.log('[pageLibraryStore] Adding page to library:', page.name);
    try {
      const { data, error } = await supabase
        .from('pulsar_page_library')
        .insert({
          project_id: page.projectId,
          organization_id: page.organizationId,
          template_id: page.templateId,
          name: page.name,
          payload: page.payload || {},
          duration: page.duration,
          tags: page.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      const newPage: LibraryPage = {
        id: data.id,
        projectId: data.project_id,
        templateId: data.template_id,
        name: data.name,
        payload: data.payload || {},
        duration: data.duration,
        tags: data.tags || [],
        usageCount: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set((state) => ({ pages: [...state.pages, newPage] }));
      return newPage;
    } catch (error: any) {
      console.error('[pageLibraryStore] Error adding to library:', error);
      throw error;
    }
  },

  updateLibraryPage: async (pageId, updates) => {
    console.log('[pageLibraryStore] Updating library page:', pageId);
    try {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.payload !== undefined) updateData.payload = updates.payload;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { error } = await supabase
        .from('pulsar_page_library')
        .update(updateData)
        .eq('id', pageId);

      if (error) throw error;

      set((state) => ({
        pages: state.pages.map((p) =>
          p.id === pageId ? { ...p, ...updates, updatedAt: updateData.updated_at } : p
        ),
      }));
    } catch (error: any) {
      console.error('[pageLibraryStore] Error updating library page:', error);
      throw error;
    }
  },

  removeFromLibrary: async (pageId) => {
    console.log('[pageLibraryStore] Removing page from library:', pageId);
    try {
      const { error } = await supabase
        .from('pulsar_page_library')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      set((state) => ({ pages: state.pages.filter((p) => p.id !== pageId) }));
    } catch (error: any) {
      console.error('[pageLibraryStore] Error removing from library:', error);
      throw error;
    }
  },

  clearLibrary: () => {
    set({ pages: [], isLoading: false, error: null });
  },
}));

// For backwards compatibility, also export the old name
export const usePageRepositoryStore = usePageLibraryStore;
export type RepositoryPage = LibraryPage;
