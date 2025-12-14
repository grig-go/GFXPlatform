import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  FolderOpen,
  Plus,
  Settings,
  Loader2
} from 'lucide-react';
import { useProject } from './ProjectContext';

interface ProjectSelectorProps {
  onManageProjects?: () => void;
  onCreateProject?: () => void;
  compact?: boolean;
}

export function ProjectSelector({
  onManageProjects,
  onCreateProject,
  compact = false
}: ProjectSelectorProps) {
  const { t } = useTranslation('projects');
  const {
    projects,
    activeProject,
    setActiveProject,
    isLoading
  } = useProject();

  const handleProjectChange = async (projectId: string) => {
    if (projectId === '__manage__') {
      onManageProjects?.();
      return;
    }
    if (projectId === '__create__') {
      onCreateProject?.();
      return;
    }
    await setActiveProject(projectId);
  };

  return (
    <div className="flex-1 space-y-2 border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-md">
      <Label className="text-sm font-medium">{t('selector.label')}</Label>
      <div className="flex items-center gap-3">
        <Select
          value={activeProject?.id || ''}
          onValueChange={handleProjectChange}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>{t('selector.loading')}</span>
              </div>
            ) : activeProject ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeProject.icon}</span>
                <span className="truncate">{activeProject.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderOpen className="size-4" />
                <span>{t('selector.selectProject')}</span>
              </div>
            )}
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <div className="p-4 text-center">
                <FolderOpen className="size-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-muted-foreground mb-3">{t('selector.noProjects')}</p>
                <Button
                  size="sm"
                  onClick={() => onCreateProject?.()}
                  className="w-full"
                >
                  <Plus className="size-4 mr-2" />
                  {t('createFirst')}
                </Button>
              </div>
            ) : (
              <>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{project.icon}</span>
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}

                <div className="border-t border-gray-200 mt-2 pt-2">
                  <SelectItem value="__create__">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Plus className="size-4" />
                      <span>{t('selector.newProject')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="__manage__">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Settings className="size-4" />
                      <span>{t('selector.manageProjects')}</span>
                    </div>
                  </SelectItem>
                </div>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
