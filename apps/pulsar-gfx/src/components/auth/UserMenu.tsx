import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  LogOut,
  Building2,
  Shield,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';

export function UserMenu() {
  const navigate = useNavigate();
  const { user, organization, signOut } = useAuthStore();

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
          size="sm"
          className="px-1.5 h-7 sm:h-8"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-medium text-cyan-400">
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

        {user.isEmergentUser && (
          <DropdownMenuItem onClick={() => navigate('/settings/admin')}>
            <Shield className="w-4 h-4 mr-2" />
            Admin Panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
