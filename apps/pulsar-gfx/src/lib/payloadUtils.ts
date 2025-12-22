/**
 * Utility functions for handling page payload data
 */

// FillData interface matching the one in ContentEditor
interface FillData {
  fillType: 'solid' | 'gradient' | 'texture';
  color?: string;
  gradient?: {
    enabled: boolean;
    type: 'linear' | 'radial' | 'conic';
    direction: number;
    colors: Array<{ color: string; stop: number }>;
  };
  texture?: {
    enabled: boolean;
    url: string;
    thumbnailUrl?: string;
    mediaType?: 'image' | 'video';
    fit: 'cover' | 'contain' | 'fill' | 'tile';
    scale: number;
    position?: { x: number; y: number };
    rotation?: number;
    opacity: number;
    blur?: number;
    blendMode: string;
    playbackMode?: 'loop' | 'pingpong' | 'once';
    playbackSpeed?: number;
  };
}

/**
 * Check if a value is a FillData object
 */
function isFillData(value: unknown): value is FillData {
  return (
    value !== null &&
    typeof value === 'object' &&
    'fillType' in value &&
    ['solid', 'gradient', 'texture'].includes((value as FillData).fillType)
  );
}

/**
 * Convert a FillData object to JSON string format that Nova GFX expects
 * Nova GFX preview expects JSON strings for shape fill overrides, not raw objects
 */
function convertFillDataToJson(fillData: FillData): string {
  if (fillData.fillType === 'solid') {
    return JSON.stringify({
      fill: fillData.color,
      gradient: { enabled: false },
      texture: { enabled: false },
    });
  } else if (fillData.fillType === 'gradient' && fillData.gradient) {
    return JSON.stringify({
      gradient: fillData.gradient,
      texture: { enabled: false },
    });
  } else if (fillData.fillType === 'texture' && fillData.texture) {
    return JSON.stringify({
      texture: fillData.texture,
      gradient: { enabled: false },
    });
  }
  // Fallback - stringify the whole object
  return JSON.stringify(fillData);
}

/**
 * Convert FillData objects in a payload to JSON strings for Nova GFX
 *
 * When pages are saved, FillData objects are stored as-is in the payload.
 * Nova GFX preview expects these to be JSON strings (starting with '{')
 * so it can parse and apply them to shape elements.
 *
 * This function converts any FillData objects found in the payload
 * to their JSON string equivalents.
 *
 * @param payload - The page payload potentially containing FillData objects
 * @returns A new payload with FillData objects converted to JSON strings
 */
export function convertPayloadForNovaGfx(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const convertedPayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (isFillData(value)) {
      // Convert FillData object to JSON string format
      convertedPayload[key] = convertFillDataToJson(value);
    } else {
      // Keep other values as-is
      convertedPayload[key] = value;
    }
  }

  return convertedPayload;
}
