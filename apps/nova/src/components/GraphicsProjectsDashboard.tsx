import { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Loader2,
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { NewGfxProjectDialog } from './dialogs/NewGfxProjectDialog';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { SystemTemplatesDialog } from './dialogs/SystemTemplatesDialog';
import {
  fetchProjects,
  deleteProject as deleteProjectService,
  duplicateProject as duplicateProjectService,
  type Project,
} from '../services/gfxProjectService';

// Pulsar GFX "P" icon component
function PulsarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="0" y="0" width="32" height="32" rx="6" fill="#3B82F6" />
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

type ViewMode = 'list' | 'cards';
type SortBy = 'name' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface GraphicsProjectsDashboardProps {
  organizationId?: string;
}

export function GraphicsProjectsDashboard({ organizationId }: GraphicsProjectsDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Track if we've already started loading
  const hasStartedLoading = useRef(false);
  const lastOrgId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const orgChanged = lastOrgId.current !== undefined && lastOrgId.current !== organizationId;

    if (!hasStartedLoading.current || orgChanged) {
      hasStartedLoading.current = true;
      lastOrgId.current = organizationId;
      loadProjects();
    }
  }, [organizationId]);

  const loadProjects = async () => {
    console.log('[GraphicsProjectsDashboard] Loading projects...');
    setIsLoading(true);
    try {
      // Load localStorage projects
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

      // Fetch from GFX Supabase
      const supabaseProjects = await fetchProjects(organizationId);

      // Merge - localStorage takes priority but preserve Supabase thumbnail_url
      const projectMap = new Map<string, Project>();

      supabaseProjects.forEach(p => {
        projectMap.set(p.id, p);
      });

      localProjects.forEach(localProject => {
        const existingProject = projectMap.get(localProject.id);
        if (existingProject?.thumbnail_url && !localProject.thumbnail_url) {
          projectMap.set(localProject.id, { ...localProject, thumbnail_url: existingProject.thumbnail_url });
        } else {
          projectMap.set(localProject.id, localProject);
        }
      });

      const mergedProjects = Array.from(projectMap.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      console.log('[GraphicsProjectsDashboard] Loaded', mergedProjects.length, 'projects');
      setProjects(mergedProjects);
    } catch (err) {
      console.error('[GraphicsProjectsDashboard] Error loading projects:', err);
    } finally {
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
      const newProject = await duplicateProjectService(projectId);
      if (newProject) {
        await loadProjects();
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
      const success = await deleteProjectService(projectToDelete);
      if (success) {
        setProjects(projects.filter(p => p.id !== projectToDelete));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Open project in Nova GFX
  const handleOpenProject = (projectId: string) => {
    const novaGfxPort = import.meta.env.VITE_NOVA_GFX_PORT || 3003;
    window.open(
      `http://localhost:${novaGfxPort}/projects/${projectId}`,
      `nova-gfx-${projectId}`
    );
  };

  // Preview project
  const handlePreview = (projectId: string) => {
    const novaGfxPort = import.meta.env.VITE_NOVA_GFX_PORT || 3003;
    window.open(
      `http://localhost:${novaGfxPort}/preview?projectId=${projectId}`,
      `nova-preview-${projectId}`,
      'width=1980,height=1180,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  // Publish - navigate to project with publish dialog
  const handlePublish = (projectId: string) => {
    const novaGfxPort = import.meta.env.VITE_NOVA_GFX_PORT || 3003;
    window.open(
      `http://localhost:${novaGfxPort}/projects/${projectId}?action=publish`,
      `nova-gfx-${projectId}`
    );
  };

  // Control in Pulsar GFX
  const handleControl = (projectId: string) => {
    const pulsarGfxPort = import.meta.env.VITE_PULSAR_GFX_PORT || 3001;
    window.open(
      `http://localhost:${pulsarGfxPort}/templates?projectId=${projectId}`,
      '_blank'
    );
  };

  const handleProjectCreated = () => {
    loadProjects();
  };

  // Open Library in Nova GFX
  const handleLibrary = () => {
    const novaGfxPort = import.meta.env.VITE_NOVA_GFX_PORT || 3003;
    window.open(
      `http://localhost:${novaGfxPort}/library`,
      'nova-gfx-library'
    );
  };

  // Open Templates dialog
  const handleTemplates = () => {
    setShowTemplatesDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Title and Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Graphics Projects</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
            Create and manage your broadcast graphics projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleLibrary}
            disabled
          >
            <Library className="w-4 h-4 mr-2" />
            Library
          </Button>
          <Button
            variant="outline"
            onClick={handleTemplates}
          >
            <BookTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button
            onClick={createNewProject}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search, Filters, and View Toggle Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card h-9 sm:h-10 !border !border-zinc-300 dark:!border-zinc-700"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Sort By */}
          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] h-9 sm:h-10 bg-card !border !border-zinc-300 dark:!border-zinc-700">
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
            className="h-9 w-9 sm:h-10 sm:w-10 !border !border-zinc-300 dark:!border-zinc-700"
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
          <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_150px_200px] gap-4 px-4 py-3 bg-muted/50 border-b text-xs sm:text-sm font-medium text-muted-foreground">
            <div className="w-10"></div>
            <div>Name</div>
            <div className="hidden sm:block">Updated</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {filteredAndSortedProjects.map((project) => (
              <ProjectListRow
                key={project.id}
                project={project}
                onClick={() => handleOpenProject(project.id)}
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
              onClick={() => handleOpenProject(proj.id)}
              onPreview={() => handlePreview(proj.id)}
              onPublish={() => handlePublish(proj.id)}
              onControl={() => handleControl(proj.id)}
              onDuplicate={() => duplicateProject(proj.id)}
              onDelete={() => handleDeleteClick(proj.id)}
            />
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <NewGfxProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        organizationId={organizationId}
        onProjectCreated={handleProjectCreated}
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
  const initials = (project.name || 'Project')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const colorHash = (project.name || 'P').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = colorHash % 360;
  const avatarColor = `hsl(${hue}, 60%, 45%)`;

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_150px_200px] gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer items-center transition-colors"
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
        <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
          {formatRelativeTime(project.updated_at)}
        </p>
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
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            title="Preview"
          >
            <Tv className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onPublish(); }}
            title="Publish"
          >
            <Rocket className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onControl(); }}
            title="Control in Pulsar"
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
              Edit in Designer
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
  const initials = (project.name || 'Project')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const colorHash = (project.name || 'P').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = colorHash % 360;
  const avatarColor = `hsl(${hue}, 60%, 45%)`;

  const hasThumbnail = !!project.thumbnail_url;

  return (
    <div
      className="group relative rounded-lg border bg-card hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-neutral-900 rounded-t-lg relative overflow-hidden min-h-[100px]">
        {/* Checkerboard background */}
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

        {hasThumbnail ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
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

        {/* Resolution badge (shown on hover when has thumbnail) */}
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
            <h3 className="font-medium truncate text-sm sm:text-base text-foreground">
              {project.name || 'Untitled Project'}
            </h3>
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
