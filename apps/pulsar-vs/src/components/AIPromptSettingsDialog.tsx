import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Save, Plane, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { getAllAISettings, saveAISettings, AIPromptInjector } from '../utils/aiSettingsApi';

interface AIPromptSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIPromptSettingsDialog({ open, onOpenChange }: AIPromptSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('virtualset');

  // Prompt injector states for Virtual Set
  const [cameraAngle, setCameraAngle] = useState('');
  const [pointOfView, setPointOfView] = useState('');
  const [sceneConsiderations, setSceneConsiderations] = useState('');

  // Prompt injector states for Airport
  const [airportInstructions, setAirportInstructions] = useState('');

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getAllAISettings();

      // Load Virtual Set settings
      const cameraAngleSetting = settings.find(s => s.feature === 'camera_angle');
      const pointOfViewSetting = settings.find(s => s.feature === 'point_of_view');
      const sceneConsiderationsSetting = settings.find(s => s.feature === 'scene_considerations');

      setCameraAngle(cameraAngleSetting?.prompt_template || '');
      setPointOfView(pointOfViewSetting?.prompt_template || '');
      setSceneConsiderations(sceneConsiderationsSetting?.prompt_template || '');

      // Load Airport settings
      const airportSetting = settings.find(s => s.feature === 'airport_instructions');
      setAirportInstructions(airportSetting?.prompt_template || getDefaultAirportInstructions());
    } catch (error) {
      console.error('Failed to load AI prompt settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAirportInstructions = () => {
    return `When updating scene configuration for Airport projects:

FIELD ALIASES:
- "Top" refers to ElementTop (options: Hawk, Flower, Stadium)
- "Background" refers to environment_background (options: Desert, Marble)
- "Pattern" or "Patern" refers to BaseTop (options: Gold, Metal, Dark)

IMPORTANT RULES:
- Only update the specific field mentioned, not all fields
- Only update ALL fields when the user explicitly says "all"
- Match option names case-insensitively (e.g., "hawk" = "Hawk")

EXAMPLE COMMANDS:
- "Set top to hawk" → Only update ElementTop to hawk
- "Change background to desert" → Only update environment_background to desert
- "Use gold pattern" → Only update BaseTop to gold
- "Set all to default" → Update all fields`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings: Partial<AIPromptInjector>[] = [
        // Virtual Set settings
        {
          feature: 'camera_angle',
          prompt_template: cameraAngle,
          is_enabled: true,
          params: '{}',
          version: 1,
        },
        {
          feature: 'point_of_view',
          prompt_template: pointOfView,
          is_enabled: true,
          params: '{}',
          version: 1,
        },
        {
          feature: 'scene_considerations',
          prompt_template: sceneConsiderations,
          is_enabled: true,
          params: '{}',
          version: 1,
        },
        // Airport settings
        {
          feature: 'airport_instructions',
          prompt_template: airportInstructions,
          is_enabled: true,
          params: '{}',
          version: 1,
        },
      ];

      const result = await saveAISettings(settings);

      if (result.success) {
        toast.success('AI prompt settings saved successfully');
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save AI prompt settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAirportDefaults = () => {
    setAirportInstructions(getDefaultAirportInstructions());
    toast.success('Reset to default Airport instructions');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Prompt Settings</DialogTitle>
          <DialogDescription>
            Configure AI instructions for different project types.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="virtualset" className="flex items-center gap-2">
                  <Tv className="size-4" />
                  Virtual Set
                </TabsTrigger>
                <TabsTrigger value="airport" className="flex items-center gap-2">
                  <Plane className="size-4" />
                  Airport
                </TabsTrigger>
              </TabsList>

              {/* Virtual Set Tab */}
              <TabsContent value="virtualset" className="space-y-6 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure prompt injectors for camera angle, point of view, and scene considerations.
                  These will be automatically added to your image generation prompts.
                </p>

                {/* Camera Angle */}
                <div className="space-y-2">
                  <Label htmlFor="camera-angle">
                    Camera Angle
                  </Label>
                  <Textarea
                    id="camera-angle"
                    placeholder="e.g., Wide angle shot, cinematic perspective, slightly elevated viewpoint..."
                    value={cameraAngle}
                    onChange={(e) => setCameraAngle(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify the camera angle and framing for generated images
                  </p>
                </div>

                {/* Point of View */}
                <div className="space-y-2">
                  <Label htmlFor="point-of-view">
                    Point of View
                  </Label>
                  <Textarea
                    id="point-of-view"
                    placeholder="e.g., Eye-level perspective, viewer positioned as observer, immersive viewpoint..."
                    value={pointOfView}
                    onChange={(e) => setPointOfView(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define the viewer's perspective and positioning
                  </p>
                </div>

                {/* Scene Considerations */}
                <div className="space-y-2">
                  <Label htmlFor="scene-considerations">
                    Scene Considerations
                  </Label>
                  <Textarea
                    id="scene-considerations"
                    placeholder="e.g., Suitable for virtual production, broadcast-ready composition, appropriate depth of field..."
                    value={sceneConsiderations}
                    onChange={(e) => setSceneConsiderations(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional scene requirements and technical considerations
                  </p>
                </div>
              </TabsContent>

              {/* Airport Tab */}
              <TabsContent value="airport" className="space-y-6 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure AI instructions for Airport scene configuration. These help the AI understand
                  your shorthand commands when editing Airport scenes.
                </p>

                {/* Airport Instructions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="airport-instructions">
                      AI Instructions for Airport
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetAirportDefaults}
                      className="text-xs h-7"
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                  <Textarea
                    id="airport-instructions"
                    placeholder="Enter instructions for the AI when working with Airport scenes..."
                    value={airportInstructions}
                    onChange={(e) => setAirportInstructions(e.target.value)}
                    rows={12}
                    className="resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define field aliases, option mappings, and behavior rules for the AI
                  </p>
                </div>

                {/* Quick Reference */}
                <div className="rounded-lg border p-4 bg-muted/30">
                  <h4 className="text-sm font-medium mb-2">Quick Reference</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-2">
                      <span className="font-medium text-blue-600 w-24">"Top"</span>
                      <span>→ ElementTop (Hawk, Flower, Stadium)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-blue-600 w-24">"Background"</span>
                      <span>→ environment_background (Desert, Marble)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-blue-600 w-24">"Pattern"</span>
                      <span>→ BaseTop (Gold, Metal, Dark)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
