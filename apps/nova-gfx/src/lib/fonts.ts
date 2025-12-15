// Font Library
// Supports Google Fonts and Bunny Fonts (privacy-focused alternative with 1,500+ fonts)

export interface Font {
  family: string;
  label: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  weights: number[];
  variable?: boolean;
  popularity?: number;
  source?: 'google' | 'bunny' | 'system';
}

// Font provider configuration
export type FontProvider = 'google' | 'bunny';

let currentProvider: FontProvider = 'bunny'; // Default to Bunny for privacy

export function setFontProvider(provider: FontProvider): void {
  currentProvider = provider;
}

export function getFontProvider(): FontProvider {
  return currentProvider;
}

// Category mapping from font APIs
const CATEGORY_MAP: Record<string, Font['category']> = {
  'sans-serif': 'sans-serif',
  'serif': 'serif',
  'display': 'display',
  'monospace': 'monospace',
  'handwriting': 'handwriting',
};

// Cache for fetched fonts
let fontsCache: Font[] | null = null;
let fetchPromise: Promise<Font[]> | null = null;

// Fetch all fonts from Bunny Fonts API (1,500+ fonts)
export async function fetchAllFonts(): Promise<Font[]> {
  if (fontsCache) {
    return fontsCache;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      // Bunny Fonts has a public API that lists all available fonts
      const response = await fetch('https://fonts.bunny.net/list');

      if (!response.ok) {
        console.warn('Failed to fetch Bunny Fonts, using fallback');
        return POPULAR_FONTS;
      }

      const data: Record<string, {
        familyName: string;
        category: string;
        weights: number[];
        styles: string[];
        defSubset: string;
        variable: boolean;
      }> = await response.json();

      const fonts: Font[] = Object.entries(data).map(([id, item], index) => {
        return {
          family: item.familyName,
          label: item.familyName,
          category: CATEGORY_MAP[item.category] || 'sans-serif',
          weights: item.weights.length > 0 ? item.weights.sort((a, b) => a - b) : [400],
          variable: item.variable,
          popularity: index,
          source: 'bunny' as const,
        };
      });

      // Sort by family name for consistent ordering
      fonts.sort((a, b) => a.family.localeCompare(b.family));

      fontsCache = fonts;
      return fonts;
    } catch (error) {
      console.warn('Error fetching fonts:', error);
      return POPULAR_FONTS;
    }
  })();

  return fetchPromise;
}

// Curated popular fonts (fallback and initial display)
export const POPULAR_FONTS: Font[] = [
  // Sans-serif (most common for broadcast)
  { family: 'Inter', label: 'Inter', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 0 },
  { family: 'Roboto', label: 'Roboto', category: 'sans-serif', weights: [300, 400, 500, 700, 900], popularity: 1 },
  { family: 'Open Sans', label: 'Open Sans', category: 'sans-serif', weights: [300, 400, 600, 700, 800], popularity: 2 },
  { family: 'Lato', label: 'Lato', category: 'sans-serif', weights: [300, 400, 700, 900], popularity: 3 },
  { family: 'Montserrat', label: 'Montserrat', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 4 },
  { family: 'Poppins', label: 'Poppins', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 5 },
  { family: 'Source Sans Pro', label: 'Source Sans Pro', category: 'sans-serif', weights: [300, 400, 600, 700, 900], popularity: 6 },
  { family: 'Nunito', label: 'Nunito', category: 'sans-serif', weights: [300, 400, 600, 700, 800, 900], popularity: 7 },
  { family: 'Raleway', label: 'Raleway', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 8 },
  { family: 'Ubuntu', label: 'Ubuntu', category: 'sans-serif', weights: [300, 400, 500, 700], popularity: 9 },
  { family: 'Work Sans', label: 'Work Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 10 },
  { family: 'DM Sans', label: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700], popularity: 11 },
  { family: 'Manrope', label: 'Manrope', category: 'sans-serif', weights: [400, 500, 600, 700, 800], popularity: 12 },
  { family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans-serif', weights: [400, 500, 600, 700, 800], popularity: 13 },

  // Display/Bold (great for headlines)
  { family: 'Bebas Neue', label: 'Bebas Neue', category: 'display', weights: [400], popularity: 14 },
  { family: 'Oswald', label: 'Oswald', category: 'display', weights: [300, 400, 500, 600, 700], popularity: 15 },
  { family: 'Barlow Condensed', label: 'Barlow Condensed', category: 'display', weights: [400, 500, 600, 700, 800, 900], popularity: 16 },
  { family: 'Roboto Condensed', label: 'Roboto Condensed', category: 'display', weights: [300, 400, 700], popularity: 17 },
  { family: 'Anton', label: 'Anton', category: 'display', weights: [400], popularity: 18 },
  { family: 'Bungee', label: 'Bungee', category: 'display', weights: [400], popularity: 19 },
  { family: 'Righteous', label: 'Righteous', category: 'display', weights: [400], popularity: 20 },
  { family: 'Fredoka One', label: 'Fredoka One', category: 'display', weights: [400], popularity: 21 },
  { family: 'Black Ops One', label: 'Black Ops One', category: 'display', weights: [400], popularity: 22 },
  { family: 'Russo One', label: 'Russo One', category: 'display', weights: [400], popularity: 23 },

  // Serif (elegant, formal)
  { family: 'Playfair Display', label: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900], popularity: 24 },
  { family: 'Merriweather', label: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900], popularity: 25 },
  { family: 'Lora', label: 'Lora', category: 'serif', weights: [400, 500, 600, 700], popularity: 26 },
  { family: 'Crimson Text', label: 'Crimson Text', category: 'serif', weights: [400, 600, 700], popularity: 27 },
  { family: 'PT Serif', label: 'PT Serif', category: 'serif', weights: [400, 700], popularity: 28 },

  // Monospace (technical, code)
  { family: 'Roboto Mono', label: 'Roboto Mono', category: 'monospace', weights: [300, 400, 500, 700], popularity: 29 },
  { family: 'Source Code Pro', label: 'Source Code Pro', category: 'monospace', weights: [300, 400, 500, 600, 700, 900], popularity: 30 },
  { family: 'Fira Code', label: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700], popularity: 31 },
  { family: 'Space Mono', label: 'Space Mono', category: 'monospace', weights: [400, 700], popularity: 32 },
  { family: 'Courier Prime', label: 'Courier Prime', category: 'monospace', weights: [400, 700], popularity: 33 },

  // Handwriting/Script (casual, friendly)
  { family: 'Dancing Script', label: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700], popularity: 34 },
  { family: 'Pacifico', label: 'Pacifico', category: 'handwriting', weights: [400], popularity: 35 },
  { family: 'Caveat', label: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700], popularity: 36 },
  { family: 'Kalam', label: 'Kalam', category: 'handwriting', weights: [300, 400, 700], popularity: 37 },

  // Modern/Geometric
  { family: 'Space Grotesk', label: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700], popularity: 38 },
  { family: 'Outfit', label: 'Outfit', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 39 },
  { family: 'Sora', label: 'Sora', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800], popularity: 40 },
  { family: 'Epilogue', label: 'Epilogue', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 41 },
  { family: 'Figtree', label: 'Figtree', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], popularity: 42 },
];

// System fonts (no loading required)
export const SYSTEM_FONTS: Font[] = [
  { family: 'Arial', label: 'Arial', category: 'sans-serif', weights: [400, 700], source: 'system' },
  { family: 'Helvetica', label: 'Helvetica', category: 'sans-serif', weights: [400, 700], source: 'system' },
  { family: 'Times New Roman', label: 'Times New Roman', category: 'serif', weights: [400, 700], source: 'system' },
  { family: 'Georgia', label: 'Georgia', category: 'serif', weights: [400, 700], source: 'system' },
  { family: 'Verdana', label: 'Verdana', category: 'sans-serif', weights: [400, 700], source: 'system' },
  { family: 'Courier New', label: 'Courier New', category: 'monospace', weights: [400, 700], source: 'system' },
  { family: 'Impact', label: 'Impact', category: 'display', weights: [400], source: 'system' },
  { family: 'Comic Sans MS', label: 'Comic Sans MS', category: 'handwriting', weights: [400], source: 'system' },
];

// All fonts combined (initially just popular + system, will include fetched fonts)
export const ALL_FONTS = [...SYSTEM_FONTS, ...POPULAR_FONTS];

// Get font by family name
export function getFont(family: string): Font | undefined {
  // First check cache if available
  if (fontsCache) {
    const cachedFont = fontsCache.find(f => f.family === family);
    if (cachedFont) return cachedFont;
  }
  return ALL_FONTS.find(f => f.family === family);
}

// Generate font URL based on current provider
export function generateFontUrl(fonts: string[], weights?: number[]): string {
  if (fonts.length === 0) return '';

  const provider = getFontProvider();

  if (provider === 'bunny') {
    // Bunny Fonts URL format
    const families = fonts.map(family => {
      const font = getFont(family);
      const fontWeights = weights || font?.weights || [400];
      return `${encodeURIComponent(family)}:wght@${fontWeights.join(';')}`;
    });
    return `https://fonts.bunny.net/css?family=${families.join('|')}&display=swap`;
  } else {
    // Google Fonts URL format
    const families = fonts.map(family => {
      const font = getFont(family);
      const fontWeights = weights || font?.weights || [400];
      return `family=${encodeURIComponent(family)}:wght@${fontWeights.join(';')}`;
    });
    return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
  }
}

// Load a font dynamically
export function loadFont(fontFamily: string): void {
  try {
    if (typeof document === 'undefined') return;

    // Skip system fonts
    const systemFont = SYSTEM_FONTS.find(f => f.family === fontFamily);
    if (systemFont) return;

    // Check if already loaded
    const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
    if (existingLink) return;

    // Create link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = generateFontUrl([fontFamily]);
    link.setAttribute('data-font', fontFamily);
    document.head.appendChild(link);
  } catch (error) {
    console.warn('Failed to load font:', fontFamily, error);
  }
}

// Load multiple fonts
export function loadFonts(fontFamilies: string[]): void {
  try {
    if (typeof document === 'undefined') return;

    // Filter out system fonts
    const webFonts = fontFamilies.filter(f => !SYSTEM_FONTS.some(sf => sf.family === f));
    if (webFonts.length === 0) return;

    // Check if already loaded
    const cacheKey = webFonts.sort().join(',');
    const existingLink = document.querySelector(`link[data-fonts="${cacheKey}"]`);
    if (existingLink) return;

    // Create link element for all fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = generateFontUrl(webFonts);
    link.setAttribute('data-fonts', cacheKey);
    document.head.appendChild(link);
  } catch (error) {
    console.warn('Failed to load fonts:', fontFamilies, error);
  }
}

// Get fonts by category
export function getFontsByCategory(category: Font['category']): Font[] {
  if (fontsCache) {
    return fontsCache.filter(f => f.category === category);
  }
  return ALL_FONTS.filter(f => f.category === category);
}

// Search fonts by name
export function searchFonts(query: string, fonts?: Font[]): Font[] {
  const searchIn = fonts || fontsCache || ALL_FONTS;
  const lowerQuery = query.toLowerCase();
  return searchIn.filter(f =>
    f.family.toLowerCase().includes(lowerQuery) ||
    f.label.toLowerCase().includes(lowerQuery)
  );
}

// Get total font count
export function getFontCount(): number {
  return fontsCache?.length || POPULAR_FONTS.length;
}
