import {
  LayoutGrid,
  Wrench,
  Settings,
  HelpCircle,
  User as UserIcon,
  LogOut,
  FileText,
  MessageSquare,
  Users,
  Zap,
  ImageIcon,
  Bot,
  Rss,
  Tv,
  Ticket,
  Building2,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AccountSettingsDialog } from "./AccountSettingsDialog";
import { SupportRequestDialog } from "./dialogs/SupportRequestDialog";
import { SupportTicketsDialog } from "./dialogs/SupportTicketsDialog";
import { SharedTopMenuBar, BrandingConfig, MenuDropdown, UserMenuConfig } from "./shared/SharedTopMenuBar";
import { supabase } from "../utils/supabase/client";
import { getUrlWithAuthToken } from "@emergent-platform/supabase-client";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

interface TopMenuBarProps {
  onNavigate: (view: string) => void;
  dashboardConfig?: any[];
  onOpenDashboardConfig?: () => void;
  onNavigateToOrganizations?: () => void;
}

// Extended user type to include preferences
interface UserWithPreferences {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    timezone?: string;
    date_format?: string;
    language?: string;
    email_notifications?: boolean;
    push_notifications?: boolean;
  };
}

export function TopMenuBar({
  onNavigate,
  dashboardConfig = [],
  onOpenDashboardConfig,
  onNavigateToOrganizations
}: TopMenuBarProps) {
  // Auth hooks - user is the app user from u_users table
  const { user, signOut, availableOrganizations, impersonatedOrganization, impersonateOrganization, clearImpersonation } = useAuth();
  const { isAdmin, isSuperuser, canReadPage } = usePermissions();

  // Cast user to include preferences
  const appUser = user as UserWithPreferences | null;

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showSupportTickets, setShowSupportTickets] = useState(false);

  // Check if user is from @emergent.new domain
  const isEmergentUser = appUser?.email?.endsWith('@emergent.new') || false;

  // Check for openSettings URL param (used by other apps to deep-link to account settings)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openSettings') === 'true') {
      setShowAccountSettings(true);
      // Clean up the URL param
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  const [apps, setApps] = useState<Array<{
    id: string;
    name: string;
    app_url: string;
    sort_order: number;
    app_key: string;
  }>>([]);

  // Load theme from user preferences on mount
  useEffect(() => {
    if (appUser?.preferences?.theme) {
      const userTheme = appUser.preferences.theme;
      let shouldBeDark = false;

      if (userTheme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = userTheme === 'dark';
      }

      setDarkMode(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    }
  }, [appUser]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
  };

  // Fetch apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      const { data, error } = await supabase.rpc("list_active_applications");

      if (!error && data) {
        console.log("Applications fetched from backend:", data);
        setApps(data);
      } else if (error) {
        console.error("Failed to fetch applications:", error);
      }
    };

    fetchApps();
  }, []);

  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark');

    // Save the theme preference to user profile
    if (appUser?.id) {
      const currentPrefs = appUser.preferences || {};
      const newTheme = newDarkMode ? 'dark' : 'light';

      try {
        await supabase.rpc('update_user_profile', {
          p_user_id: appUser.id,
          p_full_name: appUser.full_name || null,
          p_preferences: {
            ...currentPrefs,
            theme: newTheme,
          },
          p_avatar_url: appUser.avatar_url || null,
        });
        console.log('[TopMenuBar] Theme preference saved:', newTheme);
      } catch (err) {
        console.error('[TopMenuBar] Failed to save theme preference:', err);
      }
    }
  };

  // Helper function to check if a dashboard is visible
  const isDashboardVisible = (dashboardId: string) => {
    if (!dashboardConfig || dashboardConfig.length === 0) {
      return true;
    }

    const dashboard = dashboardConfig.find(d => d.dashboard_id === dashboardId);

    if (!dashboard) {
      return false;
    }

    return dashboard.visible;
  };

  // Branding Configuration
  const branding: BrandingConfig = {
    logoAlt: "EMERGENT",
    appIcon: (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-semibold text-sm">N</span>
      </div>
    ),
    appName: "Nova",
    onLogoClick: () => onNavigate('home'),
    showTitle: true,
  };

  // Apps Menu Configuration
  const appsMenu: MenuDropdown | undefined = apps.length > 0 ? {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        items: apps.map(app => ({
          id: app.id,
          label: app.name,
          onClick: () => {
            console.log('App clicked:', app.name, 'navigating to:', app.app_url);
            // Use getUrlWithAuthToken to pass auth session to other apps (cross-app SSO)
            const urlWithAuth = getUrlWithAuthToken(app.app_url);
            window.open(urlWithAuth, '_blank');
          },
        })),
      },
    ],
  } : undefined;

  // Tools Menu Configuration - filter based on permissions
  const toolsMenuItems = [
    { id: 'agents', label: 'Agents', icon: Bot, onClick: () => onNavigate('agents'), dashboardId: null, pageKey: 'agents' },
    { id: 'feeds', label: 'Data Feeds', icon: Rss, onClick: () => onNavigate('feeds'), dashboardId: null, pageKey: 'feeds' },
    { id: 'media', label: 'Media Library', icon: ImageIcon, onClick: () => onNavigate('media'), dashboardId: 'media_library', pageKey: 'media' },
    { id: 'channels', label: 'Channels', icon: Tv, onClick: () => onNavigate('channels'), dashboardId: null, pageKey: 'channels', adminOnly: true },
  ];

  const toolsMenu: MenuDropdown = {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    sections: [
      {
        items: toolsMenuItems.filter(item => {
          if (item.adminOnly && !isAdmin && !isSuperuser) {
            return false;
          }
          if (item.pageKey && !canReadPage(item.pageKey)) {
            return false;
          }
          if (item.dashboardId && !isDashboardVisible(item.dashboardId)) {
            return false;
          }
          return true;
        }),
      },
    ],
  };

  // Settings Menu Configuration - Admin only items
  const settingsMenu: MenuDropdown | undefined = (isAdmin || isSuperuser) ? {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    sections: [
      {
        items: [
          {
            id: 'users-groups',
            label: 'Users and Groups',
            icon: Users,
            onClick: () => onNavigate('users-groups')
          },
          ...(isSuperuser && onNavigateToOrganizations ? [{
            id: 'organizations',
            label: 'Organizations',
            icon: Building2,
            onClick: onNavigateToOrganizations
          }] : []),
          {
            id: 'ai-connections',
            label: 'AI Connections',
            icon: Zap,
            onClick: () => onNavigate('ai-connections')
          },
          ...(onOpenDashboardConfig ? [{
            id: 'dashboard-config',
            label: 'Dashboard Configuration',
            icon: LayoutGrid,
            onClick: onOpenDashboardConfig
          }] : [])
        ],
      },
      // Organization impersonation section (superuser only)
      ...(isSuperuser ? [{
        label: 'Switch Organization',
        items: [
          // Clear impersonation option (only when impersonating)
          ...(impersonatedOrganization ? [{
            id: 'clear-impersonation',
            label: `Exit: ${impersonatedOrganization.name}`,
            icon: X,
            onClick: () => clearImpersonation(),
          }] : []),
          // List all available organizations
          ...availableOrganizations.map(org => ({
            id: `org-${org.id}`,
            label: org.name,
            icon: Building2,
            onClick: () => impersonateOrganization(org),
          })),
          // Show message if no organizations
          ...(availableOrganizations.length === 0 ? [{
            id: 'no-orgs',
            label: 'No organizations available',
            icon: Building2,
            disabled: true,
          }] : []),
        ],
      }] : []),
    ],
  } : undefined;

  // User Menu Configuration - Get initials from email
  const getUserInitials = (email?: string, name?: string | null): string => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const userMenu: UserMenuConfig | undefined = appUser ? {
    name: appUser.full_name || undefined,
    email: appUser.email,
    role: isSuperuser ? 'Superuser' : (isAdmin ? 'Administrator' : undefined),
    initials: getUserInitials(appUser.email, appUser.full_name),
    sections: [
      {
        label: 'Preferences',
        items: [
          { id: 'dark-mode-toggle', label: 'Dark Mode' },
        ],
      },
      {
        items: [
          {
            id: 'account-settings',
            label: 'Account Settings',
            icon: UserIcon,
            onClick: () => setShowAccountSettings(true)
          },
          ...(isEmergentUser ? [{
            id: 'support-tickets',
            label: 'Support Tickets',
            icon: Ticket,
            onClick: () => setShowSupportTickets(true)
          }] : []),
        ],
      },
      {
        items: [
          {
            id: 'sign-out',
            label: 'Sign Out',
            icon: LogOut,
            variant: 'destructive' as const,
            onClick: handleSignOut
          },
        ],
      },
    ],
  } : undefined;

  // Help Menu Configuration
  const helpMenu: MenuDropdown = {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    sections: [
      {
        label: 'Support',
        items: [
          {
            id: 'docs',
            label: 'Documentation',
            icon: FileText,
            onClick: () => window.open(
              import.meta.env.DEV ? 'http://localhost:3000/docs/apps/nova' : '/docs/apps/nova',
              '_blank'
            )
          },
          {
            id: 'support',
            label: 'Contact Support',
            icon: MessageSquare,
            onClick: () => setShowSupportDialog(true)
          },
        ],
      },
      {
        items: [
          { id: 'whats-new', label: "What's New", icon: HelpCircle, disabled: true },
          { id: 'status', label: 'Status Page', icon: HelpCircle, disabled: true },
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
          settings: settingsMenu,
          help: helpMenu,
        }}
        userMenu={userMenu}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
        accountSettingsDialog={
          <AccountSettingsDialog
            open={showAccountSettings}
            onOpenChange={setShowAccountSettings}
          />
        }
      />

      {/* Impersonation Banner */}
      {impersonatedOrganization && (
        <div className="bg-orange-500/15 border-b border-orange-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <Building2 className="w-4 h-4 text-orange-600" />
          <span className="text-orange-700 dark:text-orange-400 text-sm font-medium">
            Viewing as: {impersonatedOrganization.name}
          </span>
          <button
            onClick={() => clearImpersonation()}
            className="ml-2 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Support Request Dialog */}
      <SupportRequestDialog
        open={showSupportDialog}
        onOpenChange={setShowSupportDialog}
      />

      {/* Support Tickets Dialog (for @emergent.new users) */}
      {isEmergentUser && (
        <SupportTicketsDialog
          open={showSupportTickets}
          onOpenChange={setShowSupportTickets}
        />
      )}
    </>
  );
}
