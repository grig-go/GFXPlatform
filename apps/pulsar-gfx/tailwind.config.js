const sharedPreset = require('@emergent-platform/design-tokens/tailwind-preset');

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Pulsar GFX specific extensions
    },
  },
  plugins: [require('tailwindcss-animate')],
};
