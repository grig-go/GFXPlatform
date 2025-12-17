/**
 * Example usage of SharedTopMenuBar in a different project
 * This file demonstrates how to implement the shared component with minimal setup
 */

import { SharedTopMenuBar } from './SharedTopMenuBar';
import { 
  LayoutGrid, 
  Wrench, 
  Settings, 
  HelpCircle,
  User as UserIcon,
  LogOut,
  Database,
  FileText,
  MessageSquare,
  Shield
} from 'lucide-react';
import { useState } from 'react';

export function ExampleTopMenuBar() {
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Example navigation function
  const navigate = (path: string) => {
    console.log('Navigate to:', path);
    // In a real app, use your router here
    // e.g., router.push(path) or navigate(path)
  };

  // Branding Configuration - Customize for your project
  const branding = {
    logoLight: '/path/to/logo-light.png',
    logoDark: '/path/to/logo-dark.png',
    logoAlt: 'MyProject',
    appIcon: (
      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-semibold text-sm">P</span>
      </div>
    ),
    appName: 'Project Name',
    onLogoClick: () => navigate('/'),
  };

  // Apps Menu - List all your applications
  const appsMenu = {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        items: [
          { id: 'dashboard', label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { id: 'analytics', label: 'Analytics', onClick: () => navigate('/analytics') },
          { id: 'reports', label: 'Reports', onClick: () => navigate('/reports') },
        ],
      },
    ],
  };

  // Tools Menu - Developer or admin tools
  const toolsMenu = {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    sections: [
      {
        items: [
          { 
            id: 'data-import', 
            label: 'Data Import', 
            icon: Database,
            onClick: () => navigate('/tools/import') 
          },
          { 
            id: 'api-keys', 
            label: 'API Keys', 
            icon: Shield,
            onClick: () => navigate('/tools/api-keys') 
          },
        ],
      },
    ],
  };

  // Settings Menu - User preferences and account settings
  const settingsMenu = {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
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
            id: 'account', 
            label: 'Account Settings', 
            icon: UserIcon,
            onClick: () => setShowSettings(true)
          },
          { 
            id: 'profile', 
            label: 'Edit Profile', 
            icon: UserIcon,
            onClick: () => navigate('/settings/profile') 
          },
        ],
      },
      {
        items: [
          { 
            id: 'logout', 
            label: 'Sign Out', 
            icon: LogOut,
            variant: 'destructive' as const,
            onClick: () => {
              console.log('Signing out...');
              // Add your logout logic here
            }
          },
        ],
      },
    ],
  };

  // Help Menu - Support and documentation
  const helpMenu = {
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
            onClick: () => window.open('https://docs.example.com', '_blank')
          },
          { 
            id: 'contact', 
            label: 'Contact Support', 
            icon: MessageSquare,
            onClick: () => navigate('/support') 
          },
        ],
      },
      {
        items: [
          { 
            id: 'updates', 
            label: "What's New", 
            icon: HelpCircle,
            onClick: () => navigate('/updates') 
          },
        ],
      },
    ],
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{
        apps: appsMenu,
        tools: toolsMenu,
        settings: settingsMenu,
        help: helpMenu,
      }}
      darkMode={darkMode}
      onDarkModeToggle={() => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
      }}
      accountSettingsDialog={
        showSettings ? (
          <div>
            {/* Your custom settings dialog component here */}
            {/* Example: <AccountSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} /> */}
          </div>
        ) : undefined
      }
    />
  );
}

/**
 * Minimal Example - Just the basics
 */
export function MinimalTopMenuBar() {
  const branding = {
    logoLight: '/logo-light.png',
    logoDark: '/logo-dark.png',
    logoAlt: 'My App',
    appIcon: <div className="w-8 h-8 bg-blue-500 rounded-full" />,
    appName: 'My App',
    onLogoClick: () => console.log('Logo clicked'),
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{}}
    />
  );
}

/**
 * With Custom Menus Example
 */
export function CustomMenusExample() {
  const branding = {
    logoLight: '/logo-light.png',
    logoDark: '/logo-dark.png',
    logoAlt: 'My App',
    appIcon: <div className="w-8 h-8 bg-green-500 rounded" />,
    appName: 'My App',
    onLogoClick: () => {},
  };

  const customMenu = {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    sections: [
      {
        label: 'Administration',
        items: [
          { id: 'users', label: 'Manage Users', onClick: () => {} },
          { id: 'permissions', label: 'Permissions', onClick: () => {} },
        ],
      },
    ],
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{}}
      customMenus={[customMenu]}
    />
  );
}
