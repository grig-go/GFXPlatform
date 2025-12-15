// Design System Types for Nova GFX

// Color Palette
export interface DesignColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
}

// Typography Configuration
export interface FontConfigExtended {
  family: string;
  weights: number[];
  fallback: string;
}

export interface DesignFonts {
  heading: FontConfigExtended;
  body: FontConfigExtended;
}

// Type Scale
export interface TypeScaleEntry {
  size: number;
  lineHeight: number;
  weight: number;
}

export interface DesignTypeScale {
  display: TypeScaleEntry;
  h1: TypeScaleEntry;
  h2: TypeScaleEntry;
  h3: TypeScaleEntry;
  h4: TypeScaleEntry;
  body: TypeScaleEntry;
  caption: TypeScaleEntry;
}

// Animation Defaults
export interface AnimationTiming {
  duration: number;
  easing: string;
}

export interface DesignAnimationDefaults {
  in: AnimationTiming;
  out: AnimationTiming;
  stagger: number;
}

// Text Treatment for video overlay
export interface TextTreatment {
  type: 'shadow' | 'outline' | 'background' | 'none';
  shadow?: string;
  outline?: string;
  backgroundColor?: string;
}

// Safe Areas
export interface SafeAreaConfig {
  margin: number;
}

export interface DesignSafeAreas {
  titleSafe: SafeAreaConfig;
  actionSafe: SafeAreaConfig;
}

// AI Generation Constraints
export interface DesignConstraints {
  minFontSize: number;
  maxFontSize: number;
  minContrast: number;
  maxAnimationDuration: number;
}

// Shadow Presets
export interface DesignShadows {
  sm: string;
  md: string;
  lg: string;
}

// Design System Section Enablement
export interface DesignSystemSections {
  colors: boolean;
  typography: boolean;
  spacing: boolean;
  animation: boolean;
  constraints: boolean;
}

// Complete Design System
export interface ProjectDesignSystem {
  colors: DesignColors;
  fonts: DesignFonts;
  typeScale: DesignTypeScale;
  spacing: number[];
  radii: number[];
  shadows: DesignShadows;
  animationDefaults: DesignAnimationDefaults;
  textTreatment: TextTreatment;
  safeAreas: DesignSafeAreas;
  constraints: DesignConstraints;
  enabledSections?: DesignSystemSections; // Optional for backward compatibility
}

// Color Palette Library (pre-made palettes)
export interface ColorPalettePreset {
  id: string;
  name: string;
  description?: string;
  category: 'news' | 'sports' | 'entertainment' | 'corporate' | 'custom';
  colors: DesignColors;
  isSystem: boolean;
  previewUrl?: string;
}

// Font Configuration Library
export interface FontPairing {
  id: string;
  name: string;
  description?: string;
  category: 'modern' | 'classic' | 'sports' | 'elegant';
  headingFamily: string;
  headingWeights: number[];
  bodyFamily: string;
  bodyWeights: number[];
  isSystem: boolean;
  previewUrl?: string;
}

// Default Design System
export const DEFAULT_DESIGN_SYSTEM: ProjectDesignSystem = {
  colors: {
    primary: '#2563EB',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    success: '#16A34A',
    warning: '#EAB308',
    error: '#DC2626',
  },
  fonts: {
    heading: {
      family: 'Inter',
      weights: [600, 700, 800],
      fallback: 'system-ui, sans-serif',
    },
    body: {
      family: 'Inter',
      weights: [400, 500, 600],
      fallback: 'system-ui, sans-serif',
    },
  },
  typeScale: {
    display: { size: 96, lineHeight: 1.1, weight: 800 },
    h1: { size: 64, lineHeight: 1.15, weight: 700 },
    h2: { size: 48, lineHeight: 1.2, weight: 700 },
    h3: { size: 42, lineHeight: 1.2, weight: 600 },
    h4: { size: 32, lineHeight: 1.3, weight: 500 },
    body: { size: 24, lineHeight: 1.5, weight: 400 },
    caption: { size: 20, lineHeight: 1.4, weight: 500 },
  },
  spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
  radii: [0, 4, 8, 12, 16, 9999],
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
  animationDefaults: {
    in: { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    out: { duration: 300, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' },
    stagger: 100,
  },
  textTreatment: {
    type: 'shadow',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  },
  safeAreas: {
    titleSafe: { margin: 192 },
    actionSafe: { margin: 96 },
  },
  constraints: {
    minFontSize: 18,
    maxFontSize: 96,
    minContrast: 4.5,
    maxAnimationDuration: 1000,
  },
  enabledSections: {
    colors: false, // Disabled by default
    typography: true,
    spacing: true,
    animation: true,
    constraints: true,
  },
};
