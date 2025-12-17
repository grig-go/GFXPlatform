import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import Login from './Login';
import { AUTH } from '../config/auth';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.') ||
    window.location.hostname.endsWith('.local'));

const isFigmaDesktop =
  typeof navigator !== 'undefined' && /Figma|Make/i.test(navigator.userAgent);

const SKIP_AUTH = AUTH.skipAuth || isLocal || isFigmaDesktop;

export default function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(!SKIP_AUTH);
  const [email, setEmail] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const allowed =
    SKIP_AUTH || (!!email && email.toLowerCase().endsWith(AUTH.allowedDomain));

  useEffect(() => {
    if (SKIP_AUTH) {
      setEmail('dev@emergent.new');
      setChecking(false);
      setShowLogin(true); // Show login screen in dev mode
      return;
    }
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
      setChecking(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) return null;
  
  // In dev mode, show login screen initially, then app after clicking login
  if (SKIP_AUTH && showLogin) {
    return <Login onLoginClick={() => setShowLogin(false)} />;
  }
  
  if (!allowed) return <Login />;

  return (
    <>
      {SKIP_AUTH && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 text-[11px] px-2 py-1 rounded bg-yellow-200/80 border border-yellow-400">
          DEV MODE: auth skipped
        </div>
      )}
      {children}
    </>
  );
}
