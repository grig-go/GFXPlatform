export const AUTH = {
  allowedDomain: '@emergent.new',
  // set VITE_SKIP_AUTH=true locally if you want to bypass
  skipAuth: typeof import.meta !== 'undefined' && import.meta.env?.VITE_SKIP_AUTH === 'true',
};
