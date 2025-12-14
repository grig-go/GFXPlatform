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
import {
  AISettings,
  DEFAULT_AI_SETTINGS,
  GEMINI_MODELS,
  IMAGEN_MODELS,
  ASPECT_RATIOS,
  loadAIImageGenSettings,
  saveAIImageGenSettings
} from '../types/aiImageGen';
import { toast } from 'sonner';

interface AdvancedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedSettingsDialog({ open, onOpenChange }: AdvancedSettingsDialogProps) {
  const [backgroundAspectRatio, setBackgroundAspectRatio] = useState(DEFAULT_AI_SETTINGS.virtualSet.defaultAspectRatio);
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(DEFAULT_AI_SETTINGS.gemini.textModel);
  const [selectedImagenModel, setSelectedImagenModel] = useState(DEFAULT_AI_SETTINGS.imagen.model);
  const [geminiApiKey, setGeminiApiKey] = useState(DEFAULT_AI_SETTINGS.gemini.apiKey);
  const [imagenApiKey, setImagenApiKey] = useState(DEFAULT_AI_SETTINGS.imagen.apiKey);
  const [boundSetVirtualSetFunction, setBoundSetVirtualSetFunction] = useState(DEFAULT_AI_SETTINGS.virtualSet.boundSetVirtualSetFunction || '');
  const [boundSetBackdropFunction, setBoundSetBackdropFunction] = useState(DEFAULT_AI_SETTINGS.virtualSet.boundSetBackdropFunction || '');
  
  // Screen Share settings
  const [screenShareType, setScreenShareType] = useState<'screen' | 'window'>(DEFAULT_AI_SETTINGS.screenShare?.type || 'screen');
  const [screenToCapture, setScreenToCapture] = useState<number>(DEFAULT_AI_SETTINGS.screenShare?.screenToCapture || 0);
  const [captureTarget, setCaptureTarget] = useState(DEFAULT_AI_SETTINGS.screenShare?.captureTarget || 'chrome');
  const [captureTargetOption, setCaptureTargetOption] = useState<'chrome' | 'powerpoint' | 'custom'>('chrome');
  const [customCaptureTarget, setCustomCaptureTarget] = useState('');

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSavedSettings();
    }
  }, [open]);

  const loadSavedSettings = async () => {
    try {
      const settings = await loadAIImageGenSettings();

      if (settings.gemini?.apiKey !== undefined) setGeminiApiKey(settings.gemini.apiKey);
      if (settings.imagen?.apiKey !== undefined) setImagenApiKey(settings.imagen.apiKey);
      if (settings.virtualSet.defaultAspectRatio) setBackgroundAspectRatio(settings.virtualSet.defaultAspectRatio);
      if (settings.virtualSet.selectedGeminiModel) setSelectedGeminiModel(settings.virtualSet.selectedGeminiModel);
      if (settings.virtualSet.selectedImagenModel) setSelectedImagenModel(settings.virtualSet.selectedImagenModel);
      if (settings.virtualSet.boundSetVirtualSetFunction) setBoundSetVirtualSetFunction(settings.virtualSet.boundSetVirtualSetFunction);
      if (settings.virtualSet.boundSetBackdropFunction) setBoundSetBackdropFunction(settings.virtualSet.boundSetBackdropFunction);
      
      // Load screen share settings
      if (settings.screenShare?.type) setScreenShareType(settings.screenShare.type);
      if (settings.screenShare?.screenToCapture !== undefined) setScreenToCapture(settings.screenShare.screenToCapture);
      if (settings.screenShare?.captureTarget) {
        const target = settings.screenShare.captureTarget;
        setCaptureTarget(target);
        if (target === 'chrome' || target === 'powerpoint') {
          setCaptureTargetOption(target);
        } else {
          setCaptureTargetOption('custom');
          setCustomCaptureTarget(target);
        }
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    try {
      const currentSettings = await loadAIImageGenSettings();
      const updatedSettings: AISettings = {
        ...currentSettings,
        gemini: { 
          ...DEFAULT_AI_SETTINGS.gemini,
          ...currentSettings.gemini,
          apiKey: geminiApiKey 
        },
        imagen: { 
          ...DEFAULT_AI_SETTINGS.imagen,
          ...currentSettings.imagen,
          apiKey: imagenApiKey 
        },
        virtualSet: {
          ...currentSettings.virtualSet,
          defaultAspectRatio: backgroundAspectRatio,
          selectedGeminiModel: selectedGeminiModel,
          selectedImagenModel: selectedImagenModel,
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
      <DialogContent className="!max-w-[40vw] !w-[40vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Settings</DialogTitle>
          <DialogDescription>
            Configure AI models and API keys for generation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Virtual Set Generation</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="gemini-model">Gemini Model</Label>
              <Select value={selectedGeminiModel} onValueChange={setSelectedGeminiModel}>
                <SelectTrigger id="gemini-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input 
                id="gemini-key" 
                type="password" 
                value={geminiApiKey} 
                onChange={(e) => setGeminiApiKey(e.target.value)} 
                placeholder="Enter Gemini API Key"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Backdrop Generation</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="imagen-model">Imagen Model</Label>
              <Select value={selectedImagenModel} onValueChange={setSelectedImagenModel}>
                <SelectTrigger id="imagen-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGEN_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imagen-key">Imagen API Key</Label>
              <Input 
                id="imagen-key" 
                type="password" 
                value={imagenApiKey} 
                onChange={(e) => setImagenApiKey(e.target.value)} 
                placeholder="Enter Imagen API Key"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="aspect-ratio">Default Aspect Ratio</Label>
              <Select value={backgroundAspectRatio} onValueChange={setBackgroundAspectRatio}>
                <SelectTrigger id="aspect-ratio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASPECT_RATIOS).map(([label, ratio]) => (
                    <SelectItem key={label} value={ratio}>
                      {label} ({ratio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}