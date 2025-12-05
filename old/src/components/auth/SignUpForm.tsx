import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
} from '@emergent-platform/ui';
import { useAuthStore, isEmergentEmail } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface SignUpFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

interface InviteInfo {
  email: string;
  organizationName: string;
  role: string;
}

export function SignUpForm({ onSuccess, redirectTo = '/projects' }: SignUpFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Validate invitation token on mount
  useEffect(() => {
    if (inviteToken && supabase) {
      setLoadingInvite(true);
      supabase
        .rpc('validate_invitation_token', { invite_token: inviteToken })
        .then(({ data, error }) => {
          if (!error && data?.[0]?.is_valid) {
            setInviteInfo({
              email: data[0].email,
              organizationName: data[0].organization_name,
              role: data[0].role,
            });
            setEmail(data[0].email);
          } else {
            setLocalError(data?.[0]?.error_message || 'Invalid invitation link');
          }
          setLoadingInvite(false);
        });
    }
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validation
    if (!email || !password || !name) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    // Check if email is allowed
    if (!inviteToken && !isEmergentEmail(email)) {
      setLocalError('Sign up is currently restricted to @emergent.new emails. Contact an admin for an invitation.');
      return;
    }

    // If invited, check email matches
    if (inviteInfo && email.toLowerCase() !== inviteInfo.email.toLowerCase()) {
      setLocalError('Please use the email address the invitation was sent to');
      return;
    }

    const result = await signUp(email, password, name, inviteToken || undefined);

    if (result.success) {
      onSuccess?.();
      navigate(redirectTo);
    }
  };

  const displayError = localError || error;

  if (loadingInvite) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {inviteInfo && (
        <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Building2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">You're invited to join {inviteInfo.organizationName}</p>
            <p className="text-xs text-emerald-400/70">Complete signup to join as {inviteInfo.role}</p>
          </div>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            disabled={isLoading}
            autoComplete="name"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            disabled={isLoading || !!inviteInfo}
            autoComplete="email"
          />
        </div>
        {!inviteInfo && (
          <p className="text-xs text-muted-foreground">
            Sign up is restricted to @emergent.new emails during beta
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10"
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>
        {confirmPassword && password === confirmPassword && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Passwords match
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : inviteInfo ? (
          `Join ${inviteInfo.organizationName}`
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
