import { create } from 'zustand';
import { supabase } from '@emergent-platform/supabase-client';
import { type Template } from './projectStore';

export interface Page {
  id: string;
  organizationId: string;
  playlistId: string;
  templateId: string;
  pageGroupId?: string;
  channelId?: string;
  name: string;
  payload: Record<string, string | null>;
  dataBindings: DataBinding[];
  dataRecordIndex?: number; // Index of the selected data record for templates with data binding
  duration?: number;
  sortOrder: number;
  tags: string[];
  isOnAir: boolean;
  template?: Template;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageGroup {
  id: string;
  playlistId: string;
  parentGroupId?: string; // For nested groups
  name: string;
  color?: string;
  sortOrder: number;
  isCollapsed: boolean;
  pages?: Page[];
}

export interface DataBinding {
  id: string;
  elementId: string;
  sourceType: 'api' | 'websocket' | 'manual';
  sourceConfig: Record<string, any>;
  refreshMode: 'realtime' | 'on_play' | 'interval';
  refreshInterval?: number;
}

interface PageStore {
  pages: Page[];
  pageGroups: PageGroup[];
  selectedPage: Page | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPages: (playlistId: string) => Promise<void>;
  selectPage: (pageId: string | null) => void;
  clearPages: () => void;
  createPage: (
    playlistId: string,
    templateId: string,
    name: string,
    payload?: Record<string, string | null>,
    channelId?: string | null,
    dataRecordIndex?: number
  ) => Promise<Page>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  updatePayload: (pageId: string, fieldId: string, value: string | null) => Promise<void>;
  updatePagePayload: (pageId: string, payload: Record<string, any>, dataRecordIndex?: number) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  duplicatePage: (pageId: string) => Promise<Page>;
  reorderPages: (pageIds: string[]) => Promise<void>;

  // Groups
  createPageGroup: (playlistId: string, name: string, parentGroupId?: string) => Promise<PageGroup>;
  updatePageGroup: (groupId: string, updates: Partial<PageGroup>) => Promise<void>;
  deletePageGroup: (groupId: string) => Promise<void>;
  duplicatePageGroup: (groupId: string) => Promise<PageGroup>;
  toggleGroupCollapsed: (groupId: string) => void;
  movePageToGroup: (pageId: string, groupId: string | null) => Promise<void>;
  moveGroupToGroup: (groupId: string, parentGroupId: string | null) => Promise<void>;
  reorderGroups: (groupIds: string[]) => Promise<void>;

  // Mixed reordering (groups and ungrouped pages together)
  reorderMixedItems: (itemIds: string[]) => void;

  // Channel assignment
  updatePageChannel: (pageId: string, channelId: string | null) => Promise<void>;

  // On-air state
  setPageOnAir: (pageId: string, isOnAir: boolean) => Promise<void>;
  resetPagesOnAirForChannel: (channelId: string) => Promise<void>;
}

export const usePageStore = create<PageStore>((set, get) => ({
  pages: [],
  pageGroups: [],
  selectedPage: null,
  isLoading: false,
  error: null,

  loadPages: async (playlistId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Load page groups
      const { data: groupData, error: groupError } = await supabase
        .from('pulsar_page_groups')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('sort_order');

      if (groupError) throw groupError;

      // Load pages
      const { data: pageData, error: pageError } = await supabase
        .from('pulsar_pages')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('sort_order');

      if (pageError) throw pageError;

      const pageGroups: PageGroup[] = (groupData || []).map((g: any) => ({
        id: g.id,
        playlistId: g.playlist_id,
        parentGroupId: g.parent_group_id,
        name: g.name,
        color: g.color,
        sortOrder: g.sort_order,
        isCollapsed: g.is_collapsed,
      }));

      const pages: Page[] = (pageData || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        playlistId: p.playlist_id,
        templateId: p.template_id,
        pageGroupId: p.page_group_id,
        channelId: p.channel_id,
        name: p.name,
        payload: p.payload || {},
        dataBindings: p.data_bindings || [],
        dataRecordIndex: p.data_record_index ?? 0,
        duration: p.duration,
        sortOrder: p.sort_order,
        tags: p.tags || [],
        isOnAir: p.is_on_air || false,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }));

      set({ pages, pageGroups, isLoading: false });
    } catch (error) {
      console.error('Failed to load pages:', error);
      set({ error: 'Failed to load pages', isLoading: false });
    }
  },

  selectPage: (pageId: string | null) => {
    if (!pageId) {
      set({ selectedPage: null });
      return;
    }
    const page = get().pages.find((p) => p.id === pageId);
    set({ selectedPage: page || null });
  },

  clearPages: () => {
    set({ pages: [], pageGroups: [], selectedPage: null, error: null });
  },

  createPage: async (playlistId, templateId, name, payload = {}, channelId = null, dataRecordIndex = 0) => {
    console.log('[pageStore] createPage called with channelId:', channelId, 'dataRecordIndex:', dataRecordIndex);
    const pages = get().pages;
    const maxOrder = Math.max(...pages.map((p) => p.sortOrder), -1);

    // Get the organization_id from the playlist
    const { data: playlistData, error: playlistError } = await supabase
      .from('pulsar_playlists')
      .select('organization_id')
      .eq('id', playlistId)
      .single();

    if (playlistError) throw playlistError;

    if (!playlistData.organization_id) {
      throw new Error('Playlist does not have an organization_id');
    }

    const { data, error } = await supabase
      .from('pulsar_pages')
      .insert({
        organization_id: playlistData.organization_id,
        playlist_id: playlistId,
        template_id: templateId,
        name,
        payload,
        sort_order: maxOrder + 1,
        channel_id: channelId,
        data_record_index: dataRecordIndex,
      })
      .select()
      .single();

    if (error) throw error;

    const newPage: Page = {
      id: data.id,
      organizationId: data.organization_id,
      playlistId: data.playlist_id,
      templateId: data.template_id,
      pageGroupId: data.page_group_id,
      channelId: data.channel_id,
      name: data.name,
      payload: data.payload || {},
      dataBindings: data.data_bindings || [],
      dataRecordIndex: data.data_record_index ?? 0,
      duration: data.duration,
      sortOrder: data.sort_order,
      tags: data.tags || [],
      isOnAir: data.is_on_air || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    set({ pages: [...pages, newPage] });
    return newPage;
  },

  updatePage: async (pageId, updates) => {
    // Build update object with only defined fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.payload !== undefined) updateData.payload = updates.payload;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.pageGroupId !== undefined) updateData.page_group_id = updates.pageGroupId;

    const { error } = await supabase
      .from('pulsar_pages')
      .update(updateData)
      .eq('id', pageId);

    if (error) throw error;

    set({
      pages: get().pages.map((p) =>
        p.id === pageId ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    });
  },

  updatePayload: async (pageId, fieldId, value) => {
    const page = get().pages.find((p) => p.id === pageId);
    if (!page) return;

    const newPayload = { ...page.payload, [fieldId]: value };

    const { error } = await supabase
      .from('pulsar_pages')
      .update({
        payload: newPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    if (error) throw error;

    set({
      pages: get().pages.map((p) =>
        p.id === pageId
          ? { ...p, payload: newPayload, updatedAt: new Date() }
          : p
      ),
      selectedPage: get().selectedPage?.id === pageId
        ? { ...get().selectedPage!, payload: newPayload, updatedAt: new Date() }
        : get().selectedPage,
    });
  },

  updatePagePayload: async (pageId, payload, dataRecordIndex) => {
    console.log('[pageStore] updatePagePayload - pageId:', pageId);
    console.log('[pageStore] updatePagePayload - payload:', payload);
    console.log('[pageStore] updatePagePayload - dataRecordIndex:', dataRecordIndex);

    const updateData: Record<string, any> = {
      payload,
      updated_at: new Date().toISOString(),
    };

    // Only update data_record_index if provided
    if (dataRecordIndex !== undefined) {
      updateData.data_record_index = dataRecordIndex;
    }

    const { data, error } = await supabase
      .from('pulsar_pages')
      .update(updateData)
      .eq('id', pageId)
      .select();

    console.log('[pageStore] updatePagePayload - result:', { data, error });

    if (error) {
      console.error('[pageStore] updatePagePayload - Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[pageStore] updatePagePayload - No rows updated! Check RLS policies or pageId:', pageId);
    }

    set({
      pages: get().pages.map((p) =>
        p.id === pageId
          ? { ...p, payload, dataRecordIndex: dataRecordIndex ?? p.dataRecordIndex, updatedAt: new Date() }
          : p
      ),
      selectedPage: get().selectedPage?.id === pageId
        ? { ...get().selectedPage!, payload, dataRecordIndex: dataRecordIndex ?? get().selectedPage!.dataRecordIndex, updatedAt: new Date() }
        : get().selectedPage,
    });
  },

  deletePage: async (pageId) => {
    console.log('[pageStore] Deleting page:', pageId);
    const { error, count } = await supabase
      .from('pulsar_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      console.error('[pageStore] Delete error:', error);
      throw error;
    }

    console.log('[pageStore] Delete successful, count:', count);
    set({
      pages: get().pages.filter((p) => p.id !== pageId),
      selectedPage:
        get().selectedPage?.id === pageId ? null : get().selectedPage,
    });
  },

  duplicatePage: async (pageId) => {
    const page = get().pages.find((p) => p.id === pageId);
    if (!page) throw new Error('Page not found');

    return get().createPage(
      page.playlistId,
      page.templateId,
      `${page.name} (Copy)`,
      { ...page.payload }
    );
  },

  reorderPages: async (pageIds) => {
    // Optimistically update UI immediately for fast response
    const reorderedPages = get().pages
      .map((p) => {
        const index = pageIds.indexOf(p.id);
        return index >= 0 ? { ...p, sortOrder: index } : p;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    set({ pages: reorderedPages });

    // Save to DB in background (don't await)
    const saveToDb = async () => {
      try {
        // Use a single transaction-like approach with Promise.all
        const updates = pageIds.map((id, index) =>
          supabase
            .from('pulsar_pages')
            .update({ sort_order: index })
            .eq('id', id)
        );
        await Promise.all(updates);
      } catch (error) {
        console.error('[pageStore] Failed to save page order:', error);
        // Could implement retry logic or show error notification
      }
    };

    // Fire and forget - don't block UI
    saveToDb();
  },

  createPageGroup: async (playlistId, name, parentGroupId) => {
    const groups = get().pageGroups;
    const maxOrder = Math.max(...groups.map((g) => g.sortOrder), -1);

    const insertData: Record<string, any> = {
      playlist_id: playlistId,
      name,
      sort_order: maxOrder + 1,
    };
    if (parentGroupId) {
      insertData.parent_group_id = parentGroupId;
    }

    const { data, error } = await supabase
      .from('pulsar_page_groups')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    const newGroup: PageGroup = {
      id: data.id,
      playlistId: data.playlist_id,
      parentGroupId: data.parent_group_id,
      name: data.name,
      color: data.color,
      sortOrder: data.sort_order,
      isCollapsed: data.is_collapsed,
    };

    set({ pageGroups: [...groups, newGroup] });
    return newGroup;
  },

  movePageToGroup: async (pageId, groupId) => {
    const { error } = await supabase
      .from('pulsar_pages')
      .update({ page_group_id: groupId })
      .eq('id', pageId);

    if (error) throw error;

    set({
      pages: get().pages.map((p) =>
        p.id === pageId ? { ...p, pageGroupId: groupId || undefined } : p
      ),
    });
  },

  moveGroupToGroup: async (groupId, parentGroupId) => {
    // Prevent circular nesting
    if (groupId === parentGroupId) return;

    // Check if parentGroupId is a descendant of groupId (would create circular reference)
    const allGroups = get().pageGroups;
    if (parentGroupId) {
      let currentParent: string | undefined = parentGroupId;
      while (currentParent) {
        if (currentParent === groupId) {
          console.error('[pageStore] Cannot nest group inside its own descendant');
          return;
        }
        const parentGroup = allGroups.find(g => g.id === currentParent);
        currentParent = parentGroup?.parentGroupId;
      }
    }

    const { error } = await supabase
      .from('pulsar_page_groups')
      .update({ parent_group_id: parentGroupId })
      .eq('id', groupId);

    if (error) throw error;

    set({
      pageGroups: get().pageGroups.map((g) =>
        g.id === groupId ? { ...g, parentGroupId: parentGroupId || undefined } : g
      ),
    });
  },

  updatePageGroup: async (groupId, updates) => {
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
    if (updates.isCollapsed !== undefined) updateData.is_collapsed = updates.isCollapsed;
    if (updates.parentGroupId !== undefined) updateData.parent_group_id = updates.parentGroupId;

    const { error } = await supabase
      .from('pulsar_page_groups')
      .update(updateData)
      .eq('id', groupId);

    if (error) throw error;

    set({
      pageGroups: get().pageGroups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    });
  },

  deletePageGroup: async (groupId) => {
    const group = get().pageGroups.find(g => g.id === groupId);
    const parentGroupId = group?.parentGroupId || null;

    // First, move all pages in this group to parent group (or ungrouped)
    const pagesInGroup = get().pages.filter(p => p.pageGroupId === groupId);
    if (pagesInGroup.length > 0) {
      const { error: pagesError } = await supabase
        .from('pulsar_pages')
        .update({ page_group_id: parentGroupId })
        .eq('page_group_id', groupId);

      if (pagesError) throw pagesError;
    }

    // Move child groups to parent group (or top level)
    const childGroups = get().pageGroups.filter(g => g.parentGroupId === groupId);
    if (childGroups.length > 0) {
      const { error: childError } = await supabase
        .from('pulsar_page_groups')
        .update({ parent_group_id: parentGroupId })
        .eq('parent_group_id', groupId);

      if (childError) throw childError;
    }

    // Then delete the group
    const { error } = await supabase
      .from('pulsar_page_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;

    set({
      pageGroups: get().pageGroups
        .filter((g) => g.id !== groupId)
        .map((g) => g.parentGroupId === groupId ? { ...g, parentGroupId: parentGroupId || undefined } : g),
      pages: get().pages.map((p) =>
        p.pageGroupId === groupId ? { ...p, pageGroupId: parentGroupId || undefined } : p
      ),
    });
  },

  duplicatePageGroup: async (groupId) => {
    const group = get().pageGroups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    // Create new group with "(Copy)" suffix
    const newGroup = await get().createPageGroup(
      group.playlistId,
      `${group.name} (Copy)`,
      group.parentGroupId
    );

    // Duplicate all pages in the group
    const pagesInGroup = get().pages.filter(p => p.pageGroupId === groupId);
    for (const page of pagesInGroup) {
      // Create new page
      const newPage = await get().createPage(
        page.playlistId,
        page.templateId,
        page.name,
        { ...page.payload },
        page.channelId || null
      );
      // Move new page to new group
      await get().movePageToGroup(newPage.id, newGroup.id);
    }

    return newGroup;
  },

  toggleGroupCollapsed: (groupId) => {
    const group = get().pageGroups.find(g => g.id === groupId);
    if (!group) return;

    const newIsCollapsed = !group.isCollapsed;

    // Optimistically update UI
    set({
      pageGroups: get().pageGroups.map((g) =>
        g.id === groupId ? { ...g, isCollapsed: newIsCollapsed } : g
      ),
    });

    // Save to DB in background
    supabase
      .from('pulsar_page_groups')
      .update({ is_collapsed: newIsCollapsed })
      .eq('id', groupId)
      .then(({ error }: { error: Error | null }) => {
        if (error) console.error('[pageStore] Failed to save group collapsed state:', error);
      });
  },

  reorderGroups: async (groupIds) => {
    // Optimistically update UI
    const reorderedGroups = get().pageGroups
      .map((g) => {
        const index = groupIds.indexOf(g.id);
        return index >= 0 ? { ...g, sortOrder: index } : g;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    set({ pageGroups: reorderedGroups });

    // Save to DB in background
    const saveToDb = async () => {
      try {
        const updates = groupIds.map((id, index) =>
          supabase
            .from('pulsar_page_groups')
            .update({ sort_order: index })
            .eq('id', id)
        );
        await Promise.all(updates);
      } catch (error) {
        console.error('[pageStore] Failed to save group order:', error);
      }
    };

    saveToDb();
  },

  reorderMixedItems: (itemIds) => {
    // itemIds are prefixed: 'group:xxx' or 'page:xxx'
    // Update sort orders for both groups and ungrouped pages to match new positions

    const groupUpdates: { id: string; sortOrder: number }[] = [];
    const pageUpdates: { id: string; sortOrder: number }[] = [];

    itemIds.forEach((itemId, index) => {
      if (itemId.startsWith('group:')) {
        const groupId = itemId.replace('group:', '');
        groupUpdates.push({ id: groupId, sortOrder: index });
      } else if (itemId.startsWith('page:')) {
        const pageId = itemId.replace('page:', '');
        pageUpdates.push({ id: pageId, sortOrder: index });
      }
    });

    // Optimistically update UI
    const updatedGroups = get().pageGroups.map((g) => {
      const update = groupUpdates.find((u) => u.id === g.id);
      return update ? { ...g, sortOrder: update.sortOrder } : g;
    });

    const updatedPages = get().pages.map((p) => {
      // Only update ungrouped pages
      if (!p.pageGroupId) {
        const update = pageUpdates.find((u) => u.id === p.id);
        return update ? { ...p, sortOrder: update.sortOrder } : p;
      }
      return p;
    });

    set({
      pageGroups: updatedGroups.sort((a, b) => a.sortOrder - b.sortOrder),
      pages: updatedPages,
    });

    // Save to DB in background
    const saveToDb = async () => {
      try {
        const groupDbUpdates = groupUpdates.map(({ id, sortOrder }) =>
          supabase
            .from('pulsar_page_groups')
            .update({ sort_order: sortOrder })
            .eq('id', id)
        );

        const pageDbUpdates = pageUpdates.map(({ id, sortOrder }) =>
          supabase
            .from('pulsar_pages')
            .update({ sort_order: sortOrder })
            .eq('id', id)
        );

        await Promise.all([...groupDbUpdates, ...pageDbUpdates]);
      } catch (error) {
        console.error('[pageStore] Failed to save mixed item order:', error);
      }
    };

    saveToDb();
  },

  updatePageChannel: async (pageId, channelId) => {
    const { error } = await supabase
      .from('pulsar_pages')
      .update({ channel_id: channelId })
      .eq('id', pageId);

    if (error) throw error;

    const updatedPages = get().pages.map((p) =>
      p.id === pageId ? { ...p, channelId: channelId || undefined } : p
    );
    const selectedPage = get().selectedPage;

    set({
      pages: updatedPages,
      // Also update selectedPage if it's the one being modified
      selectedPage: selectedPage?.id === pageId
        ? { ...selectedPage, channelId: channelId || undefined }
        : selectedPage,
    });
  },

  setPageOnAir: async (pageId, isOnAir) => {
    // Optimistically update UI first
    set({
      pages: get().pages.map((p) =>
        p.id === pageId ? { ...p, isOnAir } : p
      ),
    });

    // Update in database
    const { error } = await supabase
      .from('pulsar_pages')
      .update({ is_on_air: isOnAir })
      .eq('id', pageId);

    if (error) {
      console.error('[pageStore] Failed to update on-air state:', error);
      // Revert on error
      set({
        pages: get().pages.map((p) =>
          p.id === pageId ? { ...p, isOnAir: !isOnAir } : p
        ),
      });
      throw error;
    }
  },

  resetPagesOnAirForChannel: async (channelId: string) => {
    // Find all pages assigned to this channel that are currently on-air
    const pagesToReset = get().pages.filter(
      (p) => p.channelId === channelId && p.isOnAir
    );

    if (pagesToReset.length === 0) {
      console.log('[pageStore] No on-air pages to reset for channel:', channelId);
      return;
    }

    console.log('[pageStore] Resetting on-air state for', pagesToReset.length, 'pages on channel:', channelId);

    // Optimistically update UI first
    set({
      pages: get().pages.map((p) =>
        p.channelId === channelId && p.isOnAir ? { ...p, isOnAir: false } : p
      ),
    });

    // Update all pages in the database
    const pageIds = pagesToReset.map((p) => p.id);
    const { error } = await supabase
      .from('pulsar_pages')
      .update({ is_on_air: false })
      .in('id', pageIds);

    if (error) {
      console.error('[pageStore] Failed to reset on-air state for channel:', error);
      // Revert on error
      set({
        pages: get().pages.map((p) =>
          pageIds.includes(p.id) ? { ...p, isOnAir: true } : p
        ),
      });
      throw error;
    }
  },
}));
