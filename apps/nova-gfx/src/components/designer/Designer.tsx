import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { TopBar } from '@/components/layout/TopBar';
import { LeftPanel } from './LeftPanel';
import { useAIPreferenceStore } from '@/stores/aiPreferenceStore';
import { Canvas } from './Canvas';
import { OutlinePanel } from './OutlinePanel';
import { Timeline } from './Timeline';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { createProject } from '@/services/projectService';
import { ProjectSettingsDialog } from '@/components/dialogs/ProjectSettingsDialog';
import { DesignSystemDialog } from '@/components/dialogs/DesignSystemDialog';
import { AIModelSettingsDialog } from '@/components/dialogs/AIModelSettingsDialog';
import { SystemTemplatesDialog } from '@/components/dialogs/SystemTemplatesDialog';
import { SaveTemplateDialog } from '@/components/dialogs/SaveTemplateDialog';
import { KeyboardShortcutsDialog } from '@/components/dialogs/KeyboardShortcutsDialog';
import { saveProjectAsSystemTemplate } from '@/services/systemTemplateService';
import type { Layer, Template } from '@emergent-platform/types';

// Demo data for when database is not available
function getDemoLayers(projectIdVal: string): Layer[] {
  return [
    {
      id: 'layer-background',
      project_id: projectIdVal,
      name: 'Background',
      layer_type: 'background',
      z_index: 10,
      sort_order: 0,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: 1920,
      height: 1080,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'fade',
      transition_in_duration: 500,
      transition_out: 'fade',
      transition_out_duration: 500,
      enabled: true,
      locked: false,
      always_on: true, // Background layer is always on by default
      created_at: new Date().toISOString(),
    },
    {
      id: 'layer-fullscreen',
      project_id: projectIdVal,
      name: 'Fullscreen',
      layer_type: 'fullscreen',
      z_index: 100,
      sort_order: 1,
      position_anchor: 'top-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: 1920,
      height: 1080,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'dissolve',
      transition_in_duration: 500,
      transition_out: 'dissolve',
      transition_out_duration: 300,
      enabled: true,
      locked: false,
      always_on: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'layer-lower-third',
      project_id: projectIdVal,
      name: 'Lower Third',
      layer_type: 'lower-third',
      z_index: 300,
      sort_order: 2,
      position_anchor: 'bottom-left',
      position_offset_x: 80,
      position_offset_y: -120,
      width: 700,
      height: 150,
      auto_out: true,
      allow_multiple: false,
      transition_in: 'slide-right',
      transition_in_duration: 400,
      transition_out: 'slide-left',
      transition_out_duration: 300,
      enabled: true,
      locked: false,
      always_on: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'layer-ticker',
      project_id: projectIdVal,
      name: 'Ticker',
      layer_type: 'ticker',
      z_index: 350,
      sort_order: 3,
      position_anchor: 'bottom-left',
      position_offset_x: 0,
      position_offset_y: 0,
      width: 1920,
      height: 60,
      auto_out: false,
      allow_multiple: false,
      transition_in: 'slide-up',
      transition_in_duration: 400,
      transition_out: 'slide-down',
      transition_out_duration: 300,
      enabled: true,
      locked: false,
      always_on: true, // Background layer is always on by default
      created_at: new Date().toISOString(),
    },
    {
      id: 'layer-bug',
      project_id: projectIdVal,
      name: 'Bug',
      layer_type: 'bug',
      z_index: 450,
      sort_order: 4,
      position_anchor: 'top-right',
      position_offset_x: -40,
      position_offset_y: 40,
      width: 200,
      height: 80,
      auto_out: false,
      allow_multiple: true,
      transition_in: 'fade',
      transition_in_duration: 300,
      transition_out: 'fade',
      transition_out_duration: 200,
      enabled: true,
      locked: false,
      always_on: false,
      created_at: new Date().toISOString(),
    },
  ];
}

function getDemoTemplates(projectIdVal: string): Template[] {
  return [
    {
      id: 'template-main-open',
      project_id: projectIdVal,
      layer_id: 'layer-fullscreen',
      folder_id: null,
      name: 'Main Open',
      description: 'Show opener animation',
      tags: ['opener', 'intro'],
      thumbnail_url: null,
      html_template: '<div class="gfx-root"></div>',
      css_styles: '',
      width: 1920,
      height: 1080,
      in_duration: 800,
      loop_duration: null,
      loop_iterations: -1,
      out_duration: 500,
      libraries: [],
      custom_script: null,
      enabled: true,
      locked: false,
      archived: false,
      version: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    },
    {
      id: 'template-basic-l3',
      project_id: projectIdVal,
      layer_id: 'layer-lower-third',
      folder_id: null,
      name: 'Basic L3',
      description: 'Standard lower third with name and title',
      tags: ['lower-third', 'name'],
      thumbnail_url: null,
      html_template: '<div class="gfx-root"></div>',
      css_styles: '',
      width: 700,
      height: 150,
      in_duration: 400,
      loop_duration: null,
      loop_iterations: -1,
      out_duration: 300,
      libraries: [],
      custom_script: null,
      enabled: true,
      locked: false,
      archived: false,
      version: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    },
    {
      id: 'template-score-bug',
      project_id: projectIdVal,
      layer_id: 'layer-bug',
      folder_id: null,
      name: 'Score Bug',
      description: 'Live score display',
      tags: ['score', 'bug'],
      thumbnail_url: null,
      html_template: '<div class="gfx-root"></div>',
      css_styles: '',
      width: 200,
      height: 80,
      in_duration: 300,
      loop_duration: null,
      loop_iterations: -1,
      out_duration: 200,
      libraries: [],
      custom_script: null,
      enabled: true,
      locked: false,
      archived: false,
      version: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    },
    {
      id: 'template-ticker',
      project_id: projectIdVal,
      layer_id: 'layer-ticker',
      folder_id: null,
      name: 'News Ticker',
      description: 'Scrolling news ticker',
      tags: ['ticker', 'news', 'scroll'],
      thumbnail_url: null,
      html_template: '<div class="gfx-root"></div>',
      css_styles: '',
      width: 1920,
      height: 60,
      in_duration: 400,
      loop_duration: null,
      loop_iterations: -1,
      out_duration: 300,
      libraries: [],
      custom_script: null,
      enabled: true,
      locked: false,
      archived: false,
      version: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    },
    {
      id: 'template-video-bg',
      project_id: projectIdVal,
      layer_id: 'layer-background',
      folder_id: null,
      name: 'Background Video',
      description: 'Video background layer',
      tags: ['video', 'background'],
      thumbnail_url: null,
      html_template: '<div class="gfx-root"></div>',
      css_styles: '',
      width: 1920,
      height: 1080,
      in_duration: 500,
      loop_duration: null,
      loop_iterations: -1,
      out_duration: 500,
      libraries: [],
      custom_script: null,
      enabled: true,
      locked: false,
      archived: false,
      version: 1,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    },
  ];
}

export function Designer() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    loadProject, 
    project, 
    isLoading, 
    error, 
    setProject, 
    setLayers, 
    setTemplates,
    layers,
    templates,
    elements,
    animations,
    keyframes,
    saveProject,
  } = useDesignerStore();
  
  // Dialog states
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDesignSystemDialog, setShowDesignSystemDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const [showSystemTemplatesDialog, setShowSystemTemplatesDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const aiEnabled = useAIPreferenceStore((state) => state.aiEnabled);

  // Handle ?action=publish query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    console.log('[Designer] Checking action param:', action, 'project:', !!project, 'isLoading:', isLoading);
    if (action === 'publish' && project && !isLoading) {
      console.log('[Designer] Opening PublishModal from action=publish');
      setShowPublishModal(true);
      // Clear the action param from URL
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, project, isLoading]);

  // Keyboard shortcuts with dialog callback
  const { shortcuts, updateShortcut, resetAllShortcuts } = useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcutsDialog(true),
  });

  // Function to set up demo data (fallback mode)
  const setupDemoData = useCallback((id: string) => {
    setProject({
      id: id,
      organization_id: 'demo-org',
      created_by: null,
      name: 'Sports Show Package',
      description: 'A complete graphics package for sports broadcasts',
      slug: 'sports-show',
      custom_url_slug: null,
      canvas_width: 1920,
      canvas_height: 1080,
      frame_rate: 60,
      background_color: 'transparent',
      api_key: 'demo-key',
      api_enabled: true,
      is_live: false,
      archived: false,
      published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setLayers(getDemoLayers(id));
    setTemplates(getDemoTemplates(id));
  }, [setProject, setLayers, setTemplates]);

  // Track if we're creating a new project to avoid showing "not found" during creation
  const [isCreating, setIsCreating] = useState(false);

  // Prevent double loading in React Strict Mode
  const hasStartedLoading = useRef<string | null>(null);

  // Load project on mount
  useEffect(() => {
    async function initProject() {
      if (!projectId) return;

      // Prevent double loading for the same project (React Strict Mode)
      if (hasStartedLoading.current === projectId) return;
      hasStartedLoading.current = projectId;
      
      // Check if this is a UUID (real project from database)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
      
      if (isUUID) {
        // Try to load from database
        await loadProject(projectId);
      } else if (projectId === 'new-project') {
        // Create a new project in the database
        setIsCreating(true);
        try {
          const newProject = await createProject({
            name: 'Untitled Project',
            description: '',
          });
          
          if (newProject) {
            // Load the project first, then navigate
            await loadProject(newProject.id);
            // Navigate to the new project's URL after loading
            navigate(`/projects/${newProject.id}`, { replace: true });
          } else {
            // Fallback to demo mode if creation fails
            console.warn('Failed to create project, using demo mode');
            setupDemoData(projectId);
          }
        } catch (err) {
          console.error('Error creating project:', err);
          setupDemoData(projectId);
        } finally {
          setIsCreating(false);
        }
      } else {
        // Demo/local mode for non-UUID project IDs (like "demo-project")
        // loadProject handles localStorage first, then falls back to creating demo data
        await loadProject(projectId);
      }
    }
    
    initProject();
  }, [projectId, loadProject, navigate, setupDemoData]);

  
  // Handle save - check if project came from system template
  const handleSave = useCallback(() => {
    if (!project) return;
    
    // Check if project was created from a system template
    const systemTemplateSlug = project.settings?.systemTemplateSlug;
    
    if (systemTemplateSlug) {
      // Show dialog to choose between updating template or saving as new project
      setShowSaveTemplateDialog(true);
    } else {
      // Normal save
      saveProject();
    }
  }, [project, saveProject]);
  
  // Update the system template with current project
  const handleUpdateTemplate = useCallback(async () => {
    if (!project || !project.settings?.systemTemplateSlug) return;
    
    try {
      const templateSlug = project.settings.systemTemplateSlug;
      
      // Save current project as system template (overwrites existing)
      const result = saveProjectAsSystemTemplate(
        project,
        layers,
        templates,
        elements,
        animations,
        keyframes,
        {
          slug: templateSlug,
          name: project.name,
          description: project.description || undefined,
        }
      );
      
      if (!result.success) {
        console.error('Failed to update system template:', result.error);
        return;
      }
      
      // Also save as regular project
      await saveProject();
      
      console.log('✅ System template updated');
    } catch (error) {
      console.error('Error updating system template:', error);
    }
  }, [project, layers, templates, elements, animations, keyframes, saveProject]);
  
  // Save as new project (remove system template reference)
  const handleSaveAsNewProject = useCallback(async () => {
    if (!project) return;
    
    // Remove system template reference from settings
    const updatedProject = {
      ...project,
      settings: {
        ...project.settings,
        systemTemplateSlug: undefined,
        systemTemplateId: undefined,
      },
    };
    
    // Update project in store
    useDesignerStore.setState({ project: updatedProject });
    
    // Save as regular project
    await saveProject();
    
    console.log('✅ Saved as new project');
  }, [project, saveProject]);

  if (isLoading || isCreating) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-sm">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <p className="text-muted-foreground">
            {isCreating ? 'Creating project...' : 'Loading project...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading project</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Menu Bar */}
      <TopBar
        onOpenSettings={() => setShowSettingsDialog(true)}
        onOpenDesignSystem={() => setShowDesignSystemDialog(true)}
        onOpenAISettings={() => setShowAISettingsDialog(true)}
        onOpenSystemTemplates={() => setShowSystemTemplatesDialog(true)}
        onShowKeyboardShortcuts={() => setShowShortcutsDialog(true)}
        openPublishModal={showPublishModal}
        onPublishModalChange={setShowPublishModal}
      />
      
      {/* Dialogs */}
      <ProjectSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />
      <DesignSystemDialog
        open={showDesignSystemDialog}
        onOpenChange={setShowDesignSystemDialog}
      />
      <AIModelSettingsDialog
        open={showAISettingsDialog}
        onOpenChange={setShowAISettingsDialog}
      />
      <SystemTemplatesDialog
        open={showSystemTemplatesDialog}
        onOpenChange={setShowSystemTemplatesDialog}
      />
      <SaveTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        templateName={project?.settings?.systemTemplateSlug || 'Unknown Template'}
        onUpdateTemplate={handleUpdateTemplate}
        onSaveAsNewProject={handleSaveAsNewProject}
      />
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
        shortcuts={shortcuts}
        onUpdateShortcut={updateShortcut}
        onResetAll={resetAllShortcuts}
      />

      {/* Main Content - flex-1 with min-h-0 to allow shrinking in flex container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Chat (only show if AI is enabled) */}
          {aiEnabled && (
            <>
              <ResizablePanel defaultSize={18} minSize={10} maxSize={35}>
                <LeftPanel />
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-border hover:bg-violet-500/50 transition-colors" />
            </>
          )}

          {/* Center - Canvas + Timeline */}
          <ResizablePanel defaultSize={57} minSize={25}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Canvas */}
              <ResizablePanel defaultSize={70} minSize={25}>
                <Canvas />
              </ResizablePanel>

              <ResizableHandle className="h-1 bg-border hover:bg-violet-500/50 transition-colors" />

              {/* Timeline */}
              <ResizablePanel defaultSize={30} minSize={10} maxSize={60}>
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border hover:bg-violet-500/50 transition-colors" />

          {/* Right Panel - Outline + Properties */}
          <ResizablePanel defaultSize={25} minSize={10} maxSize={45}>
            <OutlinePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
