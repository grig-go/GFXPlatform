/**
 * Broadcast Graphics Style Library
 * 
 * Professional CSS style presets for broadcast graphics including:
 * - Glassmorphism effects
 * - Drop shadows
 * - Blur effects
 * - Gradients
 * - Text treatments
 */

// ============================================
// GLASS EFFECTS
// ============================================

export const GLASS_STYLES = {
  // Light glass - subtle, elegant
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  
  // Dark glass - for dark themes
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  
  // Frosted glass - heavy blur
  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  
  // Colored glass variants
  blue: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
  },
  
  red: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
  },
  
  purple: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
  },
  
  green: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
  },
} as const;

// ============================================
// DROP SHADOWS
// ============================================

export const SHADOW_STYLES = {
  // Subtle shadows
  subtle: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  
  // Medium elevation
  medium: {
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  
  // High elevation
  elevated: {
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
  },
  
  // Extra large shadow
  xl: {
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
  },
  
  // Dramatic shadow
  dramatic: {
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  },
  
  // Soft diffused shadow
  soft: {
    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
  },
  
  // Sharp shadow
  sharp: {
    boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.8)',
  },
  
  // Colored shadows
  blueGlow: {
    boxShadow: '0 0 30px rgba(59, 130, 246, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  redGlow: {
    boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  purpleGlow: {
    boxShadow: '0 0 30px rgba(139, 92, 246, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  greenGlow: {
    boxShadow: '0 0 30px rgba(34, 197, 94, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  goldGlow: {
    boxShadow: '0 0 30px rgba(245, 158, 11, 0.6), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
} as const;

// ============================================
// BLUR EFFECTS
// ============================================

export const BLUR_STYLES = {
  // Backdrop blurs (for glass effects)
  backdropLight: {
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  
  backdropMedium: {
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  
  backdropHeavy: {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  },
  
  backdropExtreme: {
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
  },
  
  // Element blur (blurs the element itself)
  elementSlight: {
    filter: 'blur(2px)',
  },
  
  elementMedium: {
    filter: 'blur(4px)',
  },
  
  elementHeavy: {
    filter: 'blur(8px)',
  },
} as const;

// ============================================
// GRADIENT BACKGROUNDS
// ============================================

export const GRADIENT_STYLES = {
  // Blue gradients
  blueHorizontal: {
    background: 'linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)',
  },
  
  blueVertical: {
    background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
  },
  
  blueDiagonal: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  },
  
  // Red gradients
  redHorizontal: {
    background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)',
  },
  
  redVertical: {
    background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
  },
  
  // Purple gradients
  purpleDiagonal: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  },
  
  // Sports gradients
  sportsBlue: {
    background: 'linear-gradient(180deg, #1E3A5F 0%, #0D1B2A 100%)',
  },
  
  sportsGreen: {
    background: 'linear-gradient(180deg, #065F46 0%, #022C22 100%)',
  },
  
  // Premium gradients
  gold: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #F59E0B 100%)',
  },
  
  silver: {
    background: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 50%, #9CA3AF 100%)',
  },
  
  // Dark gradients
  darkBlue: {
    background: 'linear-gradient(180deg, rgba(30, 58, 95, 0.95) 0%, rgba(13, 27, 42, 0.95) 100%)',
  },
  
  darkPurple: {
    background: 'linear-gradient(180deg, rgba(76, 29, 149, 0.95) 0%, rgba(17, 24, 39, 0.95) 100%)',
  },
} as const;

// ============================================
// TEXT STYLES
// ============================================

export const TEXT_STYLES = {
  // Headlines
  headline: {
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  
  headlineBold: {
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    textTransform: 'uppercase',
  },
  
  // Text with shadow for readability
  shadowedLight: {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  
  shadowedMedium: {
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
  },
  
  shadowedHeavy: {
    textShadow: '0 4px 16px rgba(0, 0, 0, 0.7)',
  },
  
  // Outlined text
  outlineWhite: {
    WebkitTextStroke: '1px white',
    textStroke: '1px white',
  },
  
  outlineBlack: {
    WebkitTextStroke: '1px black',
    textStroke: '1px black',
  },
  
  // Glow text
  glowBlue: {
    textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)',
  },
  
  glowRed: {
    textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)',
  },
  
  glowGold: {
    textShadow: '0 0 20px rgba(245, 158, 11, 0.8), 0 0 40px rgba(245, 158, 11, 0.4)',
  },
} as const;

// ============================================
// BORDER STYLES
// ============================================

export const BORDER_STYLES = {
  // Solid borders
  thin: {
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  
  medium: {
    border: '2px solid rgba(255, 255, 255, 0.3)',
  },
  
  thick: {
    border: '3px solid rgba(255, 255, 255, 0.4)',
  },
  
  // Accent borders
  accentBlue: {
    border: '2px solid #3B82F6',
  },
  
  accentRed: {
    border: '2px solid #EF4444',
  },
  
  accentGold: {
    border: '2px solid #F59E0B',
  },
  
  // Left accent (for lower thirds)
  leftAccentBlue: {
    borderLeft: '4px solid #3B82F6',
  },
  
  leftAccentRed: {
    borderLeft: '4px solid #EF4444',
  },
  
  leftAccentGold: {
    borderLeft: '4px solid #F59E0B',
  },
} as const;

// ============================================
// COMPLETE PRESETS (Combines multiple styles)
// ============================================

export const BROADCAST_PRESETS = {
  // Lower Third presets
  lowerThirdModern: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    borderLeft: '4px solid #3B82F6',
  },
  
  lowerThirdGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  lowerThirdSports: {
    background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 100%)',
    borderRadius: '4px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  
  lowerThirdNews: {
    background: 'linear-gradient(180deg, #1E3A5F 0%, #0D1B2A 100%)',
    borderRadius: '0',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  
  // Bug presets
  bugModern: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  
  bugGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  
  bugCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: '50%',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  },
  
  // Fullscreen presets
  fullscreenDark: {
    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%)',
  },
  
  fullscreenBlue: {
    background: 'linear-gradient(180deg, rgba(30, 58, 95, 0.95) 0%, rgba(13, 27, 42, 0.95) 100%)',
  },
  
  fullscreenGlass: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
  },
  
  // Card presets
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  cardSolid: {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  
  cardPremium: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '16px',
    boxShadow: '0 0 40px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)',
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a glass effect style object
 */
export function createGlassStyle(
  bgColor: string = 'rgba(0, 0, 0, 0.6)',
  blurAmount: number = 16,
  borderColor: string = 'rgba(255, 255, 255, 0.1)'
): Record<string, string> {
  return {
    backgroundColor: bgColor,
    backdropFilter: `blur(${blurAmount}px)`,
    WebkitBackdropFilter: `blur(${blurAmount}px)`,
    border: `1px solid ${borderColor}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  };
}

/**
 * Creates a shadow style object
 */
export function createShadowStyle(
  offsetX: number = 0,
  offsetY: number = 8,
  blur: number = 32,
  spread: number = 0,
  color: string = 'rgba(0, 0, 0, 0.3)'
): Record<string, string> {
  return {
    boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`,
  };
}

/**
 * Creates a glow effect style object
 */
export function createGlowStyle(
  color: string = '#3B82F6',
  intensity: number = 0.6,
  size: number = 30
): Record<string, string> {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  return {
    boxShadow: `0 0 ${size}px rgba(${r}, ${g}, ${b}, ${intensity}), 0 8px 32px rgba(0, 0, 0, 0.3)`,
  };
}

/**
 * Creates a gradient style object
 */
export function createGradientStyle(
  color1: string,
  color2: string,
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal'
): Record<string, string> {
  const angle = direction === 'horizontal' ? '90deg' : direction === 'vertical' ? '180deg' : '135deg';
  return {
    background: `linear-gradient(${angle}, ${color1} 0%, ${color2} 100%)`,
  };
}

// Export all presets for AI system prompt
export const ALL_BROADCAST_STYLES = {
  glass: GLASS_STYLES,
  shadow: SHADOW_STYLES,
  blur: BLUR_STYLES,
  gradient: GRADIENT_STYLES,
  text: TEXT_STYLES,
  border: BORDER_STYLES,
  presets: BROADCAST_PRESETS,
};

// Style reference documentation for AI
export const STYLE_DOCUMENTATION = `
## Broadcast Graphics Style Reference

### Glass Effects (Glassmorphism)
Use these styles for modern, frosted glass look:
- backdropFilter: "blur(16px)" - Creates blur effect on background
- WebkitBackdropFilter: "blur(16px)" - Safari support  
- backgroundColor: "rgba(0, 0, 0, 0.6)" - Semi-transparent background
- border: "1px solid rgba(255, 255, 255, 0.1)" - Subtle border

Example glass style:
{
  "backgroundColor": "rgba(0, 0, 0, 0.6)",
  "backdropFilter": "blur(16px)",
  "WebkitBackdropFilter": "blur(16px)",
  "border": "1px solid rgba(255, 255, 255, 0.1)",
  "borderRadius": "12px"
}

### Drop Shadows
Use boxShadow for depth:
- Subtle: "0 2px 8px rgba(0, 0, 0, 0.15)"
- Medium: "0 4px 16px rgba(0, 0, 0, 0.2)"
- Large: "0 8px 32px rgba(0, 0, 0, 0.3)"
- Glow: "0 0 30px rgba(59, 130, 246, 0.6)"

### Gradients
Use background for gradient backgrounds:
- Horizontal: "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)"
- Vertical: "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"
- Diagonal: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"

### Text Shadows
For readable text on any background:
- Light: "0 2px 4px rgba(0, 0, 0, 0.3)"
- Heavy: "0 4px 16px rgba(0, 0, 0, 0.7)"
- Glow: "0 0 20px rgba(59, 130, 246, 0.8)"

### Border Radius
- Subtle: "4px" or "8px"
- Rounded: "12px" or "16px"
- Pill: "9999px"
- Circle: "50%"
`;





