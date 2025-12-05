import { useState } from 'react';
import { FolderKanban, FileText, LayoutTemplate } from 'lucide-react';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@emergent-platform/ui';
import { useProjectStore } from '@/stores/projectStore';
import { PageList } from '@/components/pages/PageList';
import { TemplateList } from '@/components/templates/TemplateList';

type SidebarTab = 'pages' | 'templates';

interface LeftSidebarProps {
  defaultTab?: SidebarTab;
}

export function LeftSidebar({ defaultTab = 'pages' }: LeftSidebarProps) {
  const { projects, currentProject, selectProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>(defaultTab);

  const handleProjectChange = async (projectId: string) => {
    await selectProject(projectId);
  };

  return (
    <div className="h-full flex flex-col bg-card">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SidebarTab)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border h-9 bg-transparent px-2 shrink-0">
          <TabsTrigger
            value="pages"
            className={cn(
              'text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              'data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none'
            )}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Pages
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className={cn(
              'text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              'data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none'
            )}
          >
            <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <PageList />
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <TemplateList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
