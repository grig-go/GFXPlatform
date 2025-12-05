import { useState, useEffect } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@emergent-platform/ui';
import {
  Settings,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Keyboard,
  FolderOpen,
  Radio,
  Wrench,
  Eye,
  FileText,
  Play,
  ChevronDown,
  ListOrdered,
} from 'lucide-react';
import { UserMenu } from '@/components/auth';
import { useProjectStore } from '@/stores/projectStore';
import { useChannelStore } from '@/stores/channelStore';
import { useUIStore } from '@/stores/uiStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { usePageStore } from '@/stores/pageStore';
import { usePreviewStore } from '@/stores/previewStore';
import { usePageRepositoryStore } from '@/stores/pageRepositoryStore';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import { ChannelsModal } from '@/components/dialogs/ChannelsModal';
import { ProjectsModal } from '@/components/dialogs/ProjectsModal';
import { PlaylistsModal } from '@/components/dialogs/PlaylistsModal';

interface HeaderProps {
  onShowKeyboardShortcuts?: () => void;
}

export function Header({ onShowKeyboardShortcuts }: HeaderProps) {
  const { currentProject, projects, selectProject, refreshProject, isLoading: projectLoading } = useProjectStore();
  const { channels, selectedChannel, selectChannel, initializeChannel } = useChannelStore();
  const {
    showPlayoutControls,
    showPreview,
    showContentEditor,
    togglePlayoutControls,
    togglePreview,
    toggleContentEditor,
  } = useUIStore();
  const { clearPlaylists } = usePlaylistStore();
  const { clearPages } = usePageStore();
  const { clearPreview } = usePreviewStore();
  const { clearLibrary } = usePageRepositoryStore();
  const { lastProjectId, setLastProjectId, isLoaded: preferencesLoaded } = useUIPreferencesStore();

  const [isInitializing, setIsInitializing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showPlaylistsModal, setShowPlaylistsModal] = useState(false);
  const [hasRestoredProject, setHasRestoredProject] = useState(false);

  // Restore last project on initial load
  useEffect(() => {
    const restoreLastProject = async () => {
      const storeState = useUIPreferencesStore.getState();
      const actualLastProjectId = storeState.lastProjectId;
      const actualIsLoaded = storeState.isLoaded;

      if (!actualIsLoaded) return;
      if (projects.length === 0) return;
      if (hasRestoredProject) return;

      setHasRestoredProject(true);

      if (actualLastProjectId) {
        const savedProject = projects.find(p => p.id === actualLastProjectId);
        if (savedProject) {
          await selectProject(actualLastProjectId);
          return;
        }
      }

      if (!currentProject && projects.length > 0) {
        await selectProject(projects[0].id);
        setLastProjectId(projects[0].id);
      }
    };

    restoreLastProject();
  }, [projects, currentProject, lastProjectId, hasRestoredProject, selectProject, setLastProjectId, preferencesLoaded]);

  const handleProjectChange = async (projectId: string) => {
    clearPages();
    clearPlaylists();
    clearPreview();
    clearLibrary();
    localStorage.removeItem('nova-preview-data');
    setLastProjectId(projectId);
    await selectProject(projectId);
  };

  const handleRefreshProject = async () => {
    if (!currentProject || isRefreshing) return;
    setIsRefreshing(true);
    try {
      clearPages();
      clearPlaylists();
      clearPreview();
      clearLibrary();
      localStorage.removeItem('nova-preview-data');
      await refreshProject();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInitialize = async (channelId?: string) => {
    if (!currentProject) return;
    setIsInitializing(true);
    try {
      if (channelId) {
        // Initialize specific channel
        await initializeChannel(channelId, currentProject.id);
      } else {
        // Initialize all channels
        const initPromises = channels.map((channel) =>
          initializeChannel(channel.id, currentProject.id)
        );
        await Promise.all(initPromises);
      }
    } finally {
      setIsInitializing(false);
    }
  };

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

        {/* App Icon - Pulsar uses cyan/blue gradient */}
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[10px] bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[11px] sm:text-xs font-bold sm:text-[15px]">P</span>
        </div>
        <span className="text-sm sm:text-[18px] font-medium whitespace-nowrap">
          Pulsar GFX
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Panels</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showPlayoutControls}
              onCheckedChange={togglePlayoutControls}
            >
              <Play className="mr-2 h-4 w-4" />
              Playout Controls
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showPreview}
              onCheckedChange={togglePreview}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showContentEditor}
              onCheckedChange={toggleContentEditor}
            >
              <FileText className="mr-2 h-4 w-4" />
              Content Editor
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Resources</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowChannelsModal(true)}>
              <Radio className="mr-2 h-4 w-4" />
              Manage Channels
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPlaylistsModal(true)}>
              <ListOrdered className="mr-2 h-4 w-4" />
              Playlists
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowProjectsModal(true)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Projects
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
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Default Channel</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <Select
                value={selectedChannel?.id || ''}
                onValueChange={(channelId) => selectChannel(channelId)}
              >
                <SelectTrigger className="w-full h-8 text-sm">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-500" />
                    <SelectValue placeholder="Select channel...">
                      {selectedChannel?.channelCode || 'Select channel...'}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            channel.playerStatus === 'connected'
                              ? 'bg-green-500'
                              : channel.playerStatus === 'error'
                              ? 'bg-red-500'
                              : 'bg-muted-foreground'
                          )}
                        />
                        {channel.channelCode}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Application</DropdownMenuLabel>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <UserMenu />

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


        {/* Edit in Nova GFX */}
        {currentProject && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 sm:h-8 px-2 sm:px-3 hidden md:flex"
            asChild
          >
            <a
              href={`http://localhost:5173/projects/${currentProject.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1.5" />
              <span className="hidden lg:inline">Edit in Nova GFX</span>
            </a>
          </Button>
        )}

        {/* Initialize Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={!currentProject || isInitializing || channels.length === 0}
              className="h-7 sm:h-8 px-2 sm:px-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
            >
              <RefreshCw
                className={`w-3.5 sm:w-4 h-3.5 sm:h-4 sm:mr-1.5 ${isInitializing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{isInitializing ? 'Initializing...' : 'Initialize'}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Initialize Channels</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleInitialize()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              All Channels
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {channels.map((channel) => (
              <DropdownMenuItem
                key={channel.id}
                onClick={() => handleInitialize(channel.id)}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    channel.playerStatus === 'connected'
                      ? 'bg-green-500'
                      : channel.playerStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-muted-foreground'
                  }`}
                />
                {channel.channelCode}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Channels Modal */}
      <ChannelsModal open={showChannelsModal} onOpenChange={setShowChannelsModal} />

      {/* Playlists Modal */}
      <PlaylistsModal open={showPlaylistsModal} onOpenChange={setShowPlaylistsModal} />

      {/* Projects Modal */}
      <ProjectsModal open={showProjectsModal} onOpenChange={setShowProjectsModal} />
    </div>
  );
}
