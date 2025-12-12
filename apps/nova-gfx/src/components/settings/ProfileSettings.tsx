import { useState, useEffect } from 'react';
import { Save, Loader2, Sun, Moon, Monitor, Check } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Separator,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useThemeStore, type Theme } from '@/stores/themeStore';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ProfileSettings() {
  const { user, initialize } = useAuthStore();
  const { theme, setTheme, loadUserTheme } = useThemeStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [themeSaved, setThemeSaved] = useState(false);

  // Load user theme preference on mount
  useEffect(() => {
    if (user?.id) {
      loadUserTheme(user.id);
    }
  }, [user?.id, loadUserTheme]);

  const handleThemeChange = async (newTheme: Theme) => {
    if (!user?.id) return;

    setThemeSaved(false);
    await setTheme(newTheme, user.id);
    setThemeSaved(true);

    // Hide the saved indicator after 2 seconds
    setTimeout(() => setThemeSaved(false), 2000);
  };

  const handleSave = async () => {
    if (!user || !supabase) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id);

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        // Refresh user data
        await initialize();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <Separator />

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
              user?.isAdmin
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-violet-500/20 text-violet-400'
            }`}>
              {user?.role || 'member'}
            </span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Separator className="my-8" />

      {/* User Preferences Section */}
      <div>
        <h2 className="text-lg font-semibold">User Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Customize your Nova GFX experience
        </p>
      </div>

      <div className="space-y-4 max-w-md mt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Theme</Label>
            {themeSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Choose your preferred color scheme
          </p>
          <div className="flex gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
