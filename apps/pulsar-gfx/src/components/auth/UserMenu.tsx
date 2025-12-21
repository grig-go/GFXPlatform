import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Sun,
  Moon,
  Monitor,
  Ticket,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { SupportTicketsDialog } from '../dialogs/SupportTicketsDialog';
import { AccountSettingsDialog } from '../dialogs/AccountSettingsDialog';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [showSupportTickets, setShowSupportTickets] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Check if user is from @emergent.new domain
  const isEmergentUser = user?.email?.endsWith('@emergent.new') || false;

  const handleThemeChange = (newTheme: Theme) => {
    if (user?.id) {
      setTheme(newTheme, user.id);
    }
  };

  const currentThemeOption = themeOptions.find(t => t.value === theme) || themeOptions[1];
  const CurrentThemeIcon = currentThemeOption.icon;

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/login')}
      >
        Sign In
      </Button>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
  <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-medium text-cyan-400">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>


        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
          <User className="w-4 h-4 mr-2" />
          Account Settings
        </DropdownMenuItem>

        {isEmergentUser && (
          <DropdownMenuItem onClick={() => setShowSupportTickets(true)}>
            <Ticket className="w-4 h-4 mr-2" />
            Support Tickets
          </DropdownMenuItem>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CurrentThemeIcon className="w-4 h-4 mr-2" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={isSelected ? 'bg-accent' : ''}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {option.label}
                    {isSelected && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Account Settings Dialog */}
    <AccountSettingsDialog
      open={showAccountSettings}
      onOpenChange={setShowAccountSettings}
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
