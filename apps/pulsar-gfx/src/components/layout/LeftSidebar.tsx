import { FolderKanban } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@emergent-platform/ui';
import { useProjectStore } from '@/stores/projectStore';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import { PageList } from '@/components/pages/PageList';
import { TemplateList } from '@/components/templates/TemplateList';

type SidebarTab = 'pages' | 'templates';

interface LeftSidebarProps {
  defaultTab?: SidebarTab;
}

export function LeftSidebar({ defaultTab = 'pages' }: LeftSidebarProps) {
  const { projects, currentProject, selectProject } = useProjectStore();
  const { setLastProjectId } = useUIPreferencesStore();

  const handleProjectChange = async (projectId: string) => {
    setLastProjectId(projectId);
    await selectProject(projectId);
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Project Dropdown Header */}
      <div className="p-2 border-b border-border shrink-0">
        <Select
          value={currentProject?.id || ''}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-full h-8 text-sm bg-background">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-500" />
              <SelectValue placeholder="Select project...">
                {currentProject?.name || 'Select project...'}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content - Pages or Templates based on defaultTab */}
      <div className="flex-1 overflow-hidden">
        {defaultTab === 'pages' ? <PageList /> : <TemplateList />}
      </div>
    </div>
  );
}
