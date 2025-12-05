/**
 * Design Themes Library for Nova GFX
 * 
 * Pre-built design themes inspired by professional broadcast graphics.
 * Each theme provides a consistent set of styles for containers, text, and effects.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DesignTheme {
  id: string;
  name: string;
  description: string;
  category: 'glass' | 'flat' | 'neon' | 'minimal' | 'sports' | 'news' | 'corporate';
  
  // Container styles
  container: {
    background: string;
    border: string;
    borderRadius: string;
    boxShadow: string;
    backdropFilter?: string;
  };
  
  // Card styles (for nested content)
  card: {
    background: string;
    border: string;
    borderRadius: string;
    boxShadow: string;
    backdropFilter?: string;
  };
  
  // Text styles
  text: {
    primary: string;
    secondary: string;
    accent: string;
    heading: {
      fontWeight: string;
      letterSpacing: string;
      textShadow?: string;
    };
  };
  
  // Accent colors
  accent: {
    primary: string;
    secondary: string;
    highlight: string;
    danger: string;
    success: string;
  };
  
  // Divider/separator styles
  divider: {
    color: string;
    style: 'solid' | 'gradient' | 'glow';
    width: string;
  };
  
  // Effects
  effects: {
    glow?: string;
    shimmer?: string;
    gradient?: string;
  };
}

// ============================================================================
// GLASS THEMES
// ============================================================================

export const GLASS_DARK: DesignTheme = {
  id: 'glass-dark',
  name: 'Glass Dark',
  description: 'Dark glassmorphism with blur effects',
  category: 'glass',
  
  container: {
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(16px)',
  },
  
  card: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(12px)',
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    accent: '#3b82f6',
    heading: {
      fontWeight: '700',
      letterSpacing: '0.05em',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
    },
  },
  
  accent: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    highlight: '#fbbf24',
    danger: '#ef4444',
    success: '#22c55e',
  },
  
  divider: {
    color: 'rgba(255, 255, 255, 0.2)',
    style: 'solid',
    width: '1px',
  },
  
  effects: {
    glow: '0 0 20px rgba(59, 130, 246, 0.5)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
  },
};

export const GLASS_LIGHT: DesignTheme = {
  id: 'glass-light',
  name: 'Glass Light',
  description: 'Light glassmorphism with soft blur',
  category: 'glass',
  
  container: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(16px)',
  },
  
  card: {
    background: 'rgba(255, 255, 255, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '8px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(12px)',
  },
  
  text: {
    primary: '#1f2937',
    secondary: 'rgba(31, 41, 55, 0.7)',
    accent: '#2563eb',
    heading: {
      fontWeight: '700',
      letterSpacing: '0.02em',
      textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
    },
  },
  
  accent: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    highlight: '#f59e0b',
    danger: '#dc2626',
    success: '#16a34a',
  },
  
  divider: {
    color: 'rgba(0, 0, 0, 0.1)',
    style: 'solid',
    width: '1px',
  },
  
  effects: {
    glow: '0 0 20px rgba(37, 99, 235, 0.3)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%)',
    gradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
  },
};

// ============================================================================
// FLAT THEMES
// ============================================================================

export const FLAT_DARK: DesignTheme = {
  id: 'flat-dark',
  name: 'Flat Dark',
  description: 'Clean solid dark design',
  category: 'flat',
  
  container: {
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
  
  card: {
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    accent: '#60a5fa',
    heading: {
      fontWeight: '600',
      letterSpacing: '0.02em',
    },
  },
  
  accent: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    highlight: '#facc15',
    danger: '#ef4444',
    success: '#22c55e',
  },
  
  divider: {
    color: '#3f3f46',
    style: 'solid',
    width: '1px',
  },
  
  effects: {},
};

export const FLAT_LIGHT: DesignTheme = {
  id: 'flat-light',
  name: 'Flat Light',
  description: 'Clean solid light design',
  category: 'flat',
  
  container: {
    background: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  
  card: {
    background: '#f4f4f5',
    border: '1px solid #e4e4e7',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  
  text: {
    primary: '#18181b',
    secondary: '#71717a',
    accent: '#2563eb',
    heading: {
      fontWeight: '600',
      letterSpacing: '0.02em',
    },
  },
  
  accent: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    highlight: '#eab308',
    danger: '#dc2626',
    success: '#16a34a',
  },
  
  divider: {
    color: '#e4e4e7',
    style: 'solid',
    width: '1px',
  },
  
  effects: {},
};

// ============================================================================
// SPORTS THEMES
// ============================================================================

export const SPORTS_RED: DesignTheme = {
  id: 'sports-red',
  name: 'Sports Red',
  description: 'Bold sports theme with red accents',
  category: 'sports',
  
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid rgba(220, 38, 38, 0.5)',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)',
    backdropFilter: 'blur(12px)',
  },
  
  card: {
    background: 'rgba(0, 0, 0, 0.6)',
    border: '2px solid rgba(220, 38, 38, 0.4)',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    accent: '#dc2626',
    heading: {
      fontWeight: '900',
      letterSpacing: '0.1em',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
    },
  },
  
  accent: {
    primary: '#dc2626',
    secondary: '#fbbf24',
    highlight: '#ffffff',
    danger: '#ef4444',
    success: '#22c55e',
  },
  
  divider: {
    color: 'rgba(220, 38, 38, 0.5)',
    style: 'gradient',
    width: '2px',
  },
  
  effects: {
    glow: '0 0 30px rgba(220, 38, 38, 0.6)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(220, 38, 38, 0.4) 50%, transparent 100%)',
  },
};

export const SPORTS_BLUE: DesignTheme = {
  id: 'sports-blue',
  name: 'Sports Blue',
  description: 'Bold sports theme with blue accents',
  category: 'sports',
  
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid rgba(37, 99, 235, 0.5)',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(37, 99, 235, 0.3)',
    backdropFilter: 'blur(12px)',
  },
  
  card: {
    background: 'rgba(0, 0, 0, 0.6)',
    border: '2px solid rgba(37, 99, 235, 0.4)',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    accent: '#2563eb',
    heading: {
      fontWeight: '900',
      letterSpacing: '0.1em',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
    },
  },
  
  accent: {
    primary: '#2563eb',
    secondary: '#fbbf24',
    highlight: '#ffffff',
    danger: '#ef4444',
    success: '#22c55e',
  },
  
  divider: {
    color: 'rgba(37, 99, 235, 0.5)',
    style: 'gradient',
    width: '2px',
  },
  
  effects: {
    glow: '0 0 30px rgba(37, 99, 235, 0.6)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.4) 50%, transparent 100%)',
  },
};

// ============================================================================
// NEWS THEMES
// ============================================================================

export const NEWS_BREAKING: DesignTheme = {
  id: 'news-breaking',
  name: 'Breaking News',
  description: 'High-impact breaking news theme',
  category: 'news',
  
  container: {
    background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1b2a 100%)',
    border: '2px solid rgba(239, 68, 68, 0.6)',
    borderRadius: '0',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  
  card: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.9)',
    accent: '#ef4444',
    heading: {
      fontWeight: '800',
      letterSpacing: '0.15em',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    },
  },
  
  accent: {
    primary: '#ef4444',
    secondary: '#f97316',
    highlight: '#fbbf24',
    danger: '#dc2626',
    success: '#22c55e',
  },
  
  divider: {
    color: 'rgba(239, 68, 68, 0.6)',
    style: 'glow',
    width: '2px',
  },
  
  effects: {
    glow: '0 0 20px rgba(239, 68, 68, 0.5)',
  },
};

export const NEWS_STANDARD: DesignTheme = {
  id: 'news-standard',
  name: 'News Standard',
  description: 'Professional news broadcast theme',
  category: 'news',
  
  container: {
    background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1b2a 100%)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    borderRadius: '0',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  
  card: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.85)',
    accent: '#3b82f6',
    heading: {
      fontWeight: '700',
      letterSpacing: '0.08em',
    },
  },
  
  accent: {
    primary: '#3b82f6',
    secondary: '#60a5fa',
    highlight: '#fbbf24',
    danger: '#ef4444',
    success: '#22c55e',
  },
  
  divider: {
    color: 'rgba(59, 130, 246, 0.4)',
    style: 'solid',
    width: '1px',
  },
  
  effects: {
    gradient: 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, transparent 100%)',
  },
};

// ============================================================================
// NEON THEMES
// ============================================================================

export const NEON_CYBER: DesignTheme = {
  id: 'neon-cyber',
  name: 'Cyberpunk Neon',
  description: 'Futuristic neon cyberpunk style',
  category: 'neon',
  
  container: {
    background: 'rgba(0, 0, 0, 0.9)',
    border: '2px solid #00ffff',
    borderRadius: '4px',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 30px rgba(0, 255, 255, 0.1)',
  },
  
  card: {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.4)',
    borderRadius: '2px',
    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
  },
  
  text: {
    primary: '#00ffff',
    secondary: 'rgba(0, 255, 255, 0.7)',
    accent: '#ff00ff',
    heading: {
      fontWeight: '700',
      letterSpacing: '0.2em',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.5)',
    },
  },
  
  accent: {
    primary: '#00ffff',
    secondary: '#ff00ff',
    highlight: '#ffff00',
    danger: '#ff0044',
    success: '#00ff88',
  },
  
  divider: {
    color: '#00ffff',
    style: 'glow',
    width: '2px',
  },
  
  effects: {
    glow: '0 0 30px rgba(0, 255, 255, 0.8)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.3) 50%, transparent 100%)',
  },
};

// ============================================================================
// CORPORATE THEMES
// ============================================================================

export const CORPORATE_PROFESSIONAL: DesignTheme = {
  id: 'corporate-professional',
  name: 'Corporate Professional',
  description: 'Clean professional corporate style',
  category: 'corporate',
  
  container: {
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  
  card: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    accent: '#2563eb',
    heading: {
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
  },
  
  accent: {
    primary: '#2563eb',
    secondary: '#4f46e5',
    highlight: '#f59e0b',
    danger: '#dc2626',
    success: '#059669',
  },
  
  divider: {
    color: '#e5e7eb',
    style: 'solid',
    width: '1px',
  },
  
  effects: {},
};

// ============================================================================
// ALL THEMES
// ============================================================================

export const ALL_THEMES: DesignTheme[] = [
  GLASS_DARK,
  GLASS_LIGHT,
  FLAT_DARK,
  FLAT_LIGHT,
  SPORTS_RED,
  SPORTS_BLUE,
  NEWS_BREAKING,
  NEWS_STANDARD,
  NEON_CYBER,
  CORPORATE_PROFESSIONAL,
];

export const THEMES_MAP: Record<string, DesignTheme> = Object.fromEntries(
  ALL_THEMES.map(theme => [theme.id, theme])
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a theme by ID
 */
export function getTheme(id: string): DesignTheme | undefined {
  return THEMES_MAP[id];
}

/**
 * Get themes by category
 */
export function getThemesByCategory(category: DesignTheme['category']): DesignTheme[] {
  return ALL_THEMES.filter(t => t.category === category);
}

/**
 * Apply theme styles to an element
 */
export function applyThemeToElement(
  theme: DesignTheme,
  elementType: 'container' | 'card' | 'text'
): React.CSSProperties {
  switch (elementType) {
    case 'container':
      return {
        background: theme.container.background,
        border: theme.container.border,
        borderRadius: theme.container.borderRadius,
        boxShadow: theme.container.boxShadow,
        backdropFilter: theme.container.backdropFilter,
        WebkitBackdropFilter: theme.container.backdropFilter,
      };
    case 'card':
      return {
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.borderRadius,
        boxShadow: theme.card.boxShadow,
        backdropFilter: theme.card.backdropFilter,
        WebkitBackdropFilter: theme.card.backdropFilter,
      };
    case 'text':
      return {
        color: theme.text.primary,
      };
    default:
      return {};
  }
}

/**
 * Generate CSS variables for a theme
 */
export function generateThemeVariables(theme: DesignTheme): Record<string, string> {
  return {
    '--theme-bg': theme.container.background,
    '--theme-border': theme.container.border,
    '--theme-radius': theme.container.borderRadius,
    '--theme-shadow': theme.container.boxShadow,
    '--theme-text-primary': theme.text.primary,
    '--theme-text-secondary': theme.text.secondary,
    '--theme-text-accent': theme.text.accent,
    '--theme-accent-primary': theme.accent.primary,
    '--theme-accent-secondary': theme.accent.secondary,
    '--theme-accent-highlight': theme.accent.highlight,
    '--theme-divider': theme.divider.color,
  };
}








