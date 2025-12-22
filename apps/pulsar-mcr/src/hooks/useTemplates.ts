import { useState, useEffect } from 'react';
import { supabase, sessionReady } from '../lib/supabase';

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export interface Template {
  id: string;
  name: string;
  type: 'templateFolder' | 'template';
  active: boolean;
  parent_id?: string;
  user_id?: string;
  order?: number;
  is_favorite?: boolean;
  is_default?: boolean;
  carousel_name?: string;
  // Optionally add children if you need tree structure:
  children?: Template[];
}

export interface TemplateSettings {
  template_id: string;
  settings: {
    displayNameFormat?: string;
    [key: string]: any;
  };
  scripting_enabled?: boolean;
  advanced_validation_enabled?: boolean;
}

// Helper: Build tree from flat templates array
const buildTree = (templates: Template[]): Template[] => {
  // Add this guard clause
  if (!templates) {
    console.warn('Templates data is undefined or null');
    return [];
  }

  const build = (items: Template[], parentId: string | null = null): Template[] => {
    // Add another guard clause for safety
    if (!items) {
      return [];
    }

    return items
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => ({
        ...item,
        children: build(items, item.id)
      }));
  };
  
  return build(templates);
};

// Helper: Deep equality check
const deepEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSettings, setTemplateSettings] = useState<Record<string, TemplateSettings['settings']>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchTemplates();
      } else if (event === 'SIGNED_OUT') {
        setTemplates([]);
        setTemplateSettings({});
        setError('You must be logged in to view templates');
      }
    });

    // Initial fetch
    fetchTemplates();

    // Set up real-time subscription for template_settings changes
    const settingsSubscription = supabase
      .channel('template_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'template_settings'
        },
        (payload) => {
          console.log('Template settings changed:', payload);

          if (payload.eventType === 'DELETE') {
            // Remove the deleted template's settings
            const deletedTemplateId = payload.old?.template_id;
            if (deletedTemplateId) {
              setTemplateSettings(prev => {
                const updated = { ...prev };
                delete updated[deletedTemplateId];
                return updated;
              });
            }
          } else {
            // INSERT or UPDATE - update the settings map
            const newRecord = payload.new as { template_id: string; settings: TemplateSettings['settings'] };
            if (newRecord?.template_id) {
              setTemplateSettings(prev => ({
                ...prev,
                [newRecord.template_id]: newRecord.settings || {}
              }));
            }
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
      settingsSubscription.unsubscribe();
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for session to be restored from cookies before checking
      await sessionReady;

      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session - user needs to log in');
        setTemplates([]);
        setError('Please log in to view templates');
        return;
      }

      console.log('Fetching templates for user:', session.user.id);

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('order');

      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }

      // Fetch template_settings for displayNameFormat
      const { data: settingsData, error: settingsError } = await supabase
        .from('template_settings')
        .select('template_id, settings');

      if (settingsError) {
        console.error('Error fetching template_settings:', settingsError);
        // Don't throw - settings are optional
      }

      // Build a map of template_id -> settings
      const settingsMap: Record<string, TemplateSettings['settings']> = {};
      settingsData?.forEach(s => {
        settingsMap[s.template_id] = s.settings || {};
      });
      setTemplateSettings(settingsMap);

      console.log('Fetched templates:', data);
      setTemplates(data || []);
    } catch (err) {
      console.error('Error in fetchTemplates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * refreshTemplatesIfNeeded:
   * Compares the expected tree (provided as a parameter) with the latest DB tree.
   * If they differ, updates the local templates state.
   */
  const refreshTemplatesIfNeeded = async (newData?: Template[]): Promise<void> => {
    try {
      // Check session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for refresh');
        return;
      }

      // If newData is provided, validate it before using it
      if (newData) {
        // Use the provided data
        setTemplates(newData);
      } else {
        // Otherwise, fetch fresh data
        setLoading(true);
        
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('order');
        
        if (error) {
          throw error;
        }
        
        // Ensure data is not null or undefined before using it
        if (data) {
          setTemplates(data);
        } else {
          // Set empty array if no data returned
          setTemplates([]);
        }
      }
    } catch (err) {
      console.error('Error refreshing templates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Omit<Template, 'id' | 'user_id'>) => {
    try {
      // Remove children from the template object before sending to the database
      const { children, ...templateWithoutChildren } = template as any;
      
      // Get the current maximum order value for the target parent
      let query = supabase
        .from('templates')
        .select('order');
      
      if (templateWithoutChildren.parent_id) {
        query = query.eq('parent_id', templateWithoutChildren.parent_id);
      } else {
        query = query.is('parent_id', null);
      }
  
      const { data: existingTemplates } = await query;
  
      const maxOrder = existingTemplates?.reduce((max, ch) => 
        ch.order > max ? ch.order : max, -1) ?? -1;
      
      // Get the current user's ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to create templates');
      }
      
      // Add the user_id to the template data
      const templateData = {
        ...templateWithoutChildren,
        user_id: userId,
        order: maxOrder + 1
      };
      
      const { data, error } = await supabase
        .from('templates')
        .insert([templateData])
        .select()
        .single();
        
      if (error) {
        console.error('Error creating template:', error);
        throw error;
      }
      
      setTemplates(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error in createTemplate:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<Template>) => {
    try {
      // Remove children from the updates object before sending to the database
      const { children, ...updatesWithoutChildren } = updates as any;
      
      // Get the current user's ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to update templates');
      }
      
      // Don't override user_id in updates
      const updateData = {
        ...updatesWithoutChildren
      };
      
      const { data, error } = await supabase
        .from('templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating template:', error);
        throw error;
      }
      
      setTemplates(prev => prev.map(template => 
        template.id === id ? { ...template, ...data } : template
      ));
      
      return data;
    } catch (err) {
      console.error('Error in updateTemplate:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      // Get the current user's ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to delete templates');
      }
      
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting template:', error);
        throw error;
      }
      
      setTemplates(prev => prev.filter(template => template.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error in deleteTemplate:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };
  
  // Batch update for multiple templates, useful for reordering
  const batchUpdateTemplates = async (updates: { id: string, updates: Partial<Template> }[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to update templates');
      }

      // Create an array of promises for each update
      const updatePromises = updates.map(({ id, updates }) => {
        const { children, ...updatesWithoutChildren } = updates as any;
        
        return supabase
          .from('templates')
          .update(updatesWithoutChildren)
          .eq('id', id);
      });

      // Execute all updates in parallel
      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} updates failed`);
      }

      // Refresh the templates list to ensure consistency
      fetchTemplates();

      return true;
    } catch (err) {
      console.error('Error in batchUpdateTemplates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Toggle favorite status for a template
  const toggleFavorite = async (id: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to update templates');
      }

      // Find the current template
      const template = templates.find(t => t.id === id);
      if (!template) {
        throw new Error('Template not found');
      }

      const newFavoriteStatus = !template.is_favorite;

      const { data, error } = await supabase
        .from('templates')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }

      // Update local state
      setTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, is_favorite: newFavoriteStatus } : t
      ));

      return data;
    } catch (err) {
      console.error('Error in toggleFavorite:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Set a template as the default (only one can be default at a time)
  const setDefaultTemplate = async (id: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated to update templates');
      }

      // Find the current template
      const template = templates.find(t => t.id === id);
      if (!template) {
        throw new Error('Template not found');
      }

      // If already default, toggle it off
      const newDefaultStatus = !template.is_default;

      if (newDefaultStatus) {
        // First, unset any existing default template for this user
        await supabase
          .from('templates')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      // Set the new default
      const { data, error } = await supabase
        .from('templates')
        .update({ is_default: newDefaultStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error setting default template:', error);
        throw error;
      }

      // Update local state - clear previous default and set new one
      setTemplates(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, is_default: newDefaultStatus };
        }
        // Clear previous default if setting a new one
        if (newDefaultStatus && t.is_default) {
          return { ...t, is_default: false };
        }
        return t;
      }));

      return data;
    } catch (err) {
      console.error('Error in setDefaultTemplate:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Get unique carousel names from all templates
  const getUniqueCarouselNames = (): string[] => {
    const carouselNames = templates
      .filter(t => t.carousel_name)
      .map(t => t.carousel_name as string);
    return [...new Set(carouselNames)].sort();
  };

  return {
    templates,
    templateSettings,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    batchUpdateTemplates,
    toggleFavorite,
    setDefaultTemplate,
    refreshTemplates: fetchTemplates,
    refreshTemplatesIfNeeded,
    buildTree,
    deepEqual,
    getUniqueCarouselNames
  };
};