import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

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
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session - user needs to log in');
        setContent([]);
        setError('Please log in to view content');
        return;
      }
  
      // First fetch all containers (unlimited)
      const { data: containers, error: containerError } = await supabase
        .from('content')
        .select('*')
        .in('type', ['bucketFolder', 'bucket', 'itemFolder'])
        .order('order');
        
      if (containerError) throw containerError;
  
      // Then fetch items (can be limited since we have all parents)
      const { data: items, error: itemError } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'item')
        .order('order');
        
      if (itemError) throw itemError;
  
      // Combine both results
      const allContent = [...(containers || []), ...(items || [])];
      
      console.log('Fetched content:', allContent.length, 'items');
      setContent(allContent);
    } catch (err) {
      console.error('Error in fetchContent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshContentIfNeeded = async (expectedTree?: Content[]) => {
    try {
      // Check session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for refresh');
        return;
      }

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('order');

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
  };

  const createContent = async (content: Omit<Content, 'id' | 'user_id'>) => {
    try {
      setError(null); // Clear any previous errors
      const { children, ...contentWithoutChildren } = content as any;
      
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
      
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to create content');
      }
  
      const contentData = {
        ...contentWithoutChildren,
        user_id: userId,
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
  };

  const updateContent = async (id: string, updates: Partial<Content>) => {
    try {
      setError(null); // Clear any previous errors
      const { children, ...updatesWithoutChildren } = updates as any;
      
      const userId = await getCurrentUserId();
      if (!userId) {
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
  };

  const deleteContent = async (id: string) => {
    try {
      setError(null); // Clear any previous errors
      const userId = await getCurrentUserId();
      if (!userId) {
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
  };

  // Batch delete multiple content items in a single database operation
  const deleteContentBatch = async (ids: string[]) => {
    try {
      setError(null); // Clear any previous errors

      if (ids.length === 0) return { success: true };

      const userId = await getCurrentUserId();
      if (!userId) {
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
  };

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