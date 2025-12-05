import { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  cn,
} from '@emergent-platform/ui';
import { AI_MODELS, getAIModel, setAIModel, type AIModelId, DEFAULT_AI_MODEL } from '@/lib/ai';
import {
  Sparkles,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Key,
} from 'lucide-react';

interface AIModelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIModelSettingsDialog({ open, onOpenChange }: AIModelSettingsDialogProps) {
  // Local state
  const [aiModel, setAiModel] = useState<AIModelId>(getAIModel());
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current settings when dialog opens
  useEffect(() => {
    if (open) {
      setAiModel(getAIModel());
      // Load API keys from localStorage (user preferences)
      setGeminiApiKey(localStorage.getItem('nova-gemini-api-key') || '');
      setClaudeApiKey(localStorage.getItem('nova-claude-api-key') || '');
      setHasChanges(false);
    }
  }, [open]);

  // Track changes
  useEffect(() => {
    const originalModel = getAIModel();
    const originalGeminiKey = localStorage.getItem('nova-gemini-api-key') || '';
    const originalClaudeKey = localStorage.getItem('nova-claude-api-key') || '';
    
    const changed =
      aiModel !== originalModel ||
      geminiApiKey !== originalGeminiKey ||
      claudeApiKey !== originalClaudeKey;
    
    setHasChanges(changed);
  }, [aiModel, geminiApiKey, claudeApiKey]);

  // Check if API keys are configured (from env or user input)
  const hasGeminiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY || geminiApiKey);
  const hasClaudeKey = Boolean(import.meta.env.VITE_CLAUDE_API_KEY || claudeApiKey);

  // Get the current model's provider
  const currentProvider = AI_MODELS[aiModel]?.provider;

  // Save settings
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save AI model preference
      setAIModel(aiModel);
      
      // Save API keys to localStorage (these override env variables)
      if (geminiApiKey) {
        localStorage.setItem('nova-gemini-api-key', geminiApiKey);
      } else {
        localStorage.removeItem('nova-gemini-api-key');
      }
      
      if (claudeApiKey) {
        localStorage.setItem('nova-claude-api-key', claudeApiKey);
      } else {
        localStorage.removeItem('nova-claude-api-key');
      }
      
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [aiModel, geminiApiKey, claudeApiKey, onOpenChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setAiModel(DEFAULT_AI_MODEL);
    setGeminiApiKey('');
    setClaudeApiKey('');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Model Settings
          </DialogTitle>
          <DialogDescription>
            Configure your preferred AI model and API keys for the chat assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          {/* Model Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select AI Model</Label>
            
            {/* Gemini Models */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Google Gemini
                {!hasGeminiKey && (
                  <span className="text-amber-400 text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No API key
                  </span>
                )}
              </div>
              {Object.entries(AI_MODELS)
                .filter(([, m]) => m.provider === 'gemini')
                .map(([id, model]) => {
                  const isDisabled = !hasGeminiKey || ('disabled' in model && model.disabled);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isDisabled}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors',
                        aiModel === id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-blue-500/50 hover:bg-muted/50',
                        isDisabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                      )}
                      onClick={() => setAiModel(id as AIModelId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {model.name}
                            {'disabled' in model && model.disabled && (
                              <span className="text-xs bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">
                                Coming Soon
                              </span>
                            )}
                            {id === 'gemini-2.5-pro' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                Most Capable
                              </span>
                            )}
                            {id === 'gemini-2.5-flash' && (
                              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                            {id === 'gemini-2.0-flash' && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                Default
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
                  );
                })}
            </div>

            {/* Claude Models */}
            <div className="space-y-1.5 mt-4">
              <div className="text-xs font-medium text-violet-400 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                Anthropic Claude
                {!hasClaudeKey && (
                  <span className="text-amber-400 text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No API key
                  </span>
                )}
              </div>
              {Object.entries(AI_MODELS)
                .filter(([, m]) => m.provider === 'claude')
                .map(([id, model]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!hasClaudeKey}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      aiModel === id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-border hover:border-violet-500/50 hover:bg-muted/50',
                      !hasClaudeKey && 'opacity-50 cursor-not-allowed'
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

          {/* API Keys Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">API Keys</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Enter your API keys below. These are stored locally in your browser and override environment variables.
            </p>

            {/* Gemini API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="gemini-key" className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Gemini API Key
                </Label>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={import.meta.env.VITE_GEMINI_API_KEY ? '••••••••••••••••' : 'AIza...'}
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {import.meta.env.VITE_GEMINI_API_KEY && !geminiApiKey && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Using environment variable
                </p>
              )}
            </div>

            {/* Claude API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="claude-key" className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  Claude API Key
                </Label>
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-500 hover:underline inline-flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  id="claude-key"
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder={import.meta.env.VITE_CLAUDE_API_KEY ? '••••••••••••••••' : 'sk-ant-...'}
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {import.meta.env.VITE_CLAUDE_API_KEY && !claudeApiKey && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Using environment variable
                </p>
              )}
            </div>
          </div>

          {/* Current Status */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs font-medium mb-1">Current Configuration</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Active Model:</span>
                <span className="font-medium text-foreground">{AI_MODELS[aiModel]?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Provider:</span>
                <span className={cn(
                  "font-medium",
                  currentProvider === 'gemini' ? 'text-blue-400' : 'text-violet-400'
                )}>
                  {currentProvider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>API Status:</span>
                <span className={cn(
                  "font-medium",
                  (currentProvider === 'gemini' && hasGeminiKey) || (currentProvider === 'claude' && hasClaudeKey)
                    ? 'text-green-400'
                    : 'text-amber-400'
                )}>
                  {(currentProvider === 'gemini' && hasGeminiKey) || (currentProvider === 'claude' && hasClaudeKey)
                    ? '✓ Ready'
                    : '⚠ Missing API Key'}
                </span>
              </div>
            </div>
          </div>
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




