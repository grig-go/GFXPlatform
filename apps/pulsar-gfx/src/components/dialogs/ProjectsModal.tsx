import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  ScrollArea,
  cn,
} from '@emergent-platform/ui';
import {
  FolderOpen,
  Loader2,
  Search,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { usePageStore } from '@/stores/pageStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';

interface ProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectsModal({ open, onOpenChange }: ProjectsModalProps) {
  const { projects, currentProject, selectProject, loadProjects, isLoading } = useProjectStore();
  const { clearPages } = usePageStore();
  const { clearPlaylists } = usePlaylistStore();
  const { clearPreview } = usePreviewStore();
  const { setLastProjectId } = useUIPreferencesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  // Reload projects when modal opens
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, loadProjects]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const handleSelectProject = async (project: Project) => {
    if (project.id === currentProject?.id) {
      onOpenChange(false);
      return;
    }

    setIsSelecting(true);
    try {
      // Clear all related stores when switching projects
      clearPages();
      clearPlaylists();
      clearPreview();
      localStorage.removeItem('nova-preview-data');

      // Save the project preference
      setLastProjectId(project.id);
      await selectProject(project.id);
      onOpenChange(false);
    } finally {
      setIsSelecting(false);
    }
  };

  const openInNova = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`http://localhost:5173/projects/${projectId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-cyan-500" />
            Projects
          </DialogTitle>
          <DialogDescription>
            Select a project to load its templates and pages.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Project List */}
        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-2 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No projects match your search' : 'No projects available'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = currentProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    disabled={isSelecting}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-border bg-card hover:bg-muted/50'
                    )}
                  >
                    {/* Project Icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        isSelected ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <FolderOpen className="w-5 h-5" />
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium text-sm truncate', isSelected && 'text-cyan-500')}>
                          {project.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-500 shrink-0" />}
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {project.slug}
                        </span>
                        {project.published && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500">
                            Published
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit in Nova Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={(e) => openInNova(project.id, e)}
                      title="Edit in Nova GFX"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <span className="text-xs text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
