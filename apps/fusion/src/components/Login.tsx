import { supabase } from '../supabaseClient';

// Your allowed deployed domains:
const ALLOWED_ORIGINS = [
  'https://fusion-rd.netlify.app',
  'https://garnet-typo-68506392.figma.site'
];

// Detect if running in local dev or Figma Desktop preview (both should bypass)
const isLocalDev =
  window.location.hostname === 'localhost' ||
  window.location.hostname.startsWith('127.');

const isFigmaDesktop =
  typeof navigator !== 'undefined' && /Figma|Make/i.test(navigator.userAgent);

function getRedirectTo() {
  const origin = window.location.origin.replace(/\/$/, '');

  // ✅ If running from one of the allowed production URLs – redirect back to itself
  if (ALLOWED_ORIGINS.includes(origin)) {
    return `${origin}/`;
  }

  // ✅ If running in Figma Desktop or local dev, bypass redirect (keep session inside Supabase auth flow)
  if (isLocalDev || isFigmaDesktop) {
    console.log('[Auth] Bypass redirect for Figma Desktop/local dev');
    return undefined; // Supabase will use Site URL (Netlify) by default
  }

  // 🔒 Safe fallback (never localhost in cloud)
  return 'https://fusion-rd.netlify.app/'; // your production URL
}

export default function Login({ onLoginClick }: { onLoginClick?: () => void } = {}) {
  const signIn = async () => {
    // In dev mode (Figma Desktop/local), just call the callback to skip auth
    if (onLoginClick) {
      console.log('[Auth] Dev mode: skipping OAuth');
      onLoginClick();
      return;
    }
    
    await supabase.auth.signOut(); // forces account selection

    const redirectTo = getRedirectTo();
    console.log('[OAuth redirectTo]', redirectTo);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Only include redirectTo if defined
        ...(redirectTo ? { redirectTo } : {}),
        queryParams: {
          prompt: 'select_account',
          include_granted_scopes: 'true',
          hd: 'emergent.new' // allows domain filtering UX hint
        }
      }
    });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        {/* Emergent Logo + F Icon + Fusion Text - Centered */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg 
            className="h-6"
            viewBox="0 0 1185 176" 
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Emergent"
          >
            <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
              <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z"/>
              <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z"/>
              <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z"/>
              <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z"/>
              <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z"/>
              <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z"/>
              <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z"/>
              <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z"/>
            </g>
          </svg>
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Fusion</h1>
        </div>

        <p className="text-sm text-gray-600 mb-6 text-center">
          Sign in with Gmail to continue.
        </p>

        <button
          onClick={signIn}
          className="w-full h-11 rounded-lg bg-black text-white font-medium hover:opacity-90 active:opacity-80 transition flex items-center justify-center gap-2"
        >
          {/* Gmail Logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40665 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54756 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
          Login with Gmail
        </button>

        {/* Footer - Centered */}
        <div className="mt-6 text-[11px] text-gray-400 text-center">
          By continuing, you agree to our terms.
        </div>
      </div>
    </div>
  );
}
