"use client";

/**
 * SharedTopMenuBar - Reusable top navigation component
 * A configurable navigation bar with branding, menus, and dark mode support
 */

import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { LucideIcon, Menu, Moon, Sun } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Types
export interface Branding {
  logo?: ReactNode;  // New: allows passing a React component (like SVG)
  logoLight?: string;  // Legacy: image URL
  logoDark?: string;
  logoAlt: string;
  appIcon: ReactNode;
  appName: string;
  onLogoClick?: () => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
}

export interface TopMenu {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: MenuSection[];
}

// User menu configuration for standalone user avatar button
export interface UserMenuConfig {
  name?: string;
  email?: string;
  role?: string;
  initials: string;
  sections: MenuSection[];
}

export interface SharedTopMenuBarProps {
  branding: Branding;
  menus: {
    apps?: TopMenu;
    tools?: TopMenu;
    window?: TopMenu;
    settings?: TopMenu;
    help?: TopMenu;
  };
  customMenus?: TopMenu[];
  userMenu?: UserMenuConfig;
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  accountSettingsDialog?: ReactNode;
  languageSwitcher?: ReactNode;
  className?: string;
}

export function SharedTopMenuBar({
  branding,
  menus,
  customMenus = [],
  userMenu,
  darkMode = false,
  onDarkModeToggle,
  accountSettingsDialog,
  languageSwitcher,
  className = '',
}: SharedTopMenuBarProps) {
  const { t } = useTranslation('nav');
  const { logo, logoLight, logoDark, logoAlt, appIcon, appName, onLogoClick } = branding;
  const currentLogo = logo || (darkMode && logoDark ? logoDark : logoLight);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Combine standard menus with custom menus
  const allMenus = [
    menus.apps,
    menus.tools,
    menus.window,
    menus.settings,
    menus.help,
    ...customMenus,
  ].filter(Boolean) as TopMenu[];

  const renderMenuItem = (item: MenuItem) => {
    // Special handling for dark mode toggle
    if (item.id === 'dark-mode-toggle' && onDarkModeToggle) {
      return (
        <DropdownMenuItem
          key={item.id}
          onClick={(e) => {
            e.stopPropagation();
            onDarkModeToggle();
          }}
          className="cursor-pointer"
        >
          <span className="text-sm">{darkMode ? t('settings.lightMode') : t('settings.darkMode')}</span>
        </DropdownMenuItem>
      );
    }

    // Special handling for language switcher
    if (item.id === 'language-switcher' && languageSwitcher) {
      return (
        <div key={item.id} className="px-2 py-1.5">
          {languageSwitcher}
        </div>
      );
    }

    const Icon = item.icon;
    return (
      <DropdownMenuItem
        key={item.id}
        onClick={item.onClick}
        disabled={item.disabled}
        className={item.variant === 'destructive' ? 'text-destructive' : ''}
      >
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {item.label}
      </DropdownMenuItem>
    );
  };

  const renderMenu = (menu: TopMenu) => {
    const Icon = menu.icon;
    return (
      <DropdownMenu key={menu.id}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-sm px-[12px] py-[0px]">
            <Icon className="h-3.5 w-3.5" />
            <span>{menu.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {menu.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {sectionIndex > 0 && <DropdownMenuSeparator />}
              {section.label && <DropdownMenuLabel>{section.label}</DropdownMenuLabel>}
              {section.items.map((item) => renderMenuItem(item))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className={`sticky top-0 z-50 h-14 border-b bg-card flex items-center px-4 gap-2 shadow-md ${className}`}>
        {/* Left side - Brand */}
        <div className="flex items-center gap-3">
          {/* Logo - either component or image */}
          {typeof currentLogo === 'string' ? (
            <img
              src={currentLogo}
              alt={logoAlt}
              className="h-6 cursor-pointer"
              onClick={onLogoClick}
            />
          ) : (
            <div className="cursor-pointer" onClick={onLogoClick}>
              {currentLogo}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div
              className="cursor-pointer"
              onClick={onLogoClick}
            >
              {appIcon}
            </div>
            <span className="text-[rgb(0,0,0)] dark:text-slate-100 font-semibold text-lg cursor-pointer" onClick={onLogoClick}>
              {appName}
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Menu - Hidden on mobile (<900px) */}
        <div className="hidden min-[900px]:flex items-center gap-0.5">
          {allMenus.map((menu) => renderMenu(menu))}

          {/* User Avatar Dropdown */}
          {userMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 ml-1">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-medium text-cyan-600 dark:text-cyan-400">
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
                      if (item.id === 'dark-mode-toggle' && onDarkModeToggle) {
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={onDarkModeToggle}
                            className="gap-2 cursor-pointer"
                          >
                            {darkMode ? (
                              <>
                                <Sun className="w-4 h-4" />
                                {t('settings.lightMode')}
                              </>
                            ) : (
                              <>
                                <Moon className="w-4 h-4" />
                                {t('settings.darkMode')}
                              </>
                            )}
                          </DropdownMenuItem>
                        );
                      }

                      // Special handling for language switcher
                      if (item.id === 'language-switcher' && languageSwitcher) {
                        return (
                          <div key={item.id} className="px-2 py-1.5">
                            {languageSwitcher}
                          </div>
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

        {/* Mobile Menu Button - Shown only on mobile (<900px) */}
        <div className="flex min-[900px]:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileMenuOpen(true)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate through app features and settings
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {allMenus.map((menu) => {
              const Icon = menu.icon;
              return (
                <div key={menu.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1 font-semibold text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span>{menu.label}</span>
                  </div>
                  
                  {menu.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-1">
                      {section.label && (
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          {section.label}
                        </div>
                      )}
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;

                        // Special handling for dark mode toggle
                        if (item.id === 'dark-mode-toggle' && onDarkModeToggle) {
                          return (
                            <Button
                              key={item.id}
                              variant="ghost"
                              className="w-full justify-start px-2"
                              onClick={() => {
                                onDarkModeToggle();
                              }}
                            >
                              {ItemIcon && <ItemIcon className="mr-2 h-4 w-4" />}
                              <span>{darkMode ? t('settings.lightMode') : t('settings.darkMode')}</span>
                            </Button>
                          );
                        }

                        // Special handling for language switcher
                        if (item.id === 'language-switcher' && languageSwitcher) {
                          return (
                            <div key={item.id} className="px-2 py-1">
                              {languageSwitcher}
                            </div>
                          );
                        }

                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            className={`w-full justify-start px-2 ${
                              item.variant === 'destructive' ? 'text-destructive hover:text-destructive' : ''
                            }`}
                            onClick={() => {
                              item.onClick?.();
                              setMobileMenuOpen(false);
                            }}
                            disabled={item.disabled}
                          >
                            {ItemIcon && <ItemIcon className="mr-2 h-4 w-4" />}
                            <span>{item.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Account Settings Dialog (if provided) */}
      {accountSettingsDialog}
    </>
  );
}