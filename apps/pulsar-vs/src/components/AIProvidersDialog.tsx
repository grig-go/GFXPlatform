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
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Loader2, Bot, Image, Pencil, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  AIProvider,
  ASPECT_RATIOS,
  loadAIImageGenSettings,
  saveAIImageGenSettings,
  fetchPulsarVSProviders
} from '../types/aiImageGen';
import { toast } from 'sonner';

interface AIProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIProvidersDialog({ open, onOpenChange }: AIProvidersDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundAspectRatio, setBackgroundAspectRatio] = useState('16:9');

  // Providers from backend
  const [textProvider, setTextProvider] = useState<AIProvider | null>(null);
  const [imageGenProvider, setImageGenProvider] = useState<AIProvider | null>(null);
  const [imageEditProvider, setImageEditProvider] = useState<AIProvider | null>(null);

  // Load providers when dialog opens
  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      // Fetch providers from backend and local settings in parallel
      const [providers, settings] = await Promise.all([
        fetchPulsarVSProviders(true), // Force refresh when dialog opens
        loadAIImageGenSettings()
      ]);

      // Set providers from backend
      setTextProvider(providers.text);
      setImageGenProvider(providers.imageGen);
      setImageEditProvider(providers.imageEdit);

      // Set aspect ratio from settings
      if (settings.virtualSet?.defaultAspectRatio) {
        setBackgroundAspectRatio(settings.virtualSet.defaultAspectRatio);
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error);
      toast.error('Failed to load AI providers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const currentSettings = await loadAIImageGenSettings();
      const updatedSettings = {
        ...currentSettings,
        virtualSet: {
          ...currentSettings.virtualSet,
          defaultAspectRatio: backgroundAspectRatio
        }
      };
      await saveAIImageGenSettings(updatedSettings);
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const ProviderStatus = ({ provider, label }: { provider: AIProvider | null; label: string }) => (
    <div className="flex items-center gap-2">
      {provider?.apiKeyConfigured ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-xs text-muted-foreground">
        {provider ? (
          provider.apiKeyConfigured ? 'Configured' : 'API key not configured'
        ) : (
          `No ${label} provider assigned`
        )}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[500px] !w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Providers
          </DialogTitle>
          <DialogDescription>
            AI providers are managed in the admin panel. This dialog shows the current configuration.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading providers...</span>
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* Text Generation Provider */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Text Generation</h3>
                </div>
                <ProviderStatus provider={textProvider} label="text generation" />
              </div>
              <p className="text-xs text-muted-foreground">Used for AI-generated virtual set configurations</p>
              {textProvider && (
                <div className="text-xs bg-muted/50 p-2 rounded">
                  <div><strong>Provider:</strong> {textProvider.providerName}</div>
                  <div><strong>Model:</strong> {textProvider.model}</div>
                </div>
              )}
            </div>

            {/* Image Generation Provider */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold">Image Generation</h3>
                </div>
                <ProviderStatus provider={imageGenProvider} label="image generation" />
              </div>
              <p className="text-xs text-muted-foreground">Used for generating backdrop images</p>
              {imageGenProvider && (
                <div className="text-xs bg-muted/50 p-2 rounded">
                  <div><strong>Provider:</strong> {imageGenProvider.providerName}</div>
                  <div><strong>Model:</strong> {imageGenProvider.model}</div>
                </div>
              )}

              <div className="grid gap-2 pt-2">
                <Label htmlFor="aspect-ratio" className="text-xs">Default Aspect Ratio</Label>
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

            {/* Image Editing Provider */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-semibold">Image Editing</h3>
                </div>
                <ProviderStatus provider={imageEditProvider} label="image editing" />
              </div>
              <p className="text-xs text-muted-foreground">Used for editing and inpainting images</p>
              {imageEditProvider && (
                <div className="text-xs bg-muted/50 p-2 rounded">
                  <div><strong>Provider:</strong> {imageEditProvider.providerName}</div>
                  <div><strong>Model:</strong> {imageEditProvider.model}</div>
                </div>
              )}
            </div>

            {/* Refresh button */}
            <Button variant="outline" onClick={loadProviders} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Providers
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
