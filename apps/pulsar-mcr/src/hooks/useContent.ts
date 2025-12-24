import { useState, useEffect, useCallback } from 'react';
import { supabase, sessionReady } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Content {
  id: string;
  name: string;
  type: 'bucketFolder' | 'bucket' | 'itemFolder' | 'item';
  active: boolean;
  schedule?: string;
  duration?: number | null;
  parent_id?: string;
  user_id?: string;
  order?: number;
  template_id?: string;
  content_id?: string;
  children?: Content[];
}

// Helper: Build tree from flat content array
const buildTree = (content: Content[]): Content[] => {
  const build = (items: Content[], parentId: string | null = null): Content[] =>
    items
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        ...item,
        children: build(items, item.id)
      }));
  return build(content);
};

// Helper: Deep equality check
const deepEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const useContent = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get effective organization for impersonation support
  const { effectiveOrganization, isSuperuser, user } = useAuth();

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for session to be restored from cookies before checking
      await sessionReady;

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('No active session - user needs to log in');
        setContent([]);
        setError('Please log in to view content');
        return;
      }

      // Get the effective organization ID for impersonation support
      const effectiveOrgId = effectiveOrganization?.id;
      console.log('[useContent] Fetching with effectiveOrgId:', effectiveOrgId);

      // Build base query - for superusers, filter by effective org to support impersonation
      let containersQuery = supabase
        .from('content')
        .select('*')
        .in('type', ['bucketFolder', 'bucket', 'itemFolder'])
        .order('order');

      let itemsQuery = supabase
        .from('content')
        .select('*')
        .eq('type', 'item')
        .order('order');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        containersQuery = containersQuery.eq('organization_id', effectiveOrgId);
        itemsQuery = itemsQuery.eq('organization_id', effectiveOrgId);
      }

      // Fetch all containers (unlimited)
      const { data: containers, error: containerError } = await containersQuery;

      if (containerError) throw containerError;

      // Then fetch items (can be limited since we have all parents)
      const { data: items, error: itemError } = await itemsQuery;

      if (itemError) throw itemError;

      // Combine both results
      const allContent = [...(containers || []), ...(items || [])];

      console.log('[useContent] Fetched content:', allContent.length, 'items for org:', effectiveOrgId);
      setContent(allContent);
    } catch (err) {
      console.error('Error in fetchContent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrganization?.id, isSuperuser]);

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchContent();
      } else if (event === 'SIGNED_OUT') {
        setContent([]);
        setError('You must be logged in to view content');
      }
    });

    // Initial fetch
    fetchContent();

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchContent]);

  const refreshContentIfNeeded = useCallback(async (expectedTree?: Content[]) => {
    try {
      // Wait for session to be restored, then check
      await sessionReady;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for refresh');
        return;
      }

      // Get the effective organization ID for impersonation support
      const effectiveOrgId = effectiveOrganization?.id;

      let query = supabase
        .from('content')
        .select('*')
        .order('order');

      // For superusers, filter by effective org to support impersonation
      if (isSuperuser && effectiveOrgId) {
        query = query.eq('organization_id', effectiveOrgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const dbContent = data || [];

      // Clear any previous errors on successful fetch
      setError(null);

      // If expectedTree is provided, compare
      if (expectedTree) {
        const dbTree = buildTree(dbContent);
        const expectedTreeBuilt = buildTree(expectedTree);
        if (!deepEqual(dbTree, expectedTreeBuilt)) {
          setContent(dbContent);
        }
      } else {
        // Just refresh
        setContent(dbContent);
      }
    } catch (err) {
      console.error('Error in refreshContentIfNeeded:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [effectiveOrganization?.id, isSuperuser]);

  const createContent = useCallback(async (newContent: Omit<Content, 'id' | 'user_id'>) => {
    try {
      setError(null); // Clear any previous errors
      const { children, ...contentWithoutChildren } = newContent as any;

      // Get the current maximum order value for the target parent
      let query = supabase
        .from('content')
        .select('order');

      if (contentWithoutChildren.parent_id) {
        query = query.eq('parent_id', contentWithoutChildren.parent_id);
      } else {
        query = query.is('parent_id', null);
      }

      const { data: existingContent } = await query;

      const maxOrder = existingContent?.reduce((max, ch) =>
        ch.order > max ? ch.order : max, -1) ?? -1;

      // Use user from auth context
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to create content');
      }

      // Use effective organization for new content
      const effectiveOrgId = effectiveOrganization?.id;

      const contentData = {
        ...contentWithoutChildren,
        user_id: user.auth_user_id,
        organization_id: effectiveOrgId,
        order: maxOrder + 1
      };

      const { data, error } = await supabase
        .from('content')
        .insert([contentData])
        .select()
        .single();

      if (error) {
        console.error('Error creating content:', error);
        throw error;
      }

      setContent(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in createContent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id, effectiveOrganization?.id]);

  const updateContent = useCallback(async (id: string, updates: Partial<Content>) => {
    try {
      setError(null); // Clear any previous errors
      const { children, ...updatesWithoutChildren } = updates as any;

      // Use user from auth context
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to update content');
      }

      const updateData = {
        ...updatesWithoutChildren
      };

      const { data, error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content:', error);
        throw error;
      }
      
      setContent(prev => prev.map(item =>
        item.id === id ? { ...item, ...data } : item
      ));
      return data;
    } catch (err) {
      console.error('Error in updateContent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  const deleteContent = useCallback(async (id: string) => {
    try {
      setError(null); // Clear any previous errors
      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to delete content');
      }

      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting content:', error);
        throw error;
      }

      setContent(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteContent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  // Batch delete multiple content items in a single database operation
  const deleteContentBatch = useCallback(async (ids: string[]) => {
    try {
      setError(null); // Clear any previous errors

      if (ids.length === 0) return { success: true };

      if (!user?.auth_user_id) {
        throw new Error('User must be authenticated to delete content');
      }

      const { error } = await supabase
        .from('content')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error batch deleting content:', error);
        throw error;
      }

      setContent(prev => prev.filter(item => !ids.includes(item.id)));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteContentBatch:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, [user?.auth_user_id]);

  return {
    content,
    loading,
    error,
    createContent,
    updateContent,
    deleteContent,
    deleteContentBatch,
    refreshContent: fetchContent,
    refreshContentIfNeeded,
    buildTree,
    deepEqual
  };
};