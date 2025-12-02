import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search, MoreHorizontal, Trash2, Copy, Settings, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { supabase } from '@/lib/supabase';
import { getStarterProjects, createLocalProjectFromStarter } from '@/services/starterProjectService';
import { useDesignerStore } from '@/stores/designerStore';
import type { Project } from '@/types';
import type { StarterProject } from '@/data/starterProjects/types';

export function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [isCreatingFromStarter, setIsCreatingFromStarter] = useState(false);
  const starterProjects = getStarterProjects();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
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
      
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('gfx_projects')
        .select('*')
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading projects from Supabase:', error);
        // Use localStorage projects only
        const sortedLocalProjects = localProjects.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setProjects(sortedLocalProjects);
      } else {
        // Merge Supabase projects with localStorage projects
        // localStorage projects override Supabase ones with the same ID
        const supabaseProjects = data || [];
        const localProjectIds = new Set(localProjects.map(p => p.id));
        const mergedProjects = [
          ...localProjects,
          ...supabaseProjects.filter(p => !localProjectIds.has(p.id)),
        ].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setProjects(mergedProjects);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const createNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const createFromStarter = async (starter: StarterProject) => {
    setIsCreatingFromStarter(true);
    try {
      // Create local project from starter
      const projectData = createLocalProjectFromStarter(starter);
      
      // Save to localStorage (for demo)
      localStorage.setItem(`nova-project-${projectData.project.id}`, JSON.stringify(projectData));
      
      // Navigate to the new project
      navigate(`/projects/${projectData.project.id}`);
    } catch (error) {
      console.error('Error creating project from starter:', error);
    } finally {
      setIsCreatingFromStarter(false);
    }
  };
  
  const duplicateProject = async (projectId: string) => {
    // TODO: Implement project duplication
    console.log('Duplicate project:', projectId);
  };
  
  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('gfx_projects')
        .update({ archived: true })
        .eq('id', projectId);
      
      if (!error) {
        setProjects(projects.filter(p => p.id !== projectId));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="absolute inset-0 bg-background overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 h-12 sm:h-14 border-b bg-card flex items-center px-3 sm:px-6 shadow-md">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Emergent Logo - hidden on small screens */}
          <svg 
            className="h-4 text-foreground hidden md:block"
            viewBox="0 0 1185 176" 
            xmlns="http://www.w3.org/2000/svg"
            aria-label="EMERGENT"
          >
            <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
              {/* E */}
              <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z"/>
              {/* M */}
              <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z"/>
              {/* E */}
              <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z"/>
              {/* R */}
              <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z"/>
              {/* G */}
              <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z"/>
              {/* E */}
              <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z"/>
              {/* N */}
              <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z"/>
              {/* T */}
              <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z"/>
            </g>
          </svg>

          {/* App Icon */}
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-xs font-bold sm:text-[15px]">N</span>
          </div>
          <span className="text-sm sm:text-[18px] font-medium whitespace-nowrap">
            Nova GFX
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Title and Actions */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
              Create and manage your broadcast graphics projects
            </p>
          </div>
          <Button
            onClick={createNewProject}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 w-full xs:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card h-9 sm:h-10"
          />
        </div>

        {/* Starter Templates Section */}
        {!search && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-violet-400" />
              <h2 className="text-base sm:text-lg font-semibold">Start from a Template</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {starterProjects.map((starter) => (
                <StarterProjectCard
                  key={starter.slug}
                  starter={starter}
                  onClick={() => createFromStarter(starter)}
                  isLoading={isCreatingFromStarter}
                />
              ))}
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 sm:h-48 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onClick={() => navigate(`/projects/${proj.id}`)}
                onDuplicate={() => duplicateProject(proj.id)}
                onDelete={() => deleteProject(proj.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onClick, onDuplicate, onDelete }: ProjectCardProps) {
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
                className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <Settings className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
          Updated {formatRelativeTime(project.updated_at)}
        </p>
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

interface StarterProjectCardProps {
  starter: StarterProject;
  onClick: () => void;
  isLoading: boolean;
}

function StarterProjectCard({ starter, onClick, isLoading }: StarterProjectCardProps) {
  const isGlass = starter.style === 'glass';
  
  // Count templates across all layers
  const templateCount = starter.layers.reduce((acc, layer) => acc + layer.templates.length, 0);
  const layerCount = starter.layers.filter(l => l.templates.length > 0).length;

  return (
    <div
      className={`group relative rounded-lg border bg-card hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer overflow-hidden active:scale-[0.98] ${
        isLoading ? 'opacity-50 pointer-events-none' : ''
      }`}
      onClick={onClick}
    >
      {/* Preview Area */}
      <div className="h-24 sm:h-32 relative overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0"
          style={{
            background: isGlass
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
          }}
        />
        
        {/* Glass Blur Effect (for Glass style) */}
        {isGlass && (
          <div className="absolute inset-0 backdrop-blur-sm">
            <div className="absolute top-4 left-4 w-48 h-20 rounded-lg bg-white/10 border border-white/20 shadow-lg" />
            <div className="absolute top-8 left-8 w-32 h-6 rounded bg-white/20" />
            <div className="absolute top-16 left-8 w-24 h-4 rounded bg-white/10" />
            <div className="absolute bottom-4 right-4 w-20 h-8 rounded bg-violet-500/30 border border-violet-400/30" />
          </div>
        )}
        
        {/* Flat Design Elements */}
        {!isGlass && (
          <>
            <div className="absolute top-4 left-4 w-48 h-20 bg-white rounded shadow-md border border-gray-200" />
            <div className="absolute top-8 left-8 w-32 h-5 rounded bg-slate-700" />
            <div className="absolute top-15 left-8 w-24 h-3 rounded bg-slate-400" />
            <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg shadow-md" />
            <div className="absolute bottom-4 left-4 w-full h-10 bg-white border-t border-gray-200" />
          </>
        )}

        {/* Style Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
          isGlass
            ? 'bg-violet-500/80 text-white backdrop-blur-sm'
            : 'bg-blue-500 text-white'
        }`}>
          {isGlass ? 'Glass' : 'Flat'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm sm:text-base">{starter.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {starter.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{layerCount} layers</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{templateCount} templates</span>
          </div>
        </div>

        <Button
          className="w-full mt-2 sm:mt-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white h-8 sm:h-9 text-xs sm:text-sm"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Use Template'}
        </Button>
      </div>
    </div>
  );
}

