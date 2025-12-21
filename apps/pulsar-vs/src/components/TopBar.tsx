/**
 * TopBar - Pulsar application top navigation
 * Implements SharedTopMenuBar with Pulsar-specific configuration
 */

import { ChannelsPage } from './ChannelsPage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { SharedTopMenuBar } from './SharedTopMenuBar';
import {
  Grid3x3,
  Settings,
  HelpCircle,
  User,
  LogOut,
  Zap,
  LayoutPanelLeft,
  FileText,
  Download,
  Maximize,
  Columns2,
  Wrench,
  Sparkles,
  FolderOpen,
  ListMusic,
  Monitor,
  Bot,
  Keyboard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ContactSupportDialog } from './ContactSupportDialog';
import { LanguageSwitcher } from './LanguageSwitcher';
import { supabase } from '../lib/supabase';

type PageView = 'virtual-set' | 'playlist';

interface TopBarProps {
  onLayoutChange?: (layout: 'single' | 'split') => void;
  currentLayout?: 'single' | 'split';
  onOpenSettings?: () => void;
  onOpenAIPromptSettings?: () => void;
  onOpenAIProviders?: () => void;
  onOpenProjects?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  currentPage?: PageView;
  onPageChange?: (page: PageView) => void;
}

export function TopBar({
  onLayoutChange,
  currentLayout = 'single',
  onOpenSettings,
  onOpenAIPromptSettings,
  onOpenAIProviders,
  onOpenProjects,
  onOpenKeyboardShortcuts,
  currentPage = 'virtual-set',
  onPageChange,
}: TopBarProps = {}) {
  const { t } = useTranslation('nav');
  const [darkMode, setDarkMode] = useState(false);
  const [contactSupportOpen, setContactSupportOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);

  // State for apps
  const [apps, setApps] = useState<Array<{
    id: string;
    name: string;
    app_url: string;
    sort_order: number;
    app_key: string;
  }>>([]);

  // Fetch apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      const { data, error } = await supabase.rpc("list_active_applications");

      if (!error && data) {
        console.log("Applications fetched from backend:", data);
        setApps(data); // dropdown items
      } else if (error) {
        console.error("Failed to fetch applications:", error);
      }
    };

    fetchApps();
  }, []);

  // Branding Configuration (matches Nexus styling)
  const branding = {
    logo: (
      <svg
        className="h-6 text-[rgb(0,0,0)] dark:text-slate-100"
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
    ),
    logoAlt: 'EMERGENT',
    appIcon: (
      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[10px] bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[11px] sm:text-xs font-bold sm:text-[15px]">P</span>
      </div>
    ),
    appName: 'Pulsar VS',
    onLogoClick: () => console.log('Navigate to home'),
  };

  // Apps Menu
  const appsMenu = {
    id: 'apps',
    label: t('menus.apps'),
    icon: Grid3x3,
    sections: [
      {
        items: apps.map(app => ({
          id: app.id,
          label: app.name,
          onClick: () => {
            console.log('App clicked:', app.name, 'navigating to:', app.app_url);
            window.open(app.app_url, '_blank');
          },
        })),
      },
    ],
  };

  // Tools Menu
  const toolsMenu = {
    id: 'tools',
    label: t('menus.tools'),
    icon: Wrench,
    sections: [
      {
        items: [
          {
            id: 'channel',
            label: t('tools.channel'),
            icon: Grid3x3,
            onClick: () => setChannelsOpen(true),
          },
          {
            id: 'projects',
            label: t('tools.projects'),
            icon: FolderOpen,
            onClick: onOpenProjects,
          },
          {
            id: 'keyboard-shortcuts',
            label: t('tools.keyboardShortcuts'),
            icon: Keyboard,
            onClick: onOpenKeyboardShortcuts,
          },
        ],
      },
    ],
  };

  // Window Menu with Page navigation
  const windowMenu = {
    id: 'window',
    label: t('menus.window'),
    icon: LayoutPanelLeft,
    sections: [
      {
        label: '',
        items: [
          {
            id: 'virtual-set-single',
            label: t('window.singleView'),
            icon: Monitor,
            onClick: () => {
              onPageChange?.('virtual-set');
              onLayoutChange?.('single');
            },
          },
          {
            id: 'virtual-set-content',
            label: t('window.contentView'),
            icon: Columns2,
            onClick: () => {
              onPageChange?.('virtual-set');
              onLayoutChange?.('split');
            },
          },
          {
            id: 'playlist-page',
            label: t('window.playlist'),
            icon: ListMusic,
            onClick: () => onPageChange?.('playlist'),
          },
        ],
      },
    ],
  };

  // Settings Menu
  const settingsMenu = {
    id: 'settings',
    label: t('menus.settings'),
    icon: Settings,
    sections: [
      {
        label: t('settings.preferences'),
        items: [
          { id: 'dark-mode-toggle', label: t('settings.darkMode') },
          { id: 'language-switcher', label: t('settings.language') },
          {
            id: 'advanced-settings',
            label: t('settings.advancedSettings'),
            icon: Settings,
            onClick: onOpenSettings
          },
          {
            id: 'ai-providers',
            label: 'AI Providers',
            icon: Bot,
            onClick: onOpenAIProviders
          },
          {
            id: 'ai-prompt-settings',
            label: t('settings.aiPromptSettings'),
            icon: Sparkles,
            onClick: onOpenAIPromptSettings
          },
        ],
      },
      {
        items: [
          {
            id: 'logout',
            label: t('settings.signOut'),
            icon: LogOut,
            variant: 'destructive' as const,
            onClick: () => console.log('Sign Out')
          },
        ],
      },
    ],
  };

  // Help Menu
  const helpMenu = {
    id: 'help',
    label: t('menus.help'),
    icon: HelpCircle,
    sections: [
      {
        items: [
          {
            id: 'docs',
            label: t('help.documentation'),
            icon: HelpCircle,
            disabled: true,
            onClick: () => console.log('Documentation')
          },
          {
            id: 'updates',
            label: t('help.whatsNew'),
            icon: Zap,
            disabled: true,
            onClick: () => console.log('What\'s New')
          },
          {
            id: 'download-ue-55',
            label: t('help.downloadUE55'),
            icon: Download,
            onClick: () => console.log('Download UE 5.5 project')
          },
          {
            id: 'download-ue-56',
            label: t('help.downloadUE56'),
            icon: Download,
            onClick: () => console.log('Download UE 5.6 project')
          },
        ],
      },
      {
        items: [
          {
            id: 'contact',
            label: t('help.contactSupport'),
            icon: User,
            onClick: () => setContactSupportOpen(true)
          },
        ],
      },
    ],
  };

  return (
    <>
      <SharedTopMenuBar
        branding={branding}
        menus={{
          apps: appsMenu,
          tools: toolsMenu,
          window: windowMenu,
          settings: settingsMenu,
          help: helpMenu,
        }}
        darkMode={darkMode}
        onDarkModeToggle={() => {
          setDarkMode(!darkMode);
          document.documentElement.classList.toggle('dark');
        }}
        languageSwitcher={<LanguageSwitcher />}
      />
      <ContactSupportDialog open={contactSupportOpen} onOpenChange={setContactSupportOpen} />

      {/* Channels Dialog */}
      <Dialog open={channelsOpen} onOpenChange={setChannelsOpen}>
        <DialogContent className="!max-w-[50vw] !w-[50vw] h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Channels Management</DialogTitle>
            <DialogDescription>
              Manage broadcast and output channels across different systems.
            </DialogDescription>
          </DialogHeader>
          <ChannelsPage />
        </DialogContent>
      </Dialog>
    </>
  );
}
