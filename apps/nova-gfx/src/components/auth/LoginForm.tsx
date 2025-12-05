import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
} from '@emergent-platform/ui';
import { useAuthStore } from '@/stores/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo = '/projects' }: LoginFormProps) {
  const navigate = useNavigate();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    const result = await signIn(email, password);

    if (result.success) {
      onSuccess?.();
      navigate(redirectTo);
    }
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displayError && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

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
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
