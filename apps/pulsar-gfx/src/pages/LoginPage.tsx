import { useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/auth';

export function LoginPage() {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Pulsar GFX
          </h1>
          <p className="text-muted-foreground mt-2">
            Broadcast Playout System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Welcome Back
          </h2>
          <LoginForm redirectTo={from} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
