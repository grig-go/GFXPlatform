// Pre-made Design System Presets for Nova GFX

import type { ColorPalette, FontPairing, DesignColors } from '@emergent-platform/types';

// System Color Palettes
export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'news-blue',
    name: 'News Blue',
    description: 'Professional news broadcast palette with deep blues and high contrast',
    category: 'news',
    colors: {
      primary: '#1E3A5F',
      secondary: '#2563EB',
      accent: '#DC2626',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      success: '#16A34A',
      warning: '#EAB308',
      error: '#DC2626',
    },
    isSystem: true,
  },
  {
    id: 'sports-energy',
    name: 'Sports Energy',
    description: 'High-energy sports palette with bold yellows and reds',
    category: 'sports',
    colors: {
      primary: '#18181B',
      secondary: '#FBBF24',
      accent: '#EF4444',
      background: '#09090B',
      surface: '#27272A',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      success: '#22C55E',
      warning: '#FBBF24',
      error: '#EF4444',
    },
    isSystem: true,
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Vibrant entertainment palette with purples and pinks',
    category: 'entertainment',
    colors: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#06B6D4',
      background: '#0C0A09',
      surface: '#1C1917',
      text: '#FAFAF9',
      textMuted: '#A8A29E',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    isSystem: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, minimal corporate look with high contrast',
    category: 'corporate',
    colors: {
      primary: '#171717',
      secondary: '#FFFFFF',
      accent: '#3B82F6',
      background: '#000000',
      surface: '#262626',
      text: '#FFFFFF',
      textMuted: '#737373',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#DC2626',
    },
    isSystem: true,
  },
  {
    id: 'esports-neon',
    name: 'Esports Neon',
    description: 'Cyberpunk-inspired palette for gaming and esports',
    category: 'sports',
    colors: {
      primary: '#00FF88',
      secondary: '#FF00FF',
      accent: '#00FFFF',
      background: '#0A0A0F',
      surface: '#1A1A2E',
      text: '#FFFFFF',
      textMuted: '#8888AA',
      success: '#00FF88',
      warning: '#FFFF00',
      error: '#FF0055',
    },
    isSystem: true,
  },
  {
    id: 'breaking-news',
    name: 'Breaking News',
    description: 'Urgent red-based palette for breaking news alerts',
    category: 'news',
    colors: {
      primary: '#B91C1C',
      secondary: '#FFFFFF',
      accent: '#FEF08A',
      background: '#1C1917',
      surface: '#292524',
      text: '#FFFFFF',
      textMuted: '#D6D3D1',
      success: '#16A34A',
      warning: '#FEF08A',
      error: '#B91C1C',
    },
    isSystem: true,
  },
  {
    id: 'weather',
    name: 'Weather Channel',
    description: 'Sky-inspired palette for weather broadcasts',
    category: 'news',
    colors: {
      primary: '#0284C7',
      secondary: '#38BDF8',
      accent: '#FCD34D',
      background: '#082F49',
      surface: '#0C4A6E',
      text: '#F0F9FF',
      textMuted: '#BAE6FD',
      success: '#22C55E',
      warning: '#FCD34D',
      error: '#EF4444',
    },
    isSystem: true,
  },
  {
    id: 'football-nfl',
    name: 'Football (NFL Style)',
    description: 'Classic American football broadcast style',
    category: 'sports',
    colors: {
      primary: '#013369',
      secondary: '#D50A0A',
      accent: '#FFB612',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#FFFFFF',
      textMuted: '#CBD5E1',
      success: '#22C55E',
      warning: '#FFB612',
      error: '#D50A0A',
    },
    isSystem: true,
  },
];

// System Font Pairings
export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Contemporary and highly readable for any broadcast',
    category: 'modern',
    headingFamily: 'Inter',
    headingWeights: [600, 700, 800],
    bodyFamily: 'Inter',
    bodyWeights: [400, 500, 600],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    isSystem: true,
  },
  {
    id: 'sports-bold',
    name: 'Sports Bold',
    description: 'Impact-style fonts for sports graphics',
    category: 'sports',
    headingFamily: 'Bebas Neue',
    headingWeights: [400],
    bodyFamily: 'Roboto Condensed',
    bodyWeights: [400, 700],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto+Condensed:wght@400;700&display=swap',
    isSystem: true,
  },
  {
    id: 'tech-future',
    name: 'Tech Future',
    description: 'Futuristic look for tech and esports',
    category: 'modern',
    headingFamily: 'Space Grotesk',
    headingWeights: [500, 700],
    bodyFamily: 'Inter',
    bodyWeights: [400, 500],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&display=swap',
    isSystem: true,
  },
  {
    id: 'elegant-classic',
    name: 'Elegant Classic',
    description: 'Sophisticated pairing for upscale broadcasts',
    category: 'elegant',
    headingFamily: 'Playfair Display',
    headingWeights: [600, 700],
    bodyFamily: 'Source Sans Pro',
    bodyWeights: [400, 600],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+Pro:wght@400;600&display=swap',
    isSystem: true,
  },
  {
    id: 'news-professional',
    name: 'News Professional',
    description: 'Classic news broadcast typography',
    category: 'classic',
    headingFamily: 'Roboto',
    headingWeights: [500, 700, 900],
    bodyFamily: 'Roboto',
    bodyWeights: [400, 500],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap',
    isSystem: true,
  },
  {
    id: 'broadcast-condensed',
    name: 'Broadcast Condensed',
    description: 'Condensed fonts for data-heavy graphics',
    category: 'sports',
    headingFamily: 'Barlow Condensed',
    headingWeights: [600, 700, 800],
    bodyFamily: 'Barlow',
    bodyWeights: [400, 500],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500&display=swap',
    isSystem: true,
  },
  {
    id: 'geometric',
    name: 'Geometric',
    description: 'Clean geometric sans-serif for modern broadcasts',
    category: 'modern',
    headingFamily: 'Poppins',
    headingWeights: [600, 700, 800],
    bodyFamily: 'Poppins',
    bodyWeights: [400, 500],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    isSystem: true,
  },
  {
    id: 'oswald-impact',
    name: 'Oswald Impact',
    description: 'Bold headlines with readable body text',
    category: 'sports',
    headingFamily: 'Oswald',
    headingWeights: [500, 600, 700],
    bodyFamily: 'Open Sans',
    bodyWeights: [400, 600],
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Open+Sans:wght@400;600&display=swap',
    isSystem: true,
  },
];

// Animation Easing Presets
export const EASING_PRESETS = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Broadcast-optimized easings
  smoothIn: 'cubic-bezier(0.16, 1, 0.3, 1)',       // Expo out - great for IN animations
  smoothOut: 'cubic-bezier(0.7, 0, 0.84, 0)',     // Expo in - great for OUT animations
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Slight overshoot
  snap: 'cubic-bezier(0.25, 0.1, 0.25, 1)',       // Snappy motion
  
  // Named presets for UI
  presets: [
    { name: 'Smooth In', value: 'cubic-bezier(0.16, 1, 0.3, 1)', description: 'Best for entry animations' },
    { name: 'Smooth Out', value: 'cubic-bezier(0.7, 0, 0.84, 0)', description: 'Best for exit animations' },
    { name: 'Bounce', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', description: 'Playful overshoot' },
    { name: 'Snap', value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', description: 'Quick and snappy' },
    { name: 'Linear', value: 'linear', description: 'Constant speed' },
    { name: 'Ease In Out', value: 'ease-in-out', description: 'Smooth both ends' },
  ],
};

// Text Treatment Presets
export const TEXT_TREATMENT_PRESETS = [
  {
    name: 'Drop Shadow',
    type: 'shadow' as const,
    shadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    description: 'Standard broadcast text shadow',
  },
  {
    name: 'Heavy Shadow',
    type: 'shadow' as const,
    shadow: '0 4px 8px rgba(0, 0, 0, 0.7), 0 2px 4px rgba(0, 0, 0, 0.5)',
    description: 'For bright or busy backgrounds',
  },
  {
    name: 'Outline',
    type: 'outline' as const,
    outline: '2px solid rgba(0, 0, 0, 0.8)',
    description: 'Sharp text outline',
  },
  {
    name: 'Background Box',
    type: 'background' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    description: 'Semi-transparent background',
  },
  {
    name: 'None',
    type: 'none' as const,
    description: 'No treatment (use for solid backgrounds)',
  },
];

// Get palette by ID
export function getPaletteById(id: string): ColorPalette | undefined {
  return COLOR_PALETTES.find(p => p.id === id);
}

// Get font pairing by ID
export function getFontPairingById(id: string): FontPairing | undefined {
  return FONT_PAIRINGS.find(f => f.id === id);
}

// Get palettes by category
export function getPalettesByCategory(category: string): ColorPalette[] {
  return COLOR_PALETTES.filter(p => p.category === category);
}

// Get font pairings by category
export function getFontPairingsByCategory(category: string): FontPairing[] {
  return FONT_PAIRINGS.filter(f => f.category === category);
}

// Generate Google Fonts URL from design system
export function generateGoogleFontsUrl(fonts: { heading: { family: string; weights: number[] }; body: { family: string; weights: number[] } }): string {
  const families: string[] = [];
  
  const headingWeights = fonts.heading.weights.join(';');
  families.push(`family=${encodeURIComponent(fonts.heading.family)}:wght@${headingWeights}`);
  
  if (fonts.body.family !== fonts.heading.family) {
    const bodyWeights = fonts.body.weights.join(';');
    families.push(`family=${encodeURIComponent(fonts.body.family)}:wght@${bodyWeights}`);
  }
  
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}






