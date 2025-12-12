import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  LogOut,
  Building2,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
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
import { SupportRequestDialog } from '@/components/dialogs/SupportRequestDialog';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function UserMenu() {
  const navigate = useNavigate();
  const { user, organization, signOut } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [showSupportDialog, setShowSupportDialog] = useState(false);

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium text-violet-400">
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

        {organization && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <Building2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{organization.name}</span>
              </div>
            </DropdownMenuLabel>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>

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

        {user.isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/settings/admin')}>
            <Shield className="w-4 h-4 mr-2" />
            Admin Panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setShowSupportDialog(true)}>
          <HelpCircle className="w-4 h-4 mr-2" />
          Help & Support
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>

      <SupportRequestDialog
        open={showSupportDialog}
        onOpenChange={setShowSupportDialog}
      />
    </DropdownMenu>
  );
}
