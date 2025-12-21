import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@emergent-platform/ui';
import { createProject } from '@/services/projectService';
import { useDesignerStore } from '@/stores/designerStore';
import { useAuthStore, getOrganizationId } from '@/stores/authStore';
import { Loader2, Monitor, Smartphone, Film, MonitorPlay, Zap } from 'lucide-react';

// Resolution presets
const RESOLUTION_PRESETS = [
  { id: '1080p', label: '1080p Full HD', width: 1920, height: 1080, icon: Monitor },
  { id: '720p', label: '720p HD', width: 1280, height: 720, icon: Monitor },
  { id: '4k', label: '4K UHD', width: 3840, height: 2160, icon: Monitor },
  { id: 'vertical-1080', label: 'Vertical 1080p', width: 1080, height: 1920, icon: Smartphone },
  { id: 'square', label: 'Square', width: 1080, height: 1080, icon: Film },
  { id: 'custom', label: 'Custom', width: 1920, height: 1080, icon: Monitor },
] as const;

// Frame rate options
const FRAME_RATES = [
  { value: '24', label: '24 fps (Film)' },
  { value: '25', label: '25 fps (PAL)' },
  { value: '30', label: '30 fps (NTSC)' },
  { value: '50', label: '50 fps' },
  { value: '60', label: '60 fps' },
] as const;

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const navigate = useNavigate();
  const loadProject = useDesignerStore((s) => s.loadProject);
  const { user, accessToken } = useAuthStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('Untitled Project');
  const [selectedPreset, setSelectedPreset] = useState('1080p');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [frameRate, setFrameRate] = useState('30');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [interactiveEnabled, setInteractiveEnabled] = useState(false);

  // Handle preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = RESOLUTION_PRESETS.find((p) => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  // Handle create
  const handleCreate = async () => {
    if (!name.trim()) return;

    // Get organization ID with fallback to dev org
    const orgId = getOrganizationId(user);
    if (!orgId) {
      console.error('Cannot create project: no organization available');
      return;
    }

    setIsCreating(true);

    try {
      const newProject = await createProject({
        name: name.trim(),
        description: '',
        canvas_width: width,
        canvas_height: height,
        frame_rate: parseInt(frameRate),
        background_color: backgroundColor,
        interactive_enabled: interactiveEnabled,
        organization_id: orgId,
        created_by: user?.id || '',
      }, accessToken || undefined);

      if (newProject) {
        // Close dialog first
        onOpenChange(false);
        // Reset form
        resetForm();
        // Small delay to ensure database writes complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Navigate to the new project
        navigate(`/projects/${newProject.id}`, { replace: true });
        // Load the project (will fetch layers from database)
        await loadProject(newProject.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('Untitled Project');
    setSelectedPreset('1080p');
    setWidth(1920);
    setHeight(1080);
    setFrameRate('30');
    setBackgroundColor('transparent');
    setInteractiveEnabled(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  const isCustom = selectedPreset === 'custom';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            New Project
          </DialogTitle>
          <DialogDescription>
            Set up your project canvas and frame rate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              className="h-10"
              autoFocus
            />
          </div>

          {/* Resolution Preset */}
          <div className="space-y-2">
            <Label>Resolution</Label>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTION_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-violet-500 bg-violet-500/10' 
                        : 'border-border hover:border-muted-foreground/50 bg-background'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-violet-500' : 'text-muted-foreground'}`} />
                    <div className="text-xs font-medium">{preset.label}</div>
                    {preset.id !== 'custom' && (
                      <div className="text-[10px] text-muted-foreground">
                        {preset.width} × {preset.height}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimensions (only shown when Custom is selected) */}
          {isCustom && (
            <div className="space-y-2">
              <Label>Custom Dimensions</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 1920)}
                  min={100}
                  max={7680}
                  className="h-9"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 1080)}
                  min={100}
                  max={4320}
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>
          )}

          {/* Frame Rate & Background Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frame Rate</Label>
              <Select value={frameRate} onValueChange={setFrameRate}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select frame rate" />
                </SelectTrigger>
                <SelectContent>
                  {FRAME_RATES.map((fr) => (
                    <SelectItem key={fr.value} value={fr.value}>
                      {fr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Background</Label>
              <Select value={backgroundColor} onValueChange={setBackgroundColor}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%)] bg-[length:8px_8px] bg-[position:0_0,4px_4px]"></span>
                      Transparent
                    </span>
                  </SelectItem>
                  <SelectItem value="#000000">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border bg-black"></span>
                      Black
                    </span>
                  </SelectItem>
                  <SelectItem value="video">
                    <span className="flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      Video
                    </span>
                  </SelectItem>
                  <SelectItem value="#0000ff">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border bg-blue-600"></span>
                      Chroma Blue
                    </span>
                  </SelectItem>
                  <SelectItem value="#00ff00">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border bg-green-500"></span>
                      Chroma Green
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label>Project Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInteractiveEnabled(false)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  !interactiveEnabled
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MonitorPlay className="w-4 h-4" />
                  <span className="text-sm font-medium">Broadcast</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Animations for live production
                </p>
              </button>
              <button
                type="button"
                onClick={() => setInteractiveEnabled(true)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  interactiveEnabled
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Interactive</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Buttons, forms, and scripts
                </p>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground mb-2">Preview</div>
            <div className="flex items-center gap-4">
              <div 
                className="border rounded"
                style={{
                  width: Math.min(120, (width / height) * 60),
                  height: Math.min(120, (height / width) * 60),
                  aspectRatio: `${width} / ${height}`,
                  backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
                  backgroundImage: backgroundColor === 'transparent'
                    ? `linear-gradient(45deg, #333 25%, transparent 25%), 
                       linear-gradient(-45deg, #333 25%, transparent 25%), 
                       linear-gradient(45deg, transparent 75%, #333 75%), 
                       linear-gradient(-45deg, transparent 75%, #333 75%)`
                    : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                }}
              />
              <div className="text-sm">
                <div className="font-medium">{width} × {height}</div>
                <div className="text-muted-foreground">{frameRate} fps</div>
                <div className="text-muted-foreground capitalize">
                  {backgroundColor === 'transparent' ? 'Transparent' : 'Solid'} Background
                </div>
                <div className={`text-xs flex items-center gap-1 ${interactiveEnabled ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {interactiveEnabled ? <Zap className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                  {interactiveEnabled ? 'Interactive' : 'Broadcast'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || isCreating}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-400 hover:from-violet-600 hover:to-fuchsia-500"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

