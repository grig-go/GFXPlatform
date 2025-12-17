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
import { Loader2, Bot, Image, Pencil } from 'lucide-react';
import {
  AISettings,
  AIProviderModel,
  DEFAULT_AI_SETTINGS,
  GEMINI_MODELS,
  IMAGEN_MODELS,
  IMAGE_EDIT_MODELS,
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
  const [backgroundAspectRatio, setBackgroundAspectRatio] = useState(DEFAULT_AI_SETTINGS.virtualSet.defaultAspectRatio);

  // Model selections
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(DEFAULT_AI_SETTINGS.gemini.textModel);
  const [selectedImagenModel, setSelectedImagenModel] = useState(DEFAULT_AI_SETTINGS.imagen.model);
  const [selectedImageEditModel, setSelectedImageEditModel] = useState(DEFAULT_AI_SETTINGS.imageEdit.model);

  // API Key (shared across all Google AI services)
  const [googleApiKey, setGoogleApiKey] = useState('');

  // Available models from backend
  const [textModels, setTextModels] = useState<AIProviderModel[]>([]);
  const [imageGenModels, setImageGenModels] = useState<AIProviderModel[]>([]);
  const [imageEditModels, setImageEditModels] = useState<AIProviderModel[]>([]);

  // Load settings and providers when dialog opens
  useEffect(() => {
    if (open) {
      loadSettingsAndProviders();
    }
  }, [open]);

  const loadSettingsAndProviders = async () => {
    setIsLoading(true);
    try {
      // Fetch providers from backend and local settings in parallel
      const [providers, settings] = await Promise.all([
        fetchPulsarVSProviders(true), // Force refresh when dialog opens
        loadAIImageGenSettings()
      ]);

      // Set available models from backend providers
      if (providers.text?.availableModels) {
        setTextModels(providers.text.availableModels);
      }
      if (providers.imageGen?.availableModels) {
        setImageGenModels(providers.imageGen.availableModels);
      }
      if (providers.imageEdit?.availableModels) {
        setImageEditModels(providers.imageEdit.availableModels);
      }

      // Set current model selections from backend or settings
      setSelectedGeminiModel(
        settings.virtualSet?.selectedGeminiModel ||
        providers.text?.model ||
        DEFAULT_AI_SETTINGS.gemini.textModel
      );
      setSelectedImagenModel(
        settings.virtualSet?.selectedImagenModel ||
        providers.imageGen?.model ||
        DEFAULT_AI_SETTINGS.imagen.model
      );
      setSelectedImageEditModel(
        settings.virtualSet?.selectedImageEditModel ||
        providers.imageEdit?.model ||
        DEFAULT_AI_SETTINGS.imageEdit.model
      );

      // Set API key (use gemini as primary since it's shared)
      if (settings.gemini?.apiKey) setGoogleApiKey(settings.gemini.apiKey);

      // Set aspect ratio
      if (settings.virtualSet?.defaultAspectRatio) setBackgroundAspectRatio(settings.virtualSet.defaultAspectRatio);
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
      const updatedSettings: AISettings = {
        ...currentSettings,
        gemini: {
          ...DEFAULT_AI_SETTINGS.gemini,
          ...currentSettings.gemini,
          apiKey: googleApiKey,
          textModel: selectedGeminiModel
        },
        imagen: {
          ...DEFAULT_AI_SETTINGS.imagen,
          ...currentSettings.imagen,
          apiKey: googleApiKey,
          model: selectedImagenModel
        },
        imageEdit: {
          ...DEFAULT_AI_SETTINGS.imageEdit,
          ...currentSettings.imageEdit,
          apiKey: googleApiKey,
          model: selectedImageEditModel
        },
        virtualSet: {
          ...currentSettings.virtualSet,
          defaultAspectRatio: backgroundAspectRatio,
          selectedGeminiModel: selectedGeminiModel,
          selectedImagenModel: selectedImagenModel,
          selectedImageEditModel: selectedImageEditModel
        }
      };
      await saveAIImageGenSettings(updatedSettings);
      toast.success('AI providers saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save AI providers:', error);
      toast.error('Failed to save AI providers');
    }
  };

  // Helper to get model options - use backend models if available, fallback to hardcoded
  const getTextModelOptions = () => {
    if (textModels.length > 0) return textModels;
    return GEMINI_MODELS.map(id => ({ id, name: id }));
  };

  const getImageGenModelOptions = () => {
    if (imageGenModels.length > 0) return imageGenModels;
    return IMAGEN_MODELS.map(id => ({ id, name: id }));
  };

  const getImageEditModelOptions = () => {
    if (imageEditModels.length > 0) return imageEditModels;
    return IMAGE_EDIT_MODELS.map(id => ({ id, name: id }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[500px] !w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Providers
          </DialogTitle>
          <DialogDescription>
            Configure AI models and API keys for text generation, image generation, and image editing.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading providers...</span>
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* Google API Key - shared across all services */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h3 className="text-sm font-semibold">Google AI API Key</h3>
              <p className="text-xs text-muted-foreground">Shared across Gemini and Imagen services</p>
              <Input
                id="google-api-key"
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="Enter Google AI API Key"
              />
            </div>

            {/* Text Generation (Virtual Set) */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Text Generation</h3>
              </div>
              <p className="text-xs text-muted-foreground">Used for AI-generated virtual set configurations</p>
              <div className="grid gap-2">
                <Label htmlFor="gemini-model" className="text-xs">Gemini Model</Label>
                <Select value={selectedGeminiModel} onValueChange={setSelectedGeminiModel}>
                  <SelectTrigger id="gemini-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTextModelOptions().map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Generation (Backdrop) */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">Image Generation</h3>
              </div>
              <p className="text-xs text-muted-foreground">Used for generating backdrop images</p>
              <div className="grid gap-2">
                <Label htmlFor="imagen-model" className="text-xs">Imagen Model</Label>
                <Select value={selectedImagenModel} onValueChange={setSelectedImagenModel}>
                  <SelectTrigger id="imagen-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getImageGenModelOptions().map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
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

            {/* Image Editing */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold">Image Editing</h3>
              </div>
              <p className="text-xs text-muted-foreground">Used for editing and inpainting images</p>
              <div className="grid gap-2">
                <Label htmlFor="image-edit-model" className="text-xs">Image Edit Model</Label>
                <Select value={selectedImageEditModel} onValueChange={setSelectedImageEditModel}>
                  <SelectTrigger id="image-edit-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getImageEditModelOptions().map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
