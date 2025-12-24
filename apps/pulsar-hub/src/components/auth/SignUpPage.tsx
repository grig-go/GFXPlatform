/**
 * Sign Up Page Component
 *
 * Full-page signup form for Pulsar Hub with invitation and domain-based signup support.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, UserPlus, AlertCircle, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface SignUpPageProps {
  appName?: 'Nova' | 'Pulsar';
  onSignUpSuccess?: () => void;
  onNavigateToLogin?: () => void;
}

interface InvitationInfo {
  organization_name: string;
  organization_id: string;
  role: string;
  email: string;
}

export function SignUpPage({ appName = 'Pulsar', onSignUpSuccess, onNavigateToLogin }: SignUpPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invitation state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);

  // Check for invitation token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite');
    if (token) {
      setInviteToken(token);
      validateInvitation(token);
    }
  }, []);

  const validateInvitation = async (token: string) => {
    setIsValidatingInvite(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('validate_u_invitation_token', { p_token: token });

      if (error || !data) {
        setError('Invalid or expired invitation link.');
        setInviteToken(null);
        return;
      }

      setInvitationInfo({
        organization_name: data.organization_name,
        organization_id: data.organization_id,
        role: data.role,
        email: data.email,
      });
      setEmail(data.email);
    } catch (err) {
      console.error('Error validating invitation:', err);
      setError('Failed to validate invitation.');
      setInviteToken(null);
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }

      // Check if email domain is allowed (if no invitation)
      if (!inviteToken) {
        const { data: orgData, error: orgError } = await supabase
          .rpc('get_org_for_email_domain', { p_email: email });

        if (orgError || !orgData) {
          setError('Your email domain is not authorized for self-signup. Please contact your administrator for an invitation.');
          return;
        }
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.');
        return;
      }

      // If we have an invitation, accept it
      if (inviteToken && invitationInfo) {
        const { error: acceptError } = await supabase
          .rpc('accept_u_invitation', {
            p_token: inviteToken,
            p_user_id: authData.user.id,
          });

        if (acceptError) {
          console.error('Error accepting invitation:', acceptError);
          // Don't fail the signup, just log the error
        }
      }

      setSuccess(true);
      onSignUpSuccess?.();
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidatingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Account Created!</h2>
              <p className="text-muted-foreground text-center mb-4">
                Please check your email to verify your account.
              </p>
              <Button onClick={onNavigateToLogin}>
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              {invitationInfo ? (
                <>
                  You've been invited to join <strong>{invitationInfo.organization_name}</strong>
                </>
              ) : (
                <>Sign up to get started with {appName} Hub</>
              )}
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

              {invitationInfo && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    You'll join as <strong>{invitationInfo.role}</strong> in {invitationInfo.organization_name}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || !!invitationInfo}
                  required
                  autoComplete="email"
                />
                {invitationInfo && (
                  <p className="text-xs text-muted-foreground">
                    Email is set from your invitation
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="new-password"
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
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !email || !password || !confirmPassword || !fullName}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
