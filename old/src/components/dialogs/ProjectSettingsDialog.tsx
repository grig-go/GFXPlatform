import { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDesignerStore } from '@/stores/designerStore';
import { AI_MODELS, getAIModel, setAIModel, type AIModelId } from '@/lib/ai';
import {
  Settings,
  MonitorPlay,
  Sparkles,
  Puzzle,
  MapPin,
  Eye,
  EyeOff,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Default Mapbox dev key
const DEFAULT_MAPBOX_KEY = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGjuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExnSoPnHlu_g';

// Canvas presets
const CANVAS_PRESETS = [
  { name: '1080p HD', width: 1920, height: 1080 },
  { name: '720p HD', width: 1280, height: 720 },
  { name: '4K UHD', width: 3840, height: 2160 },
  { name: '1080p Vertical', width: 1080, height: 1920 },
  { name: 'Social Square', width: 1080, height: 1080 },
];

// Frame rate presets
const FRAME_RATE_PRESETS = [24, 25, 30, 50, 60];

export function ProjectSettingsDialog({ open, onOpenChange }: ProjectSettingsDialogProps) {
  const { project, updateProjectSettings, isDirty } = useDesignerStore();
  
  // Local state for form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [frameRate, setFrameRate] = useState(60);
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [aiModel, setAiModel] = useState<AIModelId>(getAIModel());
  const [mapboxApiKey, setMapboxApiKey] = useState('');
  const [showMapboxKey, setShowMapboxKey] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current settings when dialog opens
  useEffect(() => {
    if (open && project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setSlug(project.slug || '');
      setCanvasWidth(project.canvas_width || 1920);
      setCanvasHeight(project.canvas_height || 1080);
      setFrameRate(project.frame_rate || 60);
      setBackgroundColor(project.background_color || 'transparent');
      setMapboxApiKey(project.settings?.mapboxApiKey || '');
      setAiModel(getAIModel());
      setHasChanges(false);
    }
  }, [open, project]);

  // Track changes
  useEffect(() => {
    if (!project) return;
    
    const projectMapboxKey = project.settings?.mapboxApiKey || '';
    
    const changed =
      name !== project.name ||
      description !== (project.description || '') ||
      slug !== project.slug ||
      canvasWidth !== project.canvas_width ||
      canvasHeight !== project.canvas_height ||
      frameRate !== project.frame_rate ||
      backgroundColor !== project.background_color ||
      mapboxApiKey !== projectMapboxKey ||
      aiModel !== getAIModel();
    
    setHasChanges(changed);
  }, [name, description, slug, canvasWidth, canvasHeight, frameRate, backgroundColor, mapboxApiKey, aiModel, project]);

  // Copy slug to clipboard
  const copySlug = useCallback(async () => {
    try {
      const publishUrl = `${window.location.origin}/play/${slug}`;
      await navigator.clipboard.writeText(publishUrl);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [slug]);

  // Apply canvas preset
  const applyCanvasPreset = useCallback((preset: typeof CANVAS_PRESETS[0]) => {
    setCanvasWidth(preset.width);
    setCanvasHeight(preset.height);
  }, []);

  // Generate slug from name
  const generateSlug = useCallback(() => {
    const newSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    setSlug(newSlug || `project-${Date.now()}`);
  }, [name]);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!project) return;
    
    setIsSaving(true);
    try {
      // Update AI model preference (stored in localStorage)
      setAIModel(aiModel);
      
      // Update project settings in store
      await updateProjectSettings({
        name,
        description: description || null,
        slug,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        frame_rate: frameRate,
        background_color: backgroundColor,
        settings: {
          ...project.settings,
          mapboxApiKey: mapboxApiKey || undefined,
          aiModel, // Also store in project for team sync
        },
      });
      
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [project, name, description, slug, canvasWidth, canvasHeight, frameRate, backgroundColor, mapboxApiKey, aiModel, updateProjectSettings, onOpenChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setCanvasWidth(1920);
    setCanvasHeight(1080);
    setFrameRate(60);
    setBackgroundColor('transparent');
    setAiModel('sonnet-fast');
    setMapboxApiKey('');
  }, []);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Configure project settings, canvas options, AI preferences, and integrations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="canvas" className="flex items-center gap-1.5">
              <MonitorPlay className="w-3.5 h-3.5" />
              Canvas
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1.5">
              <Puzzle className="w-3.5 h-3.5" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* General Settings */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Broadcast Project"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="project-slug">URL Slug</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={generateSlug}
                  >
                    Generate from name
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id="project-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-project"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={copySlug}
                    >
                      {copiedSlug ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Publish URL: <code className="bg-muted px-1 rounded">{window.location.origin}/play/{slug}</code>
                </p>
              </div>
            </TabsContent>

            {/* Canvas Settings */}
            <TabsContent value="canvas" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Canvas Preset</Label>
                <div className="flex flex-wrap gap-2">
                  {CANVAS_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant={canvasWidth === preset.width && canvasHeight === preset.height ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyCanvasPreset(preset)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="canvas-width">Width (px)</Label>
                  <Input
                    id="canvas-width"
                    type="number"
                    value={canvasWidth}
                    onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 1920)}
                    min={100}
                    max={7680}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="canvas-height">Height (px)</Label>
                  <Input
                    id="canvas-height"
                    type="number"
                    value={canvasHeight}
                    onChange={(e) => setCanvasHeight(parseInt(e.target.value) || 1080)}
                    min={100}
                    max={4320}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frame-rate">Frame Rate</Label>
                <div className="flex gap-2">
                  {FRAME_RATE_PRESETS.map((fps) => (
                    <Button
                      key={fps}
                      type="button"
                      variant={frameRate === fps ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFrameRate(fps)}
                    >
                      {fps} fps
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background-color">Background Color</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="background-color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="transparent, #000000, rgba(0,0,0,0.5)"
                    />
                  </div>
                  <input
                    type="color"
                    value={backgroundColor === 'transparent' ? '#000000' : backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setBackgroundColor('transparent')}
                    title="Set transparent"
                  >
                    <div className="w-4 h-4 rounded bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px]" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose the AI model for the chat assistant. Gemini models are recommended for best results.
                </p>
                
                {/* Gemini Models */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-blue-400 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    Google Gemini
                  </div>
                  {Object.entries(AI_MODELS).filter(([, m]) => m.provider === 'gemini').map(([id, model]) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors',
                        aiModel === id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-blue-500/50 hover:bg-muted/50'
                      )}
                      onClick={() => setAiModel(id as AIModelId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {model.name}
                            {id === 'gemini-3.0-pro' && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                            {id === 'gemini-2.5-pro' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                Stable
                              </span>
                            )}
                            {id === 'gemini-2.5-flash' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                Fast
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {model.description}
                          </p>
                        </div>
                        {aiModel === id && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Claude Models */}
                <div className="space-y-1.5 mt-4">
                  <div className="text-xs font-medium text-violet-400 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                    Anthropic Claude
                  </div>
                  {Object.entries(AI_MODELS).filter(([, m]) => m.provider === 'claude').map(([id, model]) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors',
                        aiModel === id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-border hover:border-violet-500/50 hover:bg-muted/50'
                      )}
                      onClick={() => setAiModel(id as AIModelId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {model.name}
                            {id === 'opus-advanced' && (
                              <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">
                                Most Capable
                              </span>
                            )}
                            {id === 'haiku-instant' && (
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                                Fastest
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {model.description}
                          </p>
                        </div>
                        {aiModel === id && (
                          <Check className="w-4 h-4 text-violet-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> AI model preference is stored locally and applies to all projects.
                  Advanced models may have slower response times but produce better results for complex designs.
                </p>
              </div>
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-4 mt-0">
              {/* Mapbox */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="mapbox-key">Mapbox API Key</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for map elements. Get a free key at{' '}
                  <a
                    href="https://mapbox.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    mapbox.com <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="mapbox-key"
                      type={showMapboxKey ? 'text' : 'password'}
                      value={mapboxApiKey}
                      onChange={(e) => setMapboxApiKey(e.target.value)}
                      placeholder="pk.eyJ1Ijoi..."
                      className="pr-10 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowMapboxKey(!showMapboxKey)}
                    >
                      {showMapboxKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {!mapboxApiKey && (
                  <p className="text-xs text-amber-500">
                    ⚠️ Using development key. Add your own key for production use.
                  </p>
                )}
              </div>

              {/* Future integrations placeholder */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  More integrations coming soon: Weather APIs, Sports data, Custom data sources...
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between pt-4 border-t mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

