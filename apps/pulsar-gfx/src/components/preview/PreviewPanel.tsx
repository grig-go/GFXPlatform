import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
} from '@emergent-platform/ui';
import { Play, Square, Eye, Layers, RotateCcw, ExternalLink, Loader2, Settings, Image, X, Video } from 'lucide-react';
import { MediaPickerDialog } from '@/components/dialogs/MediaPickerDialog';
import { usePreviewStore } from '@/stores/previewStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePageStore } from '@/stores/pageStore';
import { supabase } from '@emergent-platform/supabase-client';
import { useMemo } from 'react';

// Nova GFX preview URL - configurable via environment variable
// In dev: defaults to localhost:5173
// In prod: set VITE_NOVA_PREVIEW_URL to your deployed Nova GFX URL (e.g., https://nova.yourdomain.com)
const NOVA_PREVIEW_URL = import.meta.env.VITE_NOVA_PREVIEW_URL || 'http://localhost:5173';

interface PreviewData {
  layers: any[];
  templates: any[];
  elements: any[];
  animations: any[];
  keyframes: any[];
  currentTemplateId: string | null;
  project: any | null;
}

export function PreviewPanel() {
  const {
    mode,
    setMode,
    animationPhase,
    playIn,
    playOut,
    resetPreview,
    selectedTemplateId,
    selectedPageId,
    previewPayload,
    loadedProjectId,
    setLoadedProjectId,
  } = usePreviewStore();

  const { getTemplate, templates, currentProject } = useProjectStore();
  const { pages } = usePageStore();

  // Get page data from previewStore's selectedPageId (not pageStore's selectedPage)
  // This keeps preview separate from playlist UI selection
  const previewPage = useMemo(() => {
    if (!selectedPageId) return null;
    return pages.find(p => p.id === selectedPageId) || null;
  }, [selectedPageId, pages]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const lastProjectIdRef = useRef<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [previewBgColor, setPreviewBgColor] = useState(() =>
    localStorage.getItem('pulsar-preview-bg') || '#000000'
  );
  const [previewBgMedia, setPreviewBgMedia] = useState<string | null>(() =>
    localStorage.getItem('pulsar-preview-bg-media')
  );
  const [previewBgMediaType, setPreviewBgMediaType] = useState<'image' | 'video'>(() =>
    (localStorage.getItem('pulsar-preview-bg-media-type') as 'image' | 'video') || 'image'
  );
  // Store the URL separately to prevent iframe reloads
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  // Trigger to force iframe rebuild (e.g., when settings change)
  const [rebuildTrigger, setRebuildTrigger] = useState(0);

  // Get template from either direct selection or from the preview page
  const selectedTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;
  const pageTemplate = previewPage ? templates.find(t => t.id === previewPage.templateId) : null;
  const displayTemplate = selectedTemplate || pageTemplate;

  // Get the payload to use - merge page payload with preview payload for real-time updates
  // previewPayload contains any edits made in the ContentEditor
  const activePayload = previewPage
    ? { ...previewPage.payload, ...previewPayload }  // Merge: page base + live edits
    : previewPayload;

  // Canvas dimensions
  const canvasWidth = displayTemplate?.width || 1920;
  const canvasHeight = displayTemplate?.height || 1080;

  // Send message to iframe
  const sendToPreview = useCallback((type: string, payload?: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'pulsar-gfx', type, payload },
        '*'
      );
      console.log('Sent to preview:', type, payload);
    }
  }, []);

  // Track which project ID we're currently loading to handle race conditions
  const loadingProjectIdRef = useRef<string | null>(null);

  // Load full project data and save to localStorage for Nova preview
  // IMPORTANT: This should only run when the PROJECT changes, not when template changes
  const loadPreviewData = useCallback(async () => {
    if (!currentProject) return;

    const projectIdToLoad = currentProject.id;

    // Skip if already loaded for this project (using store state instead of ref)
    if (loadedProjectId === projectIdToLoad) {
      console.log('Preview data already loaded for project:', projectIdToLoad);
      return;
    }

    // Skip if we're already loading this project (prevent duplicate loads)
    if (loadingProjectIdRef.current === projectIdToLoad) {
      console.log('[PreviewPanel] Already loading project:', projectIdToLoad);
      return;
    }

    console.log('[PreviewPanel] Loading preview data for project:', projectIdToLoad, '(was:', loadedProjectId, ')');
    loadingProjectIdRef.current = projectIdToLoad;

    setIsLoading(true);
    setError(null);

    try {
      // Load layers
      const { data: layersData, error: layersError } = await supabase
        .from('gfx_layers')
        .select('*')
        .eq('project_id', projectIdToLoad)
        .order('z_index');

      if (layersError) throw layersError;

      // Load templates - filter out archived (soft-deleted) templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('gfx_templates')
        .select('*')
        .eq('project_id', projectIdToLoad)
        .eq('archived', false);

      if (templatesError) throw templatesError;

      // Load elements for all templates
      const templateIds = templatesData?.map((t: { id: string }) => t.id) || [];
      let elementsData: any[] = [];
      if (templateIds.length > 0) {
        const { data, error: elementsError } = await supabase
          .from('gfx_elements')
          .select('*')
          .in('template_id', templateIds)
          .order('sort_order');

        if (elementsError) throw elementsError;
        elementsData = data || [];
      }

      // Load animations for all templates
      let animationsData: any[] = [];
      if (templateIds.length > 0) {
        const { data, error: animationsError } = await supabase
          .from('gfx_animations')
          .select('*')
          .in('template_id', templateIds);

        if (animationsError) throw animationsError;
        animationsData = data || [];
      }

      // Load keyframes for all animations
      const animationIds = animationsData?.map((a: { id: string }) => a.id) || [];
      let keyframesData: any[] = [];
      if (animationIds.length > 0) {
        const { data, error: keyframesError } = await supabase
          .from('gfx_keyframes')
          .select('*')
          .in('animation_id', animationIds)
          .order('position');

        if (keyframesError) throw keyframesError;
        keyframesData = data || [];
      }

      // Check if project changed during loading (race condition protection)
      if (loadingProjectIdRef.current !== projectIdToLoad) {
        console.log('[PreviewPanel] Project changed during load, discarding stale data for:', projectIdToLoad);
        return;
      }

      // Map layers to include enabled status
      const layers = (layersData || []).map((layer: Record<string, unknown>) => ({
        ...layer,
        enabled: true,
      }));

      // Map templates to include enabled status
      const templatesFormatted = (templatesData || []).map((template: Record<string, unknown>) => ({
        ...template,
        enabled: true,
      }));

      // Get project with canvas dimensions
      const { data: projectData, error: projectError } = await supabase
        .from('gfx_projects')
        .select('*')
        .eq('id', projectIdToLoad)
        .single();

      if (projectError) throw projectError;

      // Final check before saving (race condition protection)
      if (loadingProjectIdRef.current !== projectIdToLoad) {
        console.log('[PreviewPanel] Project changed during load, discarding stale data for:', projectIdToLoad);
        return;
      }

      const previewData: PreviewData = {
        layers,
        templates: templatesFormatted,
        elements: elementsData || [],
        animations: animationsData || [],
        keyframes: keyframesData,
        currentTemplateId: null, // Template will be set via postMessage
        project: projectData,
      };

      // Save to localStorage for Nova preview to read on initial load
      localStorage.setItem('nova-preview-data', JSON.stringify(previewData));
      console.log('[PreviewPanel] Preview data saved for project:', projectIdToLoad);

      // Mark this project as loaded in the store (so it persists across component state)
      setLoadedProjectId(projectIdToLoad);
      setPreviewReady(true);
    } catch (err) {
      console.error('Failed to load preview data:', err);
      setError('Failed to load preview data');
    } finally {
      setIsLoading(false);
      // Clear loading ref if we were loading this project
      if (loadingProjectIdRef.current === projectIdToLoad) {
        loadingProjectIdRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, loadedProjectId, setLoadedProjectId]); // Only depend on project ID, not template

  // Load preview data when project changes
  useEffect(() => {
    if (!currentProject) return;

    // Check if we need to reload based on store state
    let needsReload = loadedProjectId !== currentProject.id;

    console.log('[PreviewPanel] Project change check - current:', currentProject.id, 'loaded:', loadedProjectId, 'needsReload:', needsReload);

    // Also check localStorage as a fallback
    if (!needsReload) {
      const previewDataStr = localStorage.getItem('nova-preview-data');
      if (previewDataStr) {
        try {
          const previewData = JSON.parse(previewDataStr);
          if (previewData.project?.id !== currentProject.id) {
            console.log('[PreviewPanel] localStorage project mismatch, forcing reload');
            needsReload = true;
          }
        } catch {
          needsReload = true;
        }
      } else {
        needsReload = true;
      }
    }

    if (needsReload) {
      // Reset states when switching projects
      console.log('[PreviewPanel] Reloading preview data for project:', currentProject.id);
      setPreviewReady(false);
      // Clear any existing loading ref so loadPreviewData can start fresh
      loadingProjectIdRef.current = null;
      loadPreviewData();
    }
  }, [currentProject?.id, loadedProjectId, loadPreviewData]);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    console.log('Iframe loaded');
    setIframeLoaded(true);

    // Send the full preview data via postMessage (cross-origin compatible)
    // localStorage is not shared between different ports/origins
    const previewDataStr = localStorage.getItem('nova-preview-data');
    if (previewDataStr) {
      try {
        const previewData = JSON.parse(previewDataStr);
        console.log('Sending preview data to Nova iframe via postMessage');
        // Small delay to ensure Nova preview is ready to receive messages
        setTimeout(() => {
          sendToPreview('loadData', previewData);
        }, 50);
      } catch (e) {
        console.error('Failed to parse preview data for iframe:', e);
      }
    }

    // Send initial content if we have a payload
    if (activePayload && Object.keys(activePayload).length > 0) {
      setTimeout(() => {
        sendToPreview('updateContent', activePayload);
      }, 150);
    }

    // Auto-play IN animation on initial load
    if (displayTemplate?.id) {
      setTimeout(() => {
        sendToPreview('playIn');
      }, 250);
    }
  }, [activePayload, displayTemplate?.id, sendToPreview]);

  // Send content updates in real-time as user types (no reload!)
  useEffect(() => {
    if (!iframeLoaded || !previewReady) return;

    // Send content updates immediately via postMessage
    sendToPreview('updateContent', activePayload || {});
  }, [activePayload, iframeLoaded, previewReady, sendToPreview]);

  // Handle template change via postMessage (no iframe reload!)
  // This handles both direct template selection AND page selection (which changes pageTemplate)
  useEffect(() => {
    if (!previewReady || !iframeLoaded) return;
    if (mode !== 'isolated') return;

    // Get the effective template ID (either from direct selection or from page)
    const effectiveTemplateId = selectedTemplateId || pageTemplate?.id;
    if (!effectiveTemplateId) return;

    console.log('Template changed in isolated mode, switching via postMessage to:', effectiveTemplateId);
    sendToPreview('setTemplate', {
      templateId: effectiveTemplateId,
      mode
    });

    // Also send content updates if we have a page payload
    if (activePayload && Object.keys(activePayload).length > 0) {
      setTimeout(() => {
        sendToPreview('updateContent', activePayload);
      }, 50);
    }

    // Reset and play IN animation
    setTimeout(() => {
      sendToPreview('reset');
      sendToPreview('playIn');
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, pageTemplate?.id, previewReady, iframeLoaded, sendToPreview, mode]);

  // Handle mode change via postMessage
  useEffect(() => {
    if (!previewReady || !iframeLoaded) return;

    // Send mode change to preview
    sendToPreview('setMode', {
      mode,
      templateId: mode === 'isolated' ? displayTemplate?.id : null
    });
  }, [mode, previewReady, iframeLoaded, sendToPreview, displayTemplate?.id]);

  // Build preview URL - only called when project changes (not on template change)
  const buildPreviewUrl = useCallback((templateId?: string, previewMode?: 'isolated' | 'composite') => {
    const params = new URLSearchParams();

    // Use transparent background if background media is set, otherwise use color
    params.set('bg', previewBgMedia ? 'transparent' : previewBgColor);

    // OBS mode - hides all controls
    params.set('obs', '1');

    // Disable looping - play once and stop
    params.set('loop', '0');

    // Include template ID in URL for initial load (isolated mode)
    if (templateId && previewMode === 'isolated') {
      params.set('template', templateId);
    }

    // Include mode - 'isolated' shows single template, 'composite' shows all
    if (previewMode) {
      params.set('mode', previewMode);
    }

    return `${NOVA_PREVIEW_URL}/preview?${params.toString()}`;
  }, [previewBgColor, previewBgMedia]);

  // Track last rebuild trigger to detect new triggers
  const lastRebuildTriggerRef = useRef(0);
  // Track last project ID we built iframe for (local ref just for iframe rebuilds)
  const lastIframeProjectIdRef = useRef<string | null>(null);

  // Set iframe URL only when project changes or rebuild is triggered
  // IMPORTANT: Do NOT include displayTemplate?.id or mode in dependencies
  // Template/mode changes are handled via postMessage, not iframe reload
  useEffect(() => {
    if (!previewReady || !currentProject) return;

    const isNewProject = currentProject.id !== lastIframeProjectIdRef.current;
    const isNewRebuildTrigger = rebuildTrigger > lastRebuildTriggerRef.current;

    // Only create URL on first load, project change, or NEW rebuild trigger
    if (isNewProject || isNewRebuildTrigger) {
      lastIframeProjectIdRef.current = currentProject.id;
      lastRebuildTriggerRef.current = rebuildTrigger;
      lastProjectIdRef.current = currentProject.id;
      // Build URL with current template/mode for initial load only
      const url = buildPreviewUrl(displayTemplate?.id, mode);
      setIframeUrl(url);
      setIframeLoaded(false);
      console.log('[PreviewPanel] Building iframe URL:', url, 'reason:', isNewProject ? 'new project' : 'rebuild');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewReady, currentProject?.id, rebuildTrigger]);

  // Handle play controls via postMessage (no reload!)
  const handlePlayIn = () => {
    playIn();
    sendToPreview('playIn');
  };

  const handlePlayOut = () => {
    playOut();
    sendToPreview('playOut');
  };

  const handleReset = () => {
    resetPreview();
    sendToPreview('reset');
  };

  // Open preview in new window (without OBS mode to show controls)
  const handleOpenInNewWindow = () => {
    const params = new URLSearchParams();
    if (displayTemplate?.id) {
      params.set('template', displayTemplate.id);
    }
    params.set('bg', '#000000');
    // Don't use OBS mode in popup so user can see controls
    params.set('autoplay', '1');
    params.set('phase', 'in');

    const width = Math.min(canvasWidth + 60, window.screen.width - 100);
    const height = Math.min(canvasHeight + 140, window.screen.height - 100);
    window.open(
      `${NOVA_PREVIEW_URL}/preview?${params.toString()}`,
      'nova-preview',
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  };

  return (
    <div className="h-full flex flex-col bg-background border-b border-border">
      {/* Preview Header */}
      <div className="h-9 sm:h-10 flex items-center justify-between px-2 sm:px-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          <span className="text-xs sm:text-sm font-medium">Preview</span>
          {displayTemplate && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {canvasWidth}×{canvasHeight}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Open in New Window */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(true)}
            className="h-6 w-6"
            title="Preview settings"
          >
            <Settings className="w-3 h-3" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleOpenInNewWindow}
            disabled={!previewReady}
            className="h-6 w-6"
            title="Open in new window"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>

          {/* Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
            <button
              onClick={() => setMode('isolated')}
              className={cn(
                'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded transition-all duration-200',
                mode === 'isolated'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Isolated
            </button>
            <button
              onClick={() => setMode('composite')}
              className={cn(
                'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded transition-all duration-200 flex items-center gap-1',
                mode === 'composite'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Composite
            </button>
          </div>
        </div>
      </div>

      {/* Preview Window - Nova GFX iframe */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden relative">
        {/* Background Media Layer */}
        {previewBgMedia && (
          <div className="absolute inset-0 z-0">
            {previewBgMediaType === 'video' ? (
              <video
                src={previewBgMedia}
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={previewBgMedia}
                alt="Preview Background"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground z-10">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Loading preview...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground z-10">
            <div className="text-red-400 mb-2">⚠️ {error}</div>
            <Button size="sm" variant="outline" onClick={loadPreviewData}>
              Retry
            </Button>
          </div>
        ) : !currentProject ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground z-10">
            <Eye className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">Select a project to preview</span>
          </div>
        ) : previewReady && iframeUrl ? (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-0 relative z-10"
            style={{ backgroundColor: previewBgMedia ? 'transparent' : previewBgColor }}
            title="Nova GFX Preview"
            allow="autoplay"
            onLoad={handleIframeLoad}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground z-10">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Initializing preview...</span>
          </div>
        )}

        {/* Animation Phase Indicator */}
        {animationPhase !== 'idle' && previewReady && (
          <div
            className={cn(
              'absolute top-2 left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded font-medium z-10',
              animationPhase === 'in' && 'bg-emerald-500 text-white',
              animationPhase === 'looping' && 'bg-cyan-500 text-white',
              animationPhase === 'out' && 'bg-amber-500 text-white'
            )}
          >
            {animationPhase === 'looping' ? 'LOOP' : animationPhase.toUpperCase()}
          </div>
        )}
      </div>

      {/* Animation Controls */}
      <div className="h-10 sm:h-12 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
        <Button
          size="sm"
          variant={animationPhase === 'in' || animationPhase === 'looping' ? 'default' : 'outline'}
          onClick={handlePlayIn}
          disabled={!previewReady || !iframeLoaded}
          className={cn(
            'gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-xs',
            (animationPhase === 'in' || animationPhase === 'looping') &&
              'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
          )}
        >
          <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          IN
        </Button>

        <Button
          size="sm"
          variant={animationPhase === 'out' ? 'default' : 'outline'}
          onClick={handlePlayOut}
          disabled={!previewReady || !iframeLoaded || animationPhase === 'idle'}
          className={cn(
            'gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-xs',
            animationPhase === 'out' && 'bg-amber-600 hover:bg-amber-700 border-amber-600'
          )}
        >
          <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          OUT
        </Button>

        <div className="w-px h-5 sm:h-6 bg-border/50 mx-0.5 sm:mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={!previewReady || !iframeLoaded}
          className="gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-xs"
        >
          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Reset
        </Button>
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Preview Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Background Color Section */}
            <div className="space-y-2">
              <Label htmlFor="bg-color" className="text-sm">Background Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="bg-color"
                  value={previewBgColor}
                  onChange={(e) => setPreviewBgColor(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  type="text"
                  value={previewBgColor}
                  onChange={(e) => setPreviewBgColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set the background color for the preview window
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewBgColor('#000000')}
                className="flex-1"
              >
                Black
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewBgColor('#00FF00')}
                className="flex-1"
              >
                Green Screen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewBgColor('transparent')}
                className="flex-1"
              >
                Transparent
              </Button>
            </div>

            {/* Background Media Section */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm">Background Media</Label>
              <p className="text-xs text-muted-foreground">
                Optionally use an image or video as the preview background
              </p>

              {previewBgMedia ? (
                <div className="space-y-2">
                  {/* Media Preview */}
                  <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-black">
                    {previewBgMediaType === 'video' ? (
                      <video
                        src={previewBgMedia}
                        className="w-full h-full object-contain"
                        muted
                        loop
                        autoPlay
                      />
                    ) : (
                      <img
                        src={previewBgMedia}
                        alt="Background"
                        className="w-full h-full object-contain"
                      />
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-0.5 flex items-center gap-1.5 text-xs text-white">
                      {previewBgMediaType === 'video' ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <Image className="w-3.5 h-3.5" />
                      )}
                      {previewBgMediaType === 'video' ? 'Video' : 'Image'}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        setPreviewBgMedia(null);
                        localStorage.removeItem('pulsar-preview-bg-media');
                        localStorage.removeItem('pulsar-preview-bg-media-type');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    Change Media
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowMediaPicker(true)}
                >
                  <Image className="w-4 h-4" />
                  Select Background Media
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Saving preview settings, bgColor:', previewBgColor, 'bgMedia:', previewBgMedia);
                localStorage.setItem('pulsar-preview-bg', previewBgColor);
                if (previewBgMedia) {
                  localStorage.setItem('pulsar-preview-bg-media', previewBgMedia);
                  localStorage.setItem('pulsar-preview-bg-media-type', previewBgMediaType);
                }
                // Force iframe URL rebuild with new settings
                setRebuildTrigger(prev => {
                  console.log('Incrementing rebuildTrigger from', prev, 'to', prev + 1);
                  return prev + 1;
                });
                setShowSettings(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(url, asset) => {
          setPreviewBgMedia(url);
          // Determine type from URL or asset
          const isVideo = asset?.media_type === 'video' ||
            url.match(/\.(mp4|webm|mov|avi)$/i);
          setPreviewBgMediaType(isVideo ? 'video' : 'image');
          // Also save immediately
          localStorage.setItem('pulsar-preview-bg-media', url);
          localStorage.setItem('pulsar-preview-bg-media-type', isVideo ? 'video' : 'image');
        }}
        mediaType="all"
        title="Select Background Media"
      />
    </div>
  );
}
