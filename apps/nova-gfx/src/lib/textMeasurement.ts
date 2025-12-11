/**
 * Text Measurement Utility
 *
 * Uses Canvas TextMetrics API with actualBoundingBox properties
 * to measure the actual rendered bounds of text characters.
 * This gives a tight bounding box around the text itself,
 * not the text element container.
 */

import FontFaceObserver from 'fontfaceobserver';

export interface TextBounds {
  width: number;
  height: number;
  ascent: number;
  descent: number;
  left: number;
  right: number;
}

// Cache for font load promises to avoid redundant loading
const fontLoadCache = new Map<string, Promise<void>>();

/**
 * Ensures a font is loaded before measuring text
 */
async function ensureFontLoaded(
  fontFamily: string,
  fontWeight: number | string = 400,
  fontStyle: string = 'normal'
): Promise<void> {
  // Clean up font family name (remove quotes if present)
  const cleanFontFamily = fontFamily.replace(/['"]/g, '').trim();
  const cacheKey = `${cleanFontFamily}-${fontWeight}-${fontStyle}`;

  if (!fontLoadCache.has(cacheKey)) {
    const observer = new FontFaceObserver(cleanFontFamily, {
      weight: fontWeight,
      style: fontStyle,
    });

    const promise = observer.load(null, 5000).catch((err) => {
      console.warn(`Font ${cleanFontFamily} failed to load:`, err);
      // Don't throw - we'll measure with fallback font
    });

    fontLoadCache.set(cacheKey, promise);
  }

  return fontLoadCache.get(cacheKey)!;
}

/**
 * Parse font weight from CSS value
 */
function parseFontWeight(weight: string | number | undefined): number | string {
  if (weight === undefined) return 400;
  if (typeof weight === 'number') return weight;

  const weightMap: Record<string, number> = {
    'thin': 100,
    'extralight': 200,
    'light': 300,
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700,
    'extrabold': 800,
    'black': 900,
  };

  const normalized = weight.toLowerCase().replace(/[-_\s]/g, '');
  return weightMap[normalized] || parseInt(weight, 10) || 400;
}

/**
 * Parse font size from CSS value (returns number in pixels)
 */
function parseFontSize(size: string | number | undefined): number {
  if (size === undefined) return 16;
  if (typeof size === 'number') return size;

  // Handle px values
  if (size.endsWith('px')) {
    return parseFloat(size);
  }

  // Handle pt values (1pt = 1.333px approximately)
  if (size.endsWith('pt')) {
    return parseFloat(size) * 1.333;
  }

  // Handle em/rem (assume 16px base)
  if (size.endsWith('em') || size.endsWith('rem')) {
    return parseFloat(size) * 16;
  }

  return parseFloat(size) || 16;
}

/**
 * Measures the actual bounds of text characters using Canvas TextMetrics API.
 * This provides a tight bounding box around the rendered text.
 */
export async function measureTextBounds(
  text: string,
  fontSize: number | string,
  fontFamily: string,
  fontWeight: number | string = 400,
  fontStyle: string = 'normal'
): Promise<TextBounds> {
  const sizeInPx = parseFontSize(fontSize);
  const weight = parseFontWeight(fontWeight);

  // Ensure font is loaded first
  await ensureFontLoaded(fontFamily, weight, fontStyle);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Clean up font family name
  const cleanFontFamily = fontFamily.replace(/['"]/g, '').trim();

  // Build font string (CSS shorthand: style weight size family)
  const fontString = `${fontStyle} ${weight} ${sizeInPx}px "${cleanFontFamily}"`;
  ctx.font = fontString;

  const metrics = ctx.measureText(text);

  // Use actualBoundingBox for precise measurements
  // These give the tight bounds around the actual rendered glyphs
  const width = Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight);
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  return {
    width: Math.ceil(width), // Round up to avoid clipping
    height: Math.ceil(height),
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent,
    left: metrics.actualBoundingBoxLeft,
    right: metrics.actualBoundingBoxRight,
  };
}

/**
 * Measures multi-line text bounds, handling word wrapping
 */
export async function measureMultilineTextBounds(
  text: string,
  fontSize: number | string,
  fontFamily: string,
  maxWidth: number,
  fontWeight: number | string = 400,
  fontStyle: string = 'normal',
  lineHeight: number = 1.2
): Promise<{ width: number; height: number; lines: string[] }> {
  const sizeInPx = parseFontSize(fontSize);
  const weight = parseFontWeight(fontWeight);

  await ensureFontLoaded(fontFamily, weight, fontStyle);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const cleanFontFamily = fontFamily.replace(/['"]/g, '').trim();
  const fontString = `${fontStyle} ${weight} ${sizeInPx}px "${cleanFontFamily}"`;
  ctx.font = fontString;

  // Split by newlines first
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  let maxLineWidth = 0;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      const testWidth = Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight);

      if (testWidth > maxWidth && currentLine) {
        // Current line is full, push it
        const lineMetrics = ctx.measureText(currentLine);
        const lineWidth = Math.abs(lineMetrics.actualBoundingBoxLeft) + Math.abs(lineMetrics.actualBoundingBoxRight);
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    // Don't forget the last line of the paragraph
    if (currentLine) {
      const lineMetrics = ctx.measureText(currentLine);
      const lineWidth = Math.abs(lineMetrics.actualBoundingBoxLeft) + Math.abs(lineMetrics.actualBoundingBoxRight);
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      lines.push(currentLine);
    }
  }

  const lineHeightPx = sizeInPx * lineHeight;
  const totalHeight = lines.length * lineHeightPx;

  return {
    width: Math.ceil(maxLineWidth),
    height: Math.ceil(totalHeight),
    lines,
  };
}

/**
 * Synchronous measurement that uses cached font state.
 * Use this when you know the font is already loaded.
 * Falls back to best-effort measurement if font isn't ready.
 */
export function measureTextBoundsSync(
  text: string,
  fontSize: number | string,
  fontFamily: string,
  fontWeight: number | string = 400,
  fontStyle: string = 'normal'
): TextBounds {
  const sizeInPx = parseFontSize(fontSize);
  const weight = parseFontWeight(fontWeight);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const cleanFontFamily = fontFamily.replace(/['"]/g, '').trim();
  const fontString = `${fontStyle} ${weight} ${sizeInPx}px "${cleanFontFamily}"`;
  ctx.font = fontString;

  const metrics = ctx.measureText(text);

  const width = Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight);
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent,
    left: metrics.actualBoundingBoxLeft,
    right: metrics.actualBoundingBoxRight,
  };
}
