import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Separator,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export function ProfileSettings() {
  const { user, initialize } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-400 capitalize">
              {user?.role || 'member'}
            </span>
            {user?.isEmergentUser && (
              <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400">
                Admin
              </span>
            )}
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
    </div>
  );
}
