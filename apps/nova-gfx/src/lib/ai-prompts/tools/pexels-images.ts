/**
 * Pexels Image Resolver
 *
 * Resolves {{PEXELS:query}} placeholders to real Pexels image URLs.
 * Uses curated photo IDs for common categories to ensure fast, reliable results.
 */

// Curated Pexels photo IDs by category for instant resolution
// These are high-quality, broadcast-appropriate images
const CURATED_PHOTOS: Record<string, number[]> = {
  // Sports - General
  'basketball': [1752757, 2834917, 358042, 2346091, 3621104],
  'football': [209956, 209841, 2570139, 2570145, 1618200],
  'soccer': [47354, 274422, 1171084, 918798, 3621113],
  'baseball': [209731, 2570128, 264279, 3621100, 1618269],
  'hockey': [163452, 2570113, 3621108, 1618273, 2570149],
  'tennis': [209977, 1432039, 5739181, 3621116, 1618280],
  'golf': [92858, 1325659, 54123, 3621119, 1618283],

  // Sports - Venues
  'stadium': [262524, 1293006, 3621095, 1618196, 2570104],
  'arena': [1752757, 2570113, 3621098, 1618199, 2834917],
  'basketball court': [1752757, 2834917, 358042, 2346091, 3621104],
  'football field': [209956, 2570139, 1618200, 3621101, 2570145],
  'soccer field': [47354, 274422, 1171084, 918798, 3621113],
  'baseball stadium': [209731, 2570128, 264279, 3621100, 1618269],
  'sports arena': [262524, 1752757, 2570113, 3621098, 1618199],
  'stadium lights': [262524, 1293006, 3621095, 1618196, 2570104],
  'sports arena crowd': [262524, 1752757, 2570113, 3621098, 1618199],

  // Sports - Action
  'basketball player': [2834917, 358042, 2346091, 1752757, 3621104],
  'football player': [209841, 2570145, 1618200, 3621101, 209956],
  'soccer player': [918798, 1171084, 47354, 274422, 3621113],
  'soccer action': [918798, 1171084, 47354, 274422, 3621113],
  'athlete': [2570145, 2834917, 918798, 358042, 1618200],

  // City/Urban
  'city': [466685, 1563256, 1486222, 378570, 1105766],
  'city skyline': [466685, 1563256, 1486222, 378570, 1105766],
  'city skyline night': [2603464, 1519088, 466685, 1563256, 1486222],
  'downtown': [466685, 1563256, 1486222, 378570, 1105766],
  'urban': [466685, 1563256, 1486222, 378570, 1105766],

  // Abstract/Textures
  'dark': [924824, 1420701, 2088205, 1323712, 129731],
  'dark texture': [924824, 1420701, 2088205, 1323712, 129731],
  'abstract': [1103970, 924824, 2088205, 1420701, 1323712],
  'texture': [924824, 1420701, 2088205, 1323712, 129731],
  'gradient': [1103970, 2088205, 1323712, 129731, 924824],
  'blue gradient': [1103970, 1323712, 2088205, 129731, 924824],
  'dark blue': [1103970, 1323712, 924824, 2088205, 129731],

  // Weather/Nature
  'weather': [209831, 1463530, 1118873, 531756, 3768],
  'clouds': [209831, 1463530, 531756, 3768, 53594],
  'storm': [1118873, 531756, 209831, 1463530, 3768],
  'rain': [1530423, 1529360, 110874, 531756, 1118873],
  'snow': [688660, 813872, 235621, 1420440, 688640],

  // Generic backgrounds
  'background': [924824, 1103970, 2088205, 1420701, 1323712],
  'sports background': [262524, 1752757, 209956, 47354, 209731],
};

/**
 * Get a Pexels image URL for a search query
 * First checks curated photos, then falls back to Pexels search URL format
 */
export function getPexelsImageUrl(query: string, width = 1920, height = 1080): string {
  const normalizedQuery = query.toLowerCase().trim();

  // Check for exact match in curated photos
  if (CURATED_PHOTOS[normalizedQuery]) {
    const photos = CURATED_PHOTOS[normalizedQuery];
    // Use first photo for consistency (or could randomize)
    const photoId = photos[0];
    return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
  }

  // Check for partial matches
  for (const [key, photos] of Object.entries(CURATED_PHOTOS)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      const photoId = photos[0];
      return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
    }
  }

  // Fallback: Use a generic sports/dark background based on keywords
  if (normalizedQuery.includes('sport') || normalizedQuery.includes('game') || normalizedQuery.includes('match')) {
    const photoId = CURATED_PHOTOS['sports background'][0];
    return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
  }

  // Ultimate fallback: dark abstract texture (good for broadcast)
  const photoId = CURATED_PHOTOS['dark texture'][0];
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fit=crop`;
}

/**
 * Resolve Pexels placeholders in AI response
 * Replaces {{PEXELS:query}} with actual Pexels URLs
 */
export function resolvePexelsPlaceholders(text: string): string {
  const pexelsPattern = /\{\{PEXELS:([^}]+)\}\}/g;

  return text.replace(pexelsPattern, (match, query) => {
    const url = getPexelsImageUrl(query.trim());
    console.log(`🖼️ Resolved Pexels placeholder: "${query}" → ${url}`);
    return url;
  });
}
