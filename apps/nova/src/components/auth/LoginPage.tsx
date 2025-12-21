/**
 * Login Page Component
 *
 * Full-page login form for Nova and Pulsar applications.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, LogIn, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface LoginPageProps {
  appName?: 'Nova' | 'Pulsar';
  onLoginSuccess?: () => void;
  onNavigateToSignUp?: () => void;
}

export function LoginPage({ appName = 'Nova', onLoginSuccess, onNavigateToSignUp }: LoginPageProps) {
  const { signIn, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        // Handle specific error messages
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(signInError.message || 'An error occurred during sign in.');
        }
        return;
      }

      // Success - callback will handle navigation
      onLoginSuccess?.();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Theme toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
                animate={{
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.05, 1.05, 1.05, 1]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut"
                }}
              >
                <span className="text-white font-bold text-xl">
                  {appName === 'Nova' ? 'N' : 'P'}
                </span>
              </motion.div>
            </div>
            <CardTitle className="text-2xl">Sign in to {appName}</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {onNavigateToSignUp ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={onNavigateToSignUp}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            'Contact your administrator if you need access.'
          )}
        </p>
      </motion.div>
    </div>
  );
}
