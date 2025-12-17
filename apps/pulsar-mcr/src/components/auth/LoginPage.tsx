/**
 * Login Page Component for Pulsar
 *
 * Full-page login form using BlueprintJS components.
 */

import React, { useState } from 'react';
import {
  Card,
  FormGroup,
  InputGroup,
  Button,
  Callout,
  Intent,
  Spinner,
  SpinnerSize,
} from '@blueprintjs/core';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
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

  const lockButton = (
    <Button
      icon={showPassword ? 'eye-off' : 'eye-open'}
      intent={Intent.NONE}
      minimal={true}
      onClick={() => setShowPassword(!showPassword)}
      tabIndex={-1}
    />
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Theme toggle button */}
      <Button
        icon={theme === 'dark' ? 'flash' : 'moon'}
        minimal
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
        }}
      />
      <Card
        elevation={3}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '30px',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #137cbd, #9179f2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 15px',
            }}
          >
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>P</span>
          </div>
          <h2 style={{ margin: '0 0 5px', color: 'var(--text-primary)' }}>Sign in to Pulsar</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Enter your credentials to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <Callout intent={Intent.DANGER} style={{ marginBottom: '20px' }}>
              {error}
            </Callout>
          )}

          <FormGroup label="Email" labelFor="email-input" style={{ marginBottom: '15px' }}>
            <InputGroup
              id="email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
              autoFocus
              large
            />
          </FormGroup>

          <FormGroup label="Password" labelFor="password-input" style={{ marginBottom: '25px' }}>
            <InputGroup
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
              rightElement={lockButton}
              large
            />
          </FormGroup>

          <Button
            type="submit"
            intent={Intent.PRIMARY}
            fill
            large
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <>
                <Spinner size={SpinnerSize.SMALL} />
                <span style={{ marginLeft: '8px' }}>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '20px',
            marginBottom: 0,
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}
        >
          Contact your administrator if you need access.
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;
