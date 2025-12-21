import { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  cn,
} from '@emergent-platform/ui';
import {
  getAIModel,
  setAIModel,
  getAIImageModel,
  setAIImageModel,
  clearResolvedProviderCache,
} from '@/lib/ai';
import {
  getTextProviders,
  getImageProviders,
  type AIProvider,
} from '@/services/aiProviderService';
import {
  Sparkles,
  Check,
  RotateCcw,
  AlertCircle,
  Image,
  Loader2,
  Cloud,
  ExternalLink,
} from 'lucide-react';

interface AIModelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Provider color mapping
const PROVIDER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  gemini: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500' },
  claude: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500' },
  openai: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500' },
};

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  openai: 'OpenAI',
};

export function AIModelSettingsDialog({ open, onOpenChange }: AIModelSettingsDialogProps) {
  // Local state - store selected model ID
  const [selectedModel, setSelectedModel] = useState<string>(getAIModel());
  const [selectedImageModel, setSelectedImageModel] = useState<string>(getAIImageModel());
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Backend providers state
  const [textProviders, setTextProviders] = useState<AIProvider[]>([]);
  const [imageProviders, setImageProviders] = useState<AIProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Load current settings when dialog opens
  useEffect(() => {
    if (open) {
      setHasChanges(false);
      // Load providers from backend - will set default selection after loading
      loadBackendProviders();
    }
  }, [open]);

  // Load providers from backend
  const loadBackendProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const [text, image] = await Promise.all([
        getTextProviders(true), // Force refresh
        getImageProviders(true),
      ]);

      setTextProviders(text);
      setImageProviders(image);
      console.log('[AISettings] Loaded providers:', { text: text.length, image: image.length });

      // Auto-select the configured model from the first available provider
      // This ensures the backend configuration is used by default
      const currentTextModel = getAIModel();
      const currentImageModel = getAIImageModel();

      // Check if current model is valid (exists in providers), otherwise use backend default
      const textProviderWithCurrentModel = text.find(p => p.model === currentTextModel);
      if (textProviderWithCurrentModel && textProviderWithCurrentModel.apiKeyConfigured) {
        setSelectedModel(currentTextModel);
      } else if (text.length > 0 && text[0].model) {
        // Use the first provider's configured model
        setSelectedModel(text[0].model);
        console.log('[AISettings] Auto-selected text model:', text[0].model);
      }

      const imageProviderWithCurrentModel = image.find(p => p.model === currentImageModel);
      if (imageProviderWithCurrentModel && imageProviderWithCurrentModel.apiKeyConfigured) {
        setSelectedImageModel(currentImageModel);
      } else if (image.length > 0 && image[0].model) {
        // Use the first provider's configured model
        setSelectedImageModel(image[0].model);
        console.log('[AISettings] Auto-selected image model:', image[0].model);
      }
    } catch (err) {
      console.warn('[AISettings] Failed to load backend providers:', err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // Track changes
  useEffect(() => {
    const originalModel = getAIModel();
    const originalImageModel = getAIImageModel();

    const changed =
      selectedModel !== originalModel ||
      selectedImageModel !== originalImageModel;

    setHasChanges(changed);
  }, [selectedModel, selectedImageModel]);

  // Get current selected provider info
  const getCurrentProviderName = () => {
    for (const provider of textProviders) {
      const hasModel = provider.availableModels?.some(m => m.id === selectedModel);
      if (hasModel) return provider.providerName;
    }
    return null;
  };

  const currentProviderName = getCurrentProviderName();

  // Save settings
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        setAIModel(selectedModel),
        setAIImageModel(selectedImageModel),
      ]);

      // Clear the resolved provider cache so next AI call uses new settings
      clearResolvedProviderCache();

      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedModel, selectedImageModel, onOpenChange]);

  // Reset to defaults - use configured model from first provider
  const resetToDefaults = useCallback(() => {
    // Find first configured model from text providers
    if (textProviders.length > 0 && textProviders[0].model) {
      setSelectedModel(textProviders[0].model);
    }
    // Find first configured model from image providers
    if (imageProviders.length > 0 && imageProviders[0].model) {
      setSelectedImageModel(imageProviders[0].model);
    }
  }, [textProviders, imageProviders]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Model Settings
            {isLoadingProviders && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {!isLoadingProviders && textProviders.length > 0 && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Cloud
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure your preferred AI model for the chat assistant.
            {textProviders.length > 0 && (
              <span className="block mt-1 text-emerald-400">
                API keys are managed centrally via Nova dashboard.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          {/* Loading State */}
          {isLoadingProviders && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading providers...</span>
            </div>
          )}

          {/* No providers assigned */}
          {!isLoadingProviders && textProviders.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
              <div>
                <p className="text-sm font-medium">No AI providers assigned</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure AI providers for Nova GFX in the Nova dashboard.
                </p>
              </div>
              <a
                href="http://localhost:3010/ai-connections"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:underline"
              >
                Open Nova Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Text Model Selection - Show only assigned providers with their configured model */}
          {!isLoadingProviders && textProviders.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select AI Model</Label>

              {textProviders.map((provider) => {
                const colors = PROVIDER_COLORS[provider.providerName] || PROVIDER_COLORS.gemini;
                const providerDisplayName = PROVIDER_NAMES[provider.providerName] || provider.name;
                // Use the provider's configured model, not availableModels
                const configuredModelId = provider.model;
                const configuredModel = provider.availableModels?.find(m => m.id === configuredModelId);
                const isDisabled = !provider.apiKeyConfigured;
                const isSelected = selectedModel === configuredModelId;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={isDisabled}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? cn(colors.border, colors.bg)
                        : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50',
                      isDisabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                    )}
                    onClick={() => setSelectedModel(configuredModelId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={cn("text-xs font-medium uppercase tracking-wide flex items-center gap-2 mb-1", colors.text)}>
                          <span className={cn("w-2 h-2 rounded-full", colors.text.replace('text-', 'bg-'))}></span>
                          {providerDisplayName}
                          {provider.apiKeyConfigured ? (
                            <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[10px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Not configured
                            </span>
                          )}
                        </div>
                        <div className="font-medium">
                          {configuredModel?.name || configuredModelId}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {configuredModel?.description || provider.description || 'AI model'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={cn("w-2 h-2 rounded-full", colors.text.replace('text-', 'bg-'))} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Image Generation Models - Show only assigned providers with their configured model */}
          {!isLoadingProviders && imageProviders.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Image Generation Model</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Select the model for AI image generation.
              </p>

              {imageProviders.map((provider) => {
                const colors = PROVIDER_COLORS[provider.providerName] || { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500' };
                const providerDisplayName = PROVIDER_NAMES[provider.providerName] || provider.name;
                // Use the provider's configured model, not availableModels
                const configuredModelId = provider.model;
                const configuredModel = provider.availableModels?.find(m => m.id === configuredModelId);
                const isDisabled = !provider.apiKeyConfigured;
                const isSelected = selectedImageModel === configuredModelId;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={isDisabled}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? cn(colors.border, colors.bg)
                        : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50',
                      isDisabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                    )}
                    onClick={() => setSelectedImageModel(configuredModelId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={cn("text-xs font-medium uppercase tracking-wide flex items-center gap-2 mb-1", colors.text)}>
                          <span className={cn("w-2 h-2 rounded-full", colors.text.replace('text-', 'bg-'))}></span>
                          {providerDisplayName}
                          {provider.apiKeyConfigured ? (
                            <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[10px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Not configured
                            </span>
                          )}
                        </div>
                        <div className="font-medium">
                          {configuredModel?.name || configuredModelId}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {configuredModel?.description || provider.description || 'Image generation model'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={cn("w-2 h-2 rounded-full", colors.text.replace('text-', 'bg-'))} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Current Status */}
          {!isLoadingProviders && textProviders.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="text-xs font-medium mb-1">Current Configuration</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Active Model:</span>
                  <span className="font-medium text-foreground">{selectedModel}</span>
                </div>
                {currentProviderName && (
                  <div className="flex items-center justify-between">
                    <span>Provider:</span>
                    <span className={cn(
                      "font-medium",
                      PROVIDER_COLORS[currentProviderName]?.text || 'text-foreground'
                    )}>
                      {PROVIDER_NAMES[currentProviderName] || currentProviderName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
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
