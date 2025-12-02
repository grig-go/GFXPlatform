import type { Project, Layer, Folder, Template } from '@emergent-platform/types';
/**
 * Get all projects for the current user's organization
 */
export declare function getProjects(): Promise<Project[]>;
/**
 * Get a single project by ID
 */
export declare function getProject(projectId: string): Promise<Project | null>;
/**
 * Create a new project
 */
export declare function createProject(project: Partial<Project>): Promise<Project | null>;
/**
 * Update a project
 */
export declare function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null>;
/**
 * Archive a project (soft delete)
 */
export declare function archiveProject(projectId: string): Promise<boolean>;
/**
 * Delete a project permanently
 */
export declare function deleteProject(projectId: string): Promise<boolean>;
/**
 * Get all layers for a project
 */
export declare function getProjectLayers(projectId: string): Promise<Layer[]>;
/**
 * Get all folders for a project
 */
export declare function getProjectFolders(projectId: string): Promise<Folder[]>;
/**
 * Get all templates for a project
 */
export declare function getProjectTemplates(projectId: string): Promise<Template[]>;
//# sourceMappingURL=projects.d.ts.map