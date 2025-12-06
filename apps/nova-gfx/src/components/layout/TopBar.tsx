import { useCallback, useState } from 'react';
import {
  Play, Settings, HelpCircle, Cpu, Palette,
  ChevronDown, Grid3X3, Wrench, FolderOpen, Sparkles,
  ExternalLink, Copy, Check, Monitor, Keyboard, Send,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  Checkbox,
} from '@emergent-platform/ui';
import { useDesignerStore } from '@/stores/designerStore';
import { useAIPreferenceStore } from '@/stores/aiPreferenceStore';
import { PublishModal } from '@/components/dialogs/PublishModal';
import { ChannelsModal } from '@/components/dialogs/ChannelsModal';
import { UserMenu } from '@/components/auth';

interface TopBarProps {
  onOpenSettings?: () => void;
  onOpenDesignSystem?: () => void;
  onOpenAISettings?: () => void;
  onOpenSystemTemplates?: () => void;
  onShowKeyboardShortcuts?: () => void;
}

export function TopBar({ onOpenSettings, onOpenDesignSystem, onOpenAISettings, onOpenSystemTemplates, onShowKeyboardShortcuts }: TopBarProps) {
  const { aiEnabled, toggleAi } = useAIPreferenceStore();
  const {
    project,
    saveProject,
    currentTemplateId,
  } = useDesignerStore();
  const [copiedOBS, setCopiedOBS] = useState(false);
  const [copiedPublish, setCopiedPublish] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showChannelsModal, setShowChannelsModal] = useState(false);

  // Get the publish URL (project-specific, same as OBS URL)
  const getPublishUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    // Use project ID for the publish URL - this is the permanent URL for this project
    const projectSlug = project?.slug || project?.id || 'demo';
    return `${baseUrl}/play/${projectSlug}`;
  }, [project]);

  // Get the OBS-friendly URL (publish URL with OBS params)
  const getOBSUrl = useCallback(() => {
    const publishUrl = getPublishUrl();
    const templateParam = currentTemplateId ? `&template=${currentTemplateId}` : '';
    return `${publishUrl}?obs=1&transparent=1${templateParam}`;
  }, [getPublishUrl, currentTemplateId]);

  // Copy publish URL to clipboard
  const copyPublishUrl = useCallback(async () => {
    const url = getPublishUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPublish(true);
      setTimeout(() => setCopiedPublish(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [getPublishUrl]);

  // Copy OBS URL to clipboard
  const copyOBSUrl = useCallback(async () => {
    const url = getOBSUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOBS(true);
      setTimeout(() => setCopiedOBS(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [getOBSUrl]);

  // Open preview in a new window
  const openPreview = useCallback(() => {
    // Get current store state and save to localStorage for the preview to read
    const state = useDesignerStore.getState();
    const previewData = {
      layers: state.layers,
      templates: state.templates,
      elements: state.elements,
      animations: state.animations,
      keyframes: state.keyframes,
      currentTemplateId: state.currentTemplateId || currentTemplateId,
      project: state.project,
    };
    
    // Store in localStorage for the preview window to access
    localStorage.setItem('nova-preview-data', JSON.stringify(previewData));
    
    // Calculate window size based on project settings
    const width = project?.canvas_width || 1920;
    const height = project?.canvas_height || 1080;
    const windowWidth = Math.min(width + 60, window.screen.width - 100);
    const windowHeight = Math.min(height + 140, window.screen.height - 100);
    
    // Open in new popup window - no template param, shows all by default
    window.open(
      '/preview',
      'nova-preview',
      `width=${windowWidth},height=${windowHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  }, [project, currentTemplateId]);

  return (
    <div className="flex-shrink-0 z-50 h-12 sm:h-14 border-b bg-card flex items-center px-2 sm:px-4 gap-1 sm:gap-2 shadow-md overflow-hidden">
      {/* Left side - Brand */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Emergent Logo - hidden on small screens */}
        <svg 
          className="h-4 sm:h-5 text-foreground hidden md:block"
          viewBox="0 0 1185 176" 
          xmlns="http://www.w3.org/2000/svg"
          aria-label="EMERGENT"
        >
          <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
            {/* E */}
            <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z"/>
            {/* M */}
            <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z"/>
            {/* E */}
            <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z"/>
            {/* R */}
            <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z"/>
            {/* G */}
            <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z"/>
            {/* E */}
            <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z"/>
            {/* N */}
            <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z"/>
            {/* T */}
            <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z"/>
          </g>
        </svg>

        {/* App Icon */}
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[11px] sm:text-xs font-bold sm:text-[15px]">N</span>
        </div>
        <span className="text-sm sm:text-[18px] font-medium whitespace-nowrap">
          Nova GFX
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Menus */}
      <div className="flex items-center gap-0.5">
        {/* Tools Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tools</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => window.location.href = '/projects'}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Projects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSystemTemplates}>
              <Grid3X3 className="mr-2 h-4 w-4" />
              System Templates
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowChannelsModal(true)}>
              <Monitor className="mr-2 h-4 w-4" />
              Channels
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                toggleAi();
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <Checkbox
                  checked={aiEnabled}
                  onCheckedChange={toggleAi}
                  onClick={(e) => e.stopPropagation()}
                />
                <Sparkles className="h-4 w-4" />
                <span>AI Assistant</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Project Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenDesignSystem}>
              <Palette className="mr-2 h-4 w-4" />
              Design Guidelines
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>User Preferences</DropdownMenuLabel>
            <DropdownMenuItem onClick={onOpenAISettings}>
              <Cpu className="mr-2 h-4 w-4" />
              AI Model Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help Menu - hidden on very small screens */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3 hidden xs:flex">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Help</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowKeyboardShortcuts}>
              <Keyboard className="mr-2 h-4 w-4" />
              Keyboard Shortcuts
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+/</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Contact Support</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu - just initials circle */}
        <UserMenu />

        {/* Divider */}
        <div className="w-px h-5 sm:h-6 bg-border mx-1 sm:mx-2" />

        {/* Publish Button with Dropdown */}
        <div className="flex items-center">
          <Button
            size="sm"
            onClick={() => setShowPublishModal(true)}
            disabled={!project?.id}
            className="h-7 sm:h-8 px-2 sm:px-3 rounded-r-none bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0"
          >
            <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Publish</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={!project?.id}
                className="h-7 sm:h-8 px-1.5 rounded-l-none bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 border-l border-white/20"
              >
                <ChevronDown className="w-3 h-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Preview & Publish</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openPreview}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Preview Window
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPublishModal(true)}>
              <Send className="w-4 h-4 mr-2" />
              Send to Channel...
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Publish URL
            </DropdownMenuLabel>
            <div className="px-2 py-1.5">
              <code className="text-[10px] bg-muted px-1.5 py-1 rounded block truncate">
                {getPublishUrl()}
              </code>
            </div>
            <DropdownMenuItem onClick={copyPublishUrl}>
              {copiedPublish ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copiedPublish ? 'Copied!' : 'Copy Publish URL'}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              OBS / vMix Integration
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={copyOBSUrl}>
              {copiedOBS ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copiedOBS ? 'Copied!' : 'Copy OBS URL'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => window.open(getOBSUrl(), '_blank')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Test OBS View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

      </div>

      {/* Publish to Channel Modal */}
      <PublishModal
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
      />

      {/* Channels Management Modal */}
      <ChannelsModal
        open={showChannelsModal}
        onOpenChange={setShowChannelsModal}
      />
    </div>
  );
}

