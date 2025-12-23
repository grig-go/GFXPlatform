import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import * as projectService from '../services/supabase/projectService';
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
      console.log('[ProjectContext] loadProjects called');
      const result = await projectService.getProjects();
      console.log('[ProjectContext] loadProjects result:', result);

      if (!result.success) {
        console.error('Error fetching projects:', result.error);
        return;
      }

      if (result.data) {
        setProjects(result.data);
        console.log('[ProjectContext] Projects loaded:', result.data.length);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }, []);

  const loadActiveProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[ProjectContext] loadActiveProject called');
      const result = await projectService.getActiveProject();
      console.log('[ProjectContext] loadActiveProject result:', result);

      if (!result.success) {
        console.error('Error fetching active project:', result.error);
        setActiveProjectState(null);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        setActiveProjectState(result.data);
        console.log('[ProjectContext] Active project loaded:', result.data.name);
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
      const result = await projectService.createProject(params);

      if (!result.success) {
        console.error('Error creating project:', result.error);
        toast.error('Failed to create project', { description: result.error });
        return null;
      }

      if (result.data) {
        await loadProjects();
        toast.success(`Project "${params.name}" created`);
        return result.data;
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
      const result = await projectService.updateProject(params);

      if (!result.success) {
        console.error('Error updating project:', result.error);
        toast.error('Failed to update project', { description: result.error });
        return null;
      }

      if (result.data) {
        await loadProjects();
        if (activeProject?.id === params.id) {
          await loadActiveProject();
        }
        toast.success('Project updated');
        return result.data;
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
      const result = await projectService.updateProject({
        id: activeProject.id,
        default_channel_id: channelId,
      });

      if (!result.success) {
        console.error('Error updating project channel:', result.error);
        return;
      }

      if (result.data) {
        await loadProjects();
        if (activeProject?.id === result.data.id) {
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
      const result = await projectService.setActiveProject(projectId);

      if (!result.success) {
        console.error('Error setting active project:', result.error);
        toast.error('Failed to switch project', { description: result.error });
        return;
      }

      if (result.data) {
        setActiveProjectState(result.data);
        await loadProjects();
        toast.success(`Switched to "${result.data.name}"`);
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
      const result = await projectService.deleteProject(projectId);

      if (!result.success) {
        console.error('Error deleting project:', result.error);
        toast.error('Failed to delete project', { description: result.error });
        return false;
      }

      await loadProjects();
      if (activeProject?.id === projectId) {
        setActiveProjectState(null);
      }
      toast.success('Project deleted');
      return true;
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