import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { Project, CreateProjectParams, UpdateProjectParams } from '../types/project';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  loadActiveProject: () => Promise<void>;
  createProject: (params: CreateProjectParams) => Promise<Project | null>;
  updateProject: (params: UpdateProjectParams) => Promise<Project | null>;
  updateProjectChannel: (channelId: string) => Promise<void>;
  setActiveProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<boolean>;
  clearActiveProject: () => void;
  hasActiveProject: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('pulsarvs_get_projects');
      
      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }
      
      if (data?.success && data?.data) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }, []);

  const loadActiveProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('pulsarvs_get_active_project');
      
      if (error) {
        console.error('Error fetching active project:', error);
        setActiveProjectState(null);
        setIsLoading(false);
        return;
      }
      
      if (data?.success && data?.data) {
        setActiveProjectState(data.data);
        console.log('[ProjectContext] Active project loaded:', data.data.name);
      } else {
        setActiveProjectState(null);
        console.log('[ProjectContext] No active project found');
      }
    } catch (err) {
      console.error('Error loading active project:', err);
      setError(String(err));
      setActiveProjectState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProjectFn = useCallback(async (params: CreateProjectParams): Promise<Project | null> => {
    try {
      const { data, error } = await supabase.rpc('pulsarvs_create_project', {
        p_name: params.name,
        p_description: params.description || null,
        p_default_channel_id: params.default_channel_id || null,
        p_default_instance_id: params.default_instance_id || null,
        p_color: params.color || 'blue',
        p_icon: params.icon || '📁',
        p_settings: params.settings || {}
      });
      
      if (error) {
        console.error('Error creating project:', error);
        toast.error('Failed to create project', { description: error.message });
        return null;
      }
      
      if (data?.success && data?.data) {
        await loadProjects();
        toast.success(`Project "${params.name}" created`);
        return data.data;
      }
      
      toast.error('Failed to create project');
      return null;
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
      return null;
    }
  }, [loadProjects]);

  const updateProjectFn = useCallback(async (params: UpdateProjectParams): Promise<Project | null> => {
    try {
      const { data, error } = await supabase.rpc('pulsarvs_update_project', {
        p_id: params.id,
        p_name: params.name || null,
        p_description: params.description || null,
        p_default_channel_id: params.default_channel_id || null,
        p_default_instance_id: params.default_instance_id || null,
        p_color: params.color || null,
        p_icon: params.icon || null,
        p_settings: params.settings || null
      });
      
      if (error) {
        console.error('Error updating project:', error);
        toast.error('Failed to update project', { description: error.message });
        return null;
      }
      
      if (data?.success && data?.data) {
        await loadProjects();
        if (activeProject?.id === params.id) {
          await loadActiveProject();
        }
        toast.success('Project updated');
        return data.data;
      }
      
      toast.error('Failed to update project');
      return null;
    } catch (err) {
      console.error('Error updating project:', err);
      toast.error('Failed to update project');
      return null;
    }
  }, [loadProjects, loadActiveProject, activeProject]);

  const updateProjectChannelFn = useCallback(async (channelId: string) => {
    if (!activeProject) {
      console.log('[ProjectContext] No active project to update channel');
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('pulsarvs_update_project', {
        p_id: activeProject.id,
        p_name: null,
        p_description: null,
        p_default_channel_id: channelId,
        p_default_instance_id: null,
        p_color: null,
        p_icon: null,
        p_settings: null
      });
      
      if (error) {
        console.error('Error updating project channel:', error);
        return;
      }
      
      if (data?.success && data?.data) {
        await loadProjects();
        if (activeProject?.id === data.data.id) {
          await loadActiveProject();
        }
        console.log('[ProjectContext] Project channel updated to:', channelId);
      }
    } catch (err) {
      console.error('Error updating project channel:', err);
    }
  }, [loadProjects, loadActiveProject, activeProject]);

  const setActiveProjectFn = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('pulsarvs_set_active_project', {
        p_id: projectId
      });
      
      if (error) {
        console.error('Error setting active project:', error);
        toast.error('Failed to switch project', { description: error.message });
        return;
      }
      
      if (data?.success && data?.data) {
        setActiveProjectState(data.data);
        await loadProjects();
        toast.success(`Switched to "${data.data.name}"`);
      } else {
        toast.error('Failed to switch project');
      }
    } catch (err) {
      console.error('Error setting active project:', err);
      toast.error('Failed to switch project');
    } finally {
      setIsLoading(false);
    }
  }, [loadProjects]);

  const deleteProjectFn = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('pulsarvs_delete_project', {
        p_id: projectId
      });
      
      if (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project', { description: error.message });
        return false;
      }
      
      if (data?.success) {
        await loadProjects();
        if (activeProject?.id === projectId) {
          setActiveProjectState(null);
        }
        toast.success('Project deleted');
        return true;
      }
      
      toast.error('Failed to delete project');
      return false;
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
      return false;
    }
  }, [loadProjects, activeProject]);

  const clearActiveProject = useCallback(() => {
    setActiveProjectState(null);
  }, []);

  useEffect(() => {
    loadProjects();
    loadActiveProject();
  }, [loadProjects, loadActiveProject]);

  const value: ProjectContextType = {
    projects,
    activeProject,
    isLoading,
    error,
    loadProjects,
    loadActiveProject,
    createProject: createProjectFn,
    updateProject: updateProjectFn,
    updateProjectChannel: updateProjectChannelFn,
    setActiveProject: setActiveProjectFn,
    deleteProject: deleteProjectFn,
    clearActiveProject,
    hasActiveProject: activeProject !== null
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export function useActiveProject() {
  const { activeProject, isLoading, hasActiveProject } = useProject();
  return { activeProject, isLoading, hasActiveProject };
}