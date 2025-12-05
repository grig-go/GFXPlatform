import { SignUpForm } from '@/components/auth';

export function SignUpPage() {
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

        {/* SignUp Card */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Create Your Account
          </h2>
          <SignUpForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
