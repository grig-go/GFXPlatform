import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import {
  AISettings,
  DEFAULT_AI_SETTINGS,
  loadAIImageGenSettings,
  saveAIImageGenSettings,
} from '../types/aiImageGen';
import { toast } from 'sonner';

interface AdvancedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedSettingsDialog({ open, onOpenChange }: AdvancedSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(true);

  // RCP functions
  const [boundSetVirtualSetFunction, setBoundSetVirtualSetFunction] = useState(DEFAULT_AI_SETTINGS.virtualSet.boundSetVirtualSetFunction || '');
  const [boundSetBackdropFunction, setBoundSetBackdropFunction] = useState(DEFAULT_AI_SETTINGS.virtualSet.boundSetBackdropFunction || '');

  // Screen Share settings
  const [screenShareType, setScreenShareType] = useState<'screen' | 'window'>(DEFAULT_AI_SETTINGS.screenShare?.type || 'screen');
  const [screenToCapture, setScreenToCapture] = useState<number>(DEFAULT_AI_SETTINGS.screenShare?.screenToCapture || 0);
  const [captureTargetOption, setCaptureTargetOption] = useState<'chrome' | 'powerpoint' | 'custom'>('chrome');
  const [customCaptureTarget, setCustomCaptureTarget] = useState('');

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await loadAIImageGenSettings();

      // Set RCP function settings
      if (settings.virtualSet?.boundSetVirtualSetFunction) setBoundSetVirtualSetFunction(settings.virtualSet.boundSetVirtualSetFunction);
      if (settings.virtualSet?.boundSetBackdropFunction) setBoundSetBackdropFunction(settings.virtualSet.boundSetBackdropFunction);

      // Load screen share settings
      if (settings.screenShare?.type) setScreenShareType(settings.screenShare.type);
      if (settings.screenShare?.screenToCapture !== undefined) setScreenToCapture(settings.screenShare.screenToCapture);
      if (settings.screenShare?.captureTarget) {
        const target = settings.screenShare.captureTarget;
        if (target === 'chrome' || target === 'powerpoint') {
          setCaptureTargetOption(target);
        } else {
          setCaptureTargetOption('custom');
          setCustomCaptureTarget(target);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const currentSettings = await loadAIImageGenSettings();
      const updatedSettings: AISettings = {
        ...currentSettings,
        virtualSet: {
          ...currentSettings.virtualSet,
          boundSetVirtualSetFunction: boundSetVirtualSetFunction,
          boundSetBackdropFunction: boundSetBackdropFunction
        },
        screenShare: {
          type: screenShareType,
          screenToCapture: screenToCapture,
          captureTarget: captureTargetOption === 'custom' ? customCaptureTarget : captureTargetOption
        }
      };
      await saveAIImageGenSettings(updatedSettings);
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save advanced settings:', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[450px] !w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Settings</DialogTitle>
          <DialogDescription>
            Configure RCP functions and screen share settings.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading settings...</span>
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* RCP Functions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">RCP Functions (Debug)</h3>

              <div className="grid gap-2">
                <Label htmlFor="rcp-vs">Set Virtual Set Function</Label>
                <Input
                  id="rcp-vs"
                  value={boundSetVirtualSetFunction}
                  onChange={(e) => setBoundSetVirtualSetFunction(e.target.value)}
                  placeholder="/remote/preset/..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rcp-bd">Set Backdrop Function</Label>
                <Input
                  id="rcp-bd"
                  value={boundSetBackdropFunction}
                  onChange={(e) => setBoundSetBackdropFunction(e.target.value)}
                  placeholder="/remote/preset/..."
                />
              </div>
            </div>

            {/* Screen Share */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Screen Share</h3>

              <div className="grid gap-2">
                <Label htmlFor="screen-share-type">Type</Label>
                <Select value={screenShareType} onValueChange={(value: 'screen' | 'window') => setScreenShareType(value)}>
                  <SelectTrigger id="screen-share-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screen">Screen</SelectItem>
                    <SelectItem value="window">Window</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {screenShareType === 'screen' && (
                <div className="grid gap-2">
                  <Label htmlFor="screen-to-capture">Screen to Capture</Label>
                  <Select value={screenToCapture.toString()} onValueChange={(value) => setScreenToCapture(parseInt(value))}>
                    <SelectTrigger id="screen-to-capture">
                      <SelectValue placeholder="Select screen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {screenShareType === 'window' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="capture-target">Capture Target</Label>
                    <Select
                      value={captureTargetOption}
                      onValueChange={(value: 'chrome' | 'powerpoint' | 'custom') => setCaptureTargetOption(value)}
                    >
                      <SelectTrigger id="capture-target">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chrome">Chrome</SelectItem>
                        <SelectItem value="powerpoint">PowerPoint</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {captureTargetOption === 'custom' && (
                    <div className="grid gap-2">
                      <Label htmlFor="custom-capture-target">Custom Target Name</Label>
                      <Input
                        id="custom-capture-target"
                        value={customCaptureTarget}
                        onChange={(e) => setCustomCaptureTarget(e.target.value)}
                        placeholder="Enter custom target name..."
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
