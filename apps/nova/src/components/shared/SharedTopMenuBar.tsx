/**
 * SharedTopMenuBar Component
 * 
 * @version 1.0.0
 * @lastUpdated 2025-10-14
 * @author Nova Dashboard Team
 * @description A reusable top menu bar component for multiple projects
 * 
 * CHANGELOG:
 * - 1.0.0 (2025-10-14): Initial release with full menu configuration support
 */

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import {
  LayoutGrid,
  Wrench,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  LucideIcon,
} from "lucide-react";
import { useState, ReactNode } from "react";

/**
 * Component version - increment when making breaking changes
 */
export const SHARED_TOP_MENU_BAR_VERSION = "1.0.0";

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
}

export interface MenuDropdown {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: MenuSection[];
}

export interface BrandingConfig {
  logoAlt: string;
  appIcon: ReactNode;
  appName: string;
  onLogoClick: () => void;
  showTitle?: boolean;
}

export interface UserMenuConfig {
  name?: string;
  email?: string;
  role?: string;
  initials: string;
  sections: MenuSection[];
}

export interface SharedTopMenuBarProps {
  branding: BrandingConfig;
  menus: {
    apps?: MenuDropdown;
    tools?: MenuDropdown;
    settings?: MenuDropdown;
    help?: MenuDropdown;
  };
  userMenu?: UserMenuConfig;
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  accountSettingsDialog?: ReactNode;
  customMenus?: MenuDropdown[];
}

export function SharedTopMenuBar({
  branding,
  menus,
  userMenu,
  darkMode: externalDarkMode,
  onDarkModeToggle,
  accountSettingsDialog,
  customMenus = [],
}: SharedTopMenuBarProps) {
  const [internalDarkMode, setInternalDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Use external dark mode if provided, otherwise use internal
  const darkMode = externalDarkMode !== undefined ? externalDarkMode : internalDarkMode;

  const handleDarkModeToggle = () => {
    if (onDarkModeToggle) {
      onDarkModeToggle();
    } else {
      setInternalDarkMode(!internalDarkMode);
      document.documentElement.classList.toggle('dark');
    }
  };

  const renderMenuDropdown = (dropdown: MenuDropdown) => (
    <DropdownMenu key={dropdown.id}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <dropdown.icon className="w-4 h-4" />
          {dropdown.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {dropdown.sections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`}>
            {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
            {section.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`gap-2 ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                    item.variant === 'destructive' ? 'text-destructive' : ''
                  }`}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  {item.label}
                </DropdownMenuItem>
              );
            })}
            {sectionIndex < dropdown.sections.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="sticky top-0 z-50 border-b bg-card shadow-md">
      <div className="container mx-auto px-4 bg-white dark:bg-card">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={branding.onLogoClick}
          >
            <svg 
              className="h-6"
              viewBox="0 0 1185 176" 
              xmlns="http://www.w3.org/2000/svg"
              aria-label={branding.logoAlt}
            >
              <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
                <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z"/>
                <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z"/>
                <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z"/>
                <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z"/>
                <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z"/>
                <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z"/>
                <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z"/>
                <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z"/>
              </g>
            </svg>
            {branding.showTitle && (
              <>
                {branding.appIcon}
                <span className="font-semibold text-lg">{branding.appName}</span>
              </>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex items-center gap-2">
            {/* Apps Dropdown */}
            {menus.apps && renderMenuDropdown(menus.apps)}

            {/* Tools Dropdown */}
            {menus.tools && renderMenuDropdown(menus.tools)}

            {/* Settings Dropdown - Special handling for dark mode */}
            {menus.settings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <menus.settings.icon className="w-4 h-4" />
                    {menus.settings.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {menus.settings.sections.map((section, sectionIndex) => (
                    <div key={`section-${sectionIndex}`}>
                      {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
                      {section.items.map((item) => {
                        // Special handling for dark mode toggle
                        if (item.id === 'dark-mode-toggle') {
                          return (
                            <DropdownMenuItem 
                              key={item.id}
                              onClick={handleDarkModeToggle} 
                              className="gap-2 cursor-pointer"
                            >
                              {darkMode ? (
                                <>
                                  <Sun className="w-4 h-4" />
                                  Light Mode
                                </>
                              ) : (
                                <>
                                  <Moon className="w-4 h-4" />
                                  Dark Mode
                                </>
                              )}
                            </DropdownMenuItem>
                          );
                        }

                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`gap-2 ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                              item.variant === 'destructive' ? 'text-destructive' : ''
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="w-4 h-4" />}
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                      {sectionIndex < menus.settings.sections.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Help Dropdown */}
            {menus.help && renderMenuDropdown(menus.help)}

            {/* Custom Menus */}
            {customMenus.map((menu) => renderMenuDropdown(menu))}

            {/* User Avatar Dropdown */}
            {userMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 ml-1">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium text-violet-400">
                      {userMenu.initials}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* User Info Header */}
                  {(userMenu.name || userMenu.email) && (
                    <>
                      <DropdownMenuLabel className="font-normal">
                        {userMenu.role && (
                          <p className="text-xs text-muted-foreground mb-0.5">{userMenu.role}</p>
                        )}
                        {userMenu.name && (
                          <p className="text-sm font-medium">{userMenu.name}</p>
                        )}
                        {userMenu.email && (
                          <p className="text-xs text-muted-foreground truncate">{userMenu.email}</p>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Menu Sections */}
                  {userMenu.sections.map((section, sectionIndex) => (
                    <div key={`user-section-${sectionIndex}`}>
                      {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
                      {section.items.map((item) => {
                        // Special handling for dark mode toggle
                        if (item.id === 'dark-mode-toggle') {
                          return (
                            <DropdownMenuItem
                              key={item.id}
                              onClick={handleDarkModeToggle}
                              className="gap-2 cursor-pointer"
                            >
                              {darkMode ? (
                                <>
                                  <Sun className="w-4 h-4" />
                                  Light Mode
                                </>
                              ) : (
                                <>
                                  <Moon className="w-4 h-4" />
                                  Dark Mode
                                </>
                              )}
                            </DropdownMenuItem>
                          );
                        }

                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className={`gap-2 ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                              item.variant === 'destructive' ? 'text-destructive' : ''
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="w-4 h-4" />}
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                      {sectionIndex < userMenu.sections.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Custom Content (e.g., Account Settings Dialog) */}
      {accountSettingsDialog}
    </div>
  );
}