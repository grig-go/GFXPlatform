import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FolderOpen,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Pencil,
  LayoutGrid,
  List,
  Tv,
  Rocket,
  Library,
  BookTemplate,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';

// Pulsar GFX "P" icon component - matches the Pulsar GFX app icon style
function PulsarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Rounded blue background - larger box */}
      <rect x="0" y="0" width="32" height="32" rx="6" fill="#3B82F6" />
      {/* White "P" letter - same relative size */}
      <path
        d="M11 7h8a5.5 5.5 0 0 1 0 11H11V7z"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
      />
      <path
        d="M11 7v18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@emergent-platform/ui';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { AIModelSettingsDialog } from '@/components/dialogs/AIModelSettingsDialog';
import { KeyboardShortcutsDialog } from '@/components/dialogs/KeyboardShortcutsDialog';
import { SystemTemplatesDialog } from '@/components/dialogs/SystemTemplatesDialog';
import { TopBar } from '@/components/layout/TopBar';
import { directRestSelect } from '@emergent-platform/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  fetchProject,
  fetchLayers,
  fetchTemplates,
  fetchElements,
  fetchAnimations,
  fetchKeyframes,
} from '@/services/projectService';
import type { Project } from '@emergent-platform/types';

type ViewMode = 'list' | 'cards';
type SortBy = 'name' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Keyboard shortcuts
  const { shortcuts, updateShortcut, resetAllShortcuts } = useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcutsDialog(true),
  });

  // Track if we've already started loading to prevent double-loading in strict mode
  const hasStartedLoading = useRef(false);
  const lastOrgId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Load projects on initial mount or when organization changes
    const orgChanged = lastOrgId.current !== undefined && lastOrgId.current !== user?.organizationId;

    if (!hasStartedLoading.current || orgChanged) {
      hasStartedLoading.current = true;
      lastOrgId.current = user?.organizationId;
      loadProjects();
    }
  }, [user?.organizationId]);

  const loadProjects = async () => {
    console.log('[ProjectList] Loading projects via direct REST API...');
    setIsLoading(true);
    try {
      // First, load localStorage projects
      const localProjects: Project[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nova-project-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            if (data.project && !data.project.archived) {
              localProjects.push(data.project);
            }
          } catch (e) {
            console.warn('Failed to parse localStorage project:', key);
          }
        }
      }
      console.log('[ProjectList] Found', localProjects.length, 'localStorage projects');

      // Use direct REST API for reliable project loading
      // Note: directRestSelect doesn't support joins, so we load projects without user info
      const result = await directRestSelect<Project>(
        'gfx_projects',
        '*',
        user?.organizationId ? { column: 'organization_id', value: user.organizationId } : undefined,
        10000
      );

      if (result.error) {
        console.error('[ProjectList] Error loading from Supabase:', result.error);
        // Use localStorage projects only
        const sortedLocalProjects = localProjects.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setProjects(sortedLocalProjects);
      } else {
        // Filter out archived projects (REST API doesn't support multiple filters easily)
        const supabaseProjects: Project[] = (result.data || []).filter(p => !p.archived);
        console.log('[ProjectList] Loaded', supabaseProjects.length, 'projects from Supabase');

        // Create a map with project ID as key to ensure uniqueness
        const projectMap = new Map<string, Project>();

        // First, add all Supabase projects
        supabaseProjects.forEach(p => {
          projectMap.set(p.id, p);
        });

        // Then, overlay localStorage projects (they take priority but preserve Supabase thumbnail_url)
        localProjects.forEach(localProject => {
          const existingProject = projectMap.get(localProject.id);
          if (existingProject?.thumbnail_url && !localProject.thumbnail_url) {
            projectMap.set(localProject.id, { ...localProject, thumbnail_url: existingProject.thumbnail_url });
          } else {
            projectMap.set(localProject.id, localProject);
          }
        });

        // Convert map to array and sort by updated_at
        const mergedProjects = Array.from(projectMap.values()).sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        console.log('[ProjectList] Total merged projects:', mergedProjects.length, '(deduplicated by ID)');
        setProjects(mergedProjects);
      }
    } catch (err) {
      console.error('[ProjectList] Unexpected error:', err);
    } finally {
      console.log('[ProjectList] Done loading, setting isLoading=false');
      setIsLoading(false);
    }
  };

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'updated_at') {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const createNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const duplicateProject = async (projectId: string) => {
    try {
      const { duplicateProject: duplicateProjectService } = await import('@/services/projectService');
      const newProject = await duplicateProjectService(projectId);

      if (newProject) {
        await loadProjects();
      } else {
        console.error('Failed to duplicate project');
      }
    } catch (err) {
      console.error('Error duplicating project:', err);
    }
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const deleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const { deleteProject: deleteProjectService } = await import('@/services/projectService');
      const success = await deleteProjectService(projectToDelete);

      if (success) {
        setProjects(projects.filter(p => p.id !== projectToDelete));
      } else {
        console.error('Failed to delete project');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Preview project - loads project data and opens preview window
  const handlePreview = async (projectId: string) => {
    console.log('[ProjectList] handlePreview called for project:', projectId);
    try {
      // Load project data from database
      const project = await fetchProject(projectId);
      if (!project) {
        console.error('Project not found:', projectId);
        return;
      }

      const [layers, templates] = await Promise.all([
        fetchLayers(projectId),
        fetchTemplates(projectId),
      ]);

      // Fetch all elements, animations, and keyframes for all templates
      const allElements: any[] = [];
      const allAnimations: any[] = [];
      const allKeyframes: any[] = [];

      for (const template of templates) {
        const [elements, animations] = await Promise.all([
          fetchElements(template.id),
          fetchAnimations(template.id),
        ]);

        allElements.push(...elements);

        // Fetch keyframes for each animation
        for (const anim of animations) {
          const keyframes = await fetchKeyframes(anim.id);
          allKeyframes.push(...keyframes);
        }
        allAnimations.push(...animations);
      }

      // Store preview data in localStorage for the preview window
      const previewData = {
        layers,
        templates,
        elements: allElements,
        animations: allAnimations,
        keyframes: allKeyframes,
        currentTemplateId: templates[0]?.id || null,
        project,
      };
      localStorage.setItem('nova-preview-data', JSON.stringify(previewData));

      // Open preview window with project dimensions
      const width = project.canvas_width || 1920;
      const height = project.canvas_height || 1080;
      const windowWidth = Math.min(width + 60, window.screen.width - 100);
      const windowHeight = Math.min(height + 140, window.screen.height - 100);

      window.open(
        '/preview',
        `nova-preview-${projectId}`,
        `width=${windowWidth},height=${windowHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      );
    } catch (err) {
      console.error('Failed to load project for preview:', err);
    }
  };

  // Publish project - opens the project and shows publish dialog
  const handlePublish = (projectId: string) => {
    console.log('[ProjectList] handlePublish called for project:', projectId);
    // Navigate to project with publish param to auto-open publish dialog
    navigate(`/projects/${projectId}?action=publish`);
  };

  // Control project - open Pulsar GFX with this project selected
  const handleControl = (projectId: string) => {
    // Open Pulsar GFX (port 5174) with the project ID
    // Pulsar will load the project's templates for playback control
    window.open(
      `http://localhost:5174/templates?projectId=${projectId}`,
      `pulsar-gfx-${projectId}`,
      'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  const handleLibrary = () => {
    console.log('Open Library');
    // TODO: Implement library
  };

  const handleTemplates = () => {
    setShowTemplatesDialog(true);
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col overflow-hidden">
      {/* Top Menu Bar - same as Designer */}
      <TopBar
        onOpenAISettings={() => setShowAISettingsDialog(true)}
        onShowKeyboardShortcuts={() => setShowShortcutsDialog(true)}
      />

      {/* Main Content - scrollable area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {/* Title and Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Projects</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
                Create and manage your broadcast graphics projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleLibrary}
                className="hidden sm:flex"
              >
                <Library className="w-4 h-4 mr-2" />
                Library
              </Button>
              <Button
                variant="outline"
                onClick={handleTemplates}
                className="hidden sm:flex"
              >
                <BookTemplate className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button
                onClick={createNewProject}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>

          {/* Mobile Library/Templates buttons */}
          <div className="flex sm:hidden gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleLibrary}
              className="flex-1"
              size="sm"
            >
              <Library className="w-4 h-4 mr-2" />
              Library
            </Button>
            <Button
              variant="outline"
              onClick={handleTemplates}
              className="flex-1"
              size="sm"
            >
              <BookTemplate className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </div>

          {/* Search, Filters, and View Toggle Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card h-9 sm:h-10"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              {/* Sort By */}
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] h-9 sm:h-10 bg-card">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="updated_at">Updated</SelectItem>
                  <SelectItem value="created_at">Created</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              </Button>

              {/* View Toggle */}
              <div className="flex items-center border rounded-md bg-card">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-r-none"
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-l-none"
                  onClick={() => setViewMode('cards')}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Projects Content */}
          {isLoading ? (
            viewMode === 'list' ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 sm:h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-10 sm:py-16">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium mb-1">No projects found</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Create your first project to get started'}
              </p>
              {!search && (
                <Button
                  onClick={createNewProject}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="border rounded-lg bg-card overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_120px_150px_200px] gap-4 px-4 py-3 bg-muted/50 border-b text-xs sm:text-sm font-medium text-muted-foreground">
                <div className="w-10"></div>
                <div>Name</div>
                <div className="hidden sm:block">Updated by</div>
                <div className="hidden sm:block">Updated</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredAndSortedProjects.map((project) => (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onPreview={() => handlePreview(project.id)}
                    onPublish={() => handlePublish(project.id)}
                    onControl={() => handleControl(project.id)}
                    onDuplicate={() => duplicateProject(project.id)}
                    onDelete={() => handleDeleteClick(project.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredAndSortedProjects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  onPreview={() => handlePreview(proj.id)}
                  onPublish={() => handlePublish(proj.id)}
                  onControl={() => handleControl(proj.id)}
                  onDuplicate={() => duplicateProject(proj.id)}
                  onDelete={() => handleDeleteClick(proj.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={deleteProject}
      />

      {/* AI Settings Dialog */}
      <AIModelSettingsDialog
        open={showAISettingsDialog}
        onOpenChange={setShowAISettingsDialog}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
        shortcuts={shortcuts}
        onUpdateShortcut={updateShortcut}
        onResetAll={resetAllShortcuts}
      />

      {/* System Templates Dialog */}
      <SystemTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
      />
    </div>
  );
}

/* List Row Component */
interface ProjectListRowProps {
  project: Project;
  onClick: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onControl: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectListRow({ project, onClick, onPreview, onPublish, onControl, onDuplicate, onDelete }: ProjectListRowProps) {
  // Generate initials from project name for avatar
  const initials = (project.name || 'Project')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Generate a consistent color based on project name
  const colorHash = (project.name || 'P').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = colorHash % 360;
  const avatarColor = `hsl(${hue}, 60%, 45%)`;

  // Get updater display name (fall back to creator if no updater)
  const updaterName = (() => {
    const updater = (project as any).updater;
    const creator = (project as any).creator;
    const user = updater || creator;
    if (!user) return '—';
    if (user.name) {
      return user.name;
    }
    // Fall back to email username
    return user.email?.split('@')[0] || '—';
  })();

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_120px_150px_200px] gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer items-center transition-colors"
      onClick={onClick}
    >
      {/* Icon/Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate text-sm">{project.name || 'Untitled Project'}</h3>
          {project.is_live && (
            <span className="flex items-center gap-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
        )}
        {/* Mobile: Show updated time here */}
        <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
          {formatRelativeTime(project.updated_at)}
        </p>
      </div>

      {/* Updated by - Desktop only */}
      <div className="hidden sm:block text-sm text-muted-foreground truncate">
        {updaterName}
      </div>

      {/* Updated - Desktop only */}
      <div className="hidden sm:block text-sm text-muted-foreground">
        {formatRelativeTime(project.updated_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Quick Actions - Desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onPreview();
            }}
            title="Preview"
          >
            <Tv className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onPublish();
            }}
            title="Publish"
          >
            <Rocket className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onControl();
            }}
            title="Control"
          >
            <PulsarIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* More Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* Card Component */
interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onControl: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onClick, onPreview, onPublish, onControl, onDuplicate, onDelete }: ProjectCardProps) {
  // Generate initials from project name for avatar (fallback when no thumbnail)
  const initials = (project.name || 'Project')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Generate a consistent color based on project name
  const colorHash = (project.name || 'P').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = colorHash % 360;
  const avatarColor = `hsl(${hue}, 60%, 45%)`;

  const hasThumbnail = !!project.thumbnail_url;

  // Get updater display name (fall back to creator if no updater)
  const updaterName = (() => {
    const updater = (project as any).updater;
    const creator = (project as any).creator;
    const user = updater || creator;
    if (!user) return null;
    if (user.name) {
      return user.name;
    }
    // Fall back to email username
    return user.email?.split('@')[0] || null;
  })();

  return (
    <div
      className="group relative rounded-lg border bg-card hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-neutral-900 rounded-t-lg relative overflow-hidden min-h-[100px]">
        {/* Checkerboard background (always shown) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #252525 25%, transparent 25%),
              linear-gradient(-45deg, #252525 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #252525 75%),
              linear-gradient(-45deg, transparent 75%, #252525 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Actual thumbnail image */}
        {hasThumbnail ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Fallback: Project Avatar/Icon */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <span className="text-xs text-muted-foreground/70">
              {project.canvas_width} × {project.canvas_height}
            </span>
          </div>
        )}

        {/* Live Badge */}
        {project.is_live && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}

        {/* Resolution badge (shown on hover or when no thumbnail) */}
        {hasThumbnail && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {project.canvas_width} × {project.canvas_height}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 bg-card">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate text-sm sm:text-base text-foreground">{project.name || 'Untitled Project'}</h3>
            {project.description && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {project.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }}>
                <Tv className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish(); }}>
                <Rocket className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onControl(); }}>
                <PulsarIcon className="mr-2 h-4 w-4" />
                Control
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClick}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
          <span>Updated {formatRelativeTime(project.updated_at)}</span>
          {updaterName && <span className="truncate ml-2">by {updaterName}</span>}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
