/**
 * Sign Up Page Component for Pulsar MCR
 *
 * Full-page signup form using BlueprintJS components.
 * Layout matches Nova and Pulsar Hub for consistency.
 */

import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

interface SignUpPageProps {
  onSignUpSuccess?: () => void;
  onNavigateToLogin?: () => void;
}

interface InvitationInfo {
  organization_name: string;
  organization_id: string;
  role: string;
  email: string;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess, onNavigateToLogin }) => {
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
        setIsSubmitting(false);
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setIsSubmitting(false);
        return;
      }

      // Check if email domain is allowed (if no invitation)
      if (!inviteToken) {
        const { data: orgData, error: orgError } = await supabase
          .rpc('get_org_for_email_domain', { p_email: email });

        if (orgError || !orgData) {
          setError('Your email domain is not authorized for self-signup. Please contact your administrator for an invitation.');
          setIsSubmitting(false);
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
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.');
        setIsSubmitting(false);
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

  const lockButton = (
    <Button
      icon={showPassword ? 'eye-off' : 'eye-open'}
      intent={Intent.NONE}
      minimal={true}
      onClick={() => setShowPassword(!showPassword)}
      tabIndex={-1}
    />
  );

  // Validating invitation state
  if (isValidatingInvite) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          padding: '20px',
        }}
      >
        <Card
          elevation={3}
          style={{
            padding: '40px',
            backgroundColor: 'var(--bg-secondary)',
            textAlign: 'center',
          }}
        >
          <Spinner size={SpinnerSize.LARGE} />
          <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>
            Validating invitation...
          </p>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          padding: '20px',
        }}
      >
        <Card
          elevation={3}
          style={{
            padding: '40px',
            backgroundColor: 'var(--bg-secondary)',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(61, 204, 145, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ fontSize: '30px' }}>✓</span>
          </div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
            Account Created!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Please check your email to verify your account.
          </p>
          <Button intent={Intent.PRIMARY} onClick={onNavigateToLogin}>
            Go to Sign In
          </Button>
        </Card>
      </div>
    );
  }

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

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo/Branding - side by side like Nova/Pulsar Hub */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Emergent Logo */}
          <svg
            style={{ height: '28px', color: 'var(--text-primary)' }}
            viewBox="0 0 1185 176"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="EMERGENT"
          >
            <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
              {/* E */}
              <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z"/>
              {/* M */}
              <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z"/>
              {/* E */}
              <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z"/>
              {/* R */}
              <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z"/>
              {/* G */}
              <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z"/>
              {/* E */}
              <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z"/>
              {/* N */}
              <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z"/>
              {/* T */}
              <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z"/>
            </g>
          </svg>

          {/* Pulsar MCR with Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                height: '40px',
                width: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #137cbd, #9179f2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>P</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Pulsar MCR
            </span>
          </div>
        </div>

        {/* Sign Up Card */}
        <Card
          elevation={3}
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Create your account
          </h2>
          <p
            style={{
              margin: '0 0 24px',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            {invitationInfo ? (
              <>You've been invited to join <strong>{invitationInfo.organization_name}</strong></>
            ) : (
              <>Sign up to get started with Pulsar MCR</>
            )}
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <Callout intent={Intent.DANGER} style={{ marginBottom: '20px' }}>
                {error}
              </Callout>
            )}

            {invitationInfo && (
              <Callout intent={Intent.SUCCESS} style={{ marginBottom: '20px' }}>
                You'll join as <strong>{invitationInfo.role}</strong> in {invitationInfo.organization_name}
              </Callout>
            )}

            <FormGroup label="Full Name" labelFor="fullname-input" style={{ marginBottom: '15px' }}>
              <InputGroup
                id="fullname-input"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="name"
                autoFocus
                large
              />
            </FormGroup>

            <FormGroup label="Email" labelFor="email-input" style={{ marginBottom: '15px' }}>
              <InputGroup
                id="email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || !!invitationInfo}
                required
                autoComplete="email"
                large
              />
              {invitationInfo && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Email is set from your invitation
                </p>
              )}
            </FormGroup>

            <FormGroup label="Password" labelFor="password-input" style={{ marginBottom: '15px' }}>
              <InputGroup
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="new-password"
                rightElement={lockButton}
                large
              />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                Must be at least 8 characters
              </p>
            </FormGroup>

            <FormGroup label="Confirm Password" labelFor="confirm-password-input" style={{ marginBottom: '25px' }}>
              <InputGroup
                id="confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="new-password"
                large
              />
            </FormGroup>

            <Button
              type="submit"
              intent={Intent.PRIMARY}
              fill
              large
              disabled={isSubmitting || !email || !password || !confirmPassword || !fullName}
              icon={isSubmitting ? undefined : 'new-person'}
            >
              {isSubmitting ? (
                <>
                  <Spinner size={SpinnerSize.SMALL} />
                  <span style={{ marginLeft: '8px' }}>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Card>

        {/* Sign In Link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '16px',
            marginBottom: 0,
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}
        >
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#137cbd',
              cursor: 'pointer',
              padding: 0,
              fontSize: '14px',
              textDecoration: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Sign in
          </button>
        </p>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            marginBottom: 0,
            color: 'var(--text-secondary)',
            fontSize: '12px',
          }}
        >
          By signing up, you agree to our{' '}
          <a
            href="https://www.emergent.solutions/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://www.emergent.solutions/private-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
