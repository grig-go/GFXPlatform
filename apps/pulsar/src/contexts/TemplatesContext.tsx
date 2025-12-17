// src/contexts/TemplatesContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { TabField } from '../types/widget';

// Define the TreeNode interface that matches your existing code
interface TreeNode {
  id: string;
  name: string;
  active: boolean;
  type: 'templateFolder' | 'template';
  parent_id?: string;
  order?: number;
  children?: TreeNode[];
  carousel_name?: string;  // The carousel this template belongs to
}

// Define the context interface
interface TemplatesContextType {
  templates: TreeNode[];
  loading: boolean;
  error: string | null;
  createTemplate: (template: Omit<TreeNode, 'id'>) => Promise<any>;
  updateTemplate: (id: string, updates: Partial<TreeNode>) => Promise<any>;
  deleteTemplate: (id: string) => Promise<any>;
  refreshTemplates: () => Promise<void>;
  refreshTemplatesIfNeeded: (newData?: TreeNode[]) => Promise<void>;
  createTemplateWithTabfields: (template: Omit<TreeNode, 'id'>, tabfields: Omit<TabField, 'id' | 'template_id'>[]) => Promise<{ data: TreeNode | null, error: any }>;
  getUniqueCarouselNames: () => string[];
}

// Create the context with an initial undefined value
const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

// Props for the provider component
interface TemplatesProviderProps {
  children: ReactNode;
}

export const TemplatesProvider: React.FC<TemplatesProviderProps> = ({ children }) => {
  const [templates, setTemplates] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTemplates = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('order');
        
      if (error) throw error;
      setTemplates(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Functions for CRUD operations
  const createTemplate = async (template: Omit<TreeNode, 'id'>) => {
    const result = await supabase.from('templates').insert(template).select().single();
    if (result.data) {
      setTemplates([...templates, result.data]);
    }
    return result;
  };
  
  const updateTemplate = async (id: string, updates: Partial<TreeNode>) => {
    const result = await supabase.from('templates').update(updates).eq('id', id);
    if (result.data) {
      setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t));
    }
    return result;
  };
  
  const deleteTemplate = async (id: string) => {
    const result = await supabase.from('templates').delete().eq('id', id);
    if (result.data) {
      setTemplates(templates.filter(t => t.id !== id));
    }
    return result;
  };
  
  const refreshTemplates = async (): Promise<void> => {
    return fetchTemplates();
  };
  
  const refreshTemplatesIfNeeded = async (_newData?: TreeNode[]): Promise<void> => {
    return fetchTemplates();
  };

  // Get unique carousel names from all templates
  const getUniqueCarouselNames = (): string[] => {
    const carouselNames = templates
      .filter(t => t.carousel_name)
      .map(t => t.carousel_name as string);
    return [...new Set(carouselNames)].sort();
  };

  // Add this function inside your TemplatesProvider component
  const createTemplateWithTabfields = async (
    template: Omit<TreeNode, 'id'>, 
    tabfields: Omit<TabField, 'id' | 'template_id'>[]
  ) => {
    try {
      // First create the template
      const { data: newTemplate, error: templateError } = await supabase
        .from('templates')
        .insert(template)
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      if (newTemplate && tabfields.length > 0) {
        // Verify the template was created successfully
        const { data: verifiedTemplate, error: verifyError } = await supabase
          .from('templates')
          .select('id')
          .eq('id', newTemplate.id)
          .single();
        
        if (verifyError) {
          console.error('Template verification failed:', verifyError);
          throw verifyError;
        }
        
        if (verifiedTemplate) {
          // Create tabfields one by one to better handle errors
          for (const tabfield of tabfields) {
            try {
              await supabase
                .from('tabfields')
                .insert({
                  template_id: newTemplate.id,
                  name: tabfield.name,
                  value: tabfield.value,
                  options: tabfield.options
                });
            } catch (tabfieldError) {
              console.error(`Error creating tabfield ${tabfield.name}:`, tabfieldError);
              // Continue with other tabfields even if one fails
            }
          }
        }
      }
      
      // Update the templates state with the new template
      if (newTemplate) {
        setTemplates(prevTemplates => [...prevTemplates, newTemplate]);
      }
      
      return { data: newTemplate, error: null };
    } catch (error) {
      console.error('Error in createTemplateWithTabfields:', error);
      return { data: null, error };
    }
  };
  
  const value: TemplatesContextType = {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refreshTemplates,
    refreshTemplatesIfNeeded,
    createTemplateWithTabfields,
    getUniqueCarouselNames
  };
  
  return (
    <TemplatesContext.Provider value={value}>
      {children}
    </TemplatesContext.Provider>
  );
};

// Custom hook to use the templates context
export const useTemplates = (): TemplatesContextType => {
  const context = useContext(TemplatesContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
};