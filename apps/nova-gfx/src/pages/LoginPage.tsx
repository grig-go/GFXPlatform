import { useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/auth';

export function LoginPage() {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/projects';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding - side by side like TopBar */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {/* Emergent Logo */}
          <svg
            className="h-7 text-foreground"
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

          {/* Nova GFX with Icon */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex items-center justify-center shadow-sm">
              <span className="text-white text-lg font-bold">N</span>
            </div>
            <span className="text-2xl font-medium">Nova GFX</span>
          </div>
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
          By signing in, you agree to our{' '}
          <a
            href="https://www.emergent.solutions/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://www.emergent.solutions/private-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
