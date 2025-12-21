// Weather icon libraries integration
// Local weather icons served from public/icons/weather/
// react-animated-weather is the default animated library

export type WeatherIconLibrary = 'animated' | 'meteocons' | 'weather-icons' | 'basicons';

// ============================================================
// WEATHER API ICON MAPPINGS (User-customizable)
// ============================================================

// Default mappings from weather API icon strings to our animated icons
// These can be customized by users in the icon picker
export const DEFAULT_WEATHER_MAPPINGS: Record<string, string> = {
  // Clear/Sunny conditions
  'sunny': 'animated-clear-day',
  'clear': 'animated-clear-day',
  'fair': 'animated-clear-day',
  // Cloudy conditions
  'partly cloudy': 'animated-partly-cloudy-day',
  'mostly cloudy': 'animated-cloudy',
  'cloudy': 'animated-cloudy',
  'overcast': 'animated-cloudy',
  // Fog/Mist/Haze
  'fog': 'animated-fog',
  'mist': 'animated-fog',
  'haze': 'animated-fog',
  // Rain
  'rain': 'animated-rain',
  'showers': 'animated-rain',
  'drizzle': 'animated-rain',
  'thunderstorm': 'animated-rain',
  // Snow
  'snow': 'animated-snow',
  'flurries': 'animated-snow',
  'blizzard': 'animated-snow',
  'sleet': 'animated-sleet',
  // Wind
  'wind': 'animated-wind',
  'windy': 'animated-wind',
  'breezy': 'animated-wind',
};

// LocalStorage key for custom mappings
const WEATHER_MAPPINGS_STORAGE_KEY = 'nova-gfx-weather-icon-mappings';

/**
 * Get the current weather icon mappings (user customizations merged with defaults)
 */
export function getWeatherMappings(): Record<string, string> {
  try {
    const stored = localStorage.getItem(WEATHER_MAPPINGS_STORAGE_KEY);
    if (stored) {
      const customMappings = JSON.parse(stored);
      return { ...DEFAULT_WEATHER_MAPPINGS, ...customMappings };
    }
  } catch (e) {
    console.warn('Failed to load custom weather mappings:', e);
  }
  return { ...DEFAULT_WEATHER_MAPPINGS };
}

/**
 * Save a custom weather icon mapping
 */
export function setWeatherMapping(apiIcon: string, animatedIconName: string): void {
  try {
    const stored = localStorage.getItem(WEATHER_MAPPINGS_STORAGE_KEY);
    const customMappings = stored ? JSON.parse(stored) : {};
    customMappings[apiIcon.toLowerCase()] = animatedIconName;
    localStorage.setItem(WEATHER_MAPPINGS_STORAGE_KEY, JSON.stringify(customMappings));
  } catch (e) {
    console.warn('Failed to save weather mapping:', e);
  }
}

/**
 * Add a new weather mapping
 */
export function addWeatherMapping(apiIcon: string, animatedIconName: string): void {
  setWeatherMapping(apiIcon.toLowerCase(), animatedIconName);
}

/**
 * Remove a custom weather mapping (reverts to default if available)
 */
export function removeWeatherMapping(apiIcon: string): void {
  try {
    const stored = localStorage.getItem(WEATHER_MAPPINGS_STORAGE_KEY);
    if (stored) {
      const customMappings = JSON.parse(stored);
      delete customMappings[apiIcon.toLowerCase()];
      localStorage.setItem(WEATHER_MAPPINGS_STORAGE_KEY, JSON.stringify(customMappings));
    }
  } catch (e) {
    console.warn('Failed to remove weather mapping:', e);
  }
}

/**
 * Reset all custom mappings to defaults
 */
export function resetWeatherMappings(): void {
  try {
    localStorage.removeItem(WEATHER_MAPPINGS_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to reset weather mappings:', e);
  }
}

/**
 * Get all API icon names that map to a specific animated icon
 */
export function getMappingsForIcon(animatedIconName: string): string[] {
  const mappings = getWeatherMappings();
  return Object.entries(mappings)
    .filter(([_, iconName]) => iconName === animatedIconName)
    .map(([apiIcon, _]) => apiIcon);
}

export interface WeatherIcon {
  name: string;
  displayName: string;
  category: string;
  svgUrl: string;
  library: WeatherIconLibrary;
  animated?: boolean; // Flag for animated icons (react-animated-weather)
  animatedIcon?: string; // The react-animated-weather icon name (CLEAR_DAY, etc.)
}

// Base paths for local weather icon libraries
const METEOCONS_BASE = '/icons/weather/meteocons';
const WEATHER_ICONS_BASE = '/icons/weather/weather-icons';
const BASICONS_BASE = '/icons/weather/basicons';

// Meteocons icons (numbered 1-47)
// Reference: https://www.alessioatzeni.com/meteocons/
const METEOCONS_MAP: Record<string, { name: string; category: string }> = {
  '1': { name: 'Sun', category: 'Clear' },
  '2': { name: 'Moon', category: 'Clear' },
  '3': { name: 'Partly Cloudy Day', category: 'Cloudy' },
  '4': { name: 'Partly Cloudy Night', category: 'Cloudy' },
  '5': { name: 'Cloudy', category: 'Cloudy' },
  '6': { name: 'Overcast', category: 'Cloudy' },
  '7': { name: 'Light Rain', category: 'Rain' },
  '8': { name: 'Rain', category: 'Rain' },
  '9': { name: 'Heavy Rain', category: 'Rain' },
  '10': { name: 'Rainy Day', category: 'Rain' },
  '11': { name: 'Rainy Night', category: 'Rain' },
  '12': { name: 'Light Snow', category: 'Snow' },
  '13': { name: 'Snow', category: 'Snow' },
  '14': { name: 'Heavy Snow', category: 'Snow' },
  '15': { name: 'Snowy Day', category: 'Snow' },
  '16': { name: 'Snowy Night', category: 'Snow' },
  '17': { name: 'Sleet', category: 'Snow' },
  '18': { name: 'Hail', category: 'Storm' },
  '19': { name: 'Thunder', category: 'Storm' },
  '20': { name: 'Thunderstorm', category: 'Storm' },
  '21': { name: 'Thunderstorm Day', category: 'Storm' },
  '22': { name: 'Thunderstorm Night', category: 'Storm' },
  '23': { name: 'Wind', category: 'Wind' },
  '24': { name: 'Windy', category: 'Wind' },
  '25': { name: 'Tornado', category: 'Extreme' },
  '26': { name: 'Fog', category: 'Fog' },
  '27': { name: 'Mist', category: 'Fog' },
  '28': { name: 'Haze', category: 'Fog' },
  '29': { name: 'Hot', category: 'Temperature' },
  '30': { name: 'Cold', category: 'Temperature' },
  '31': { name: 'Thermometer', category: 'Temperature' },
  '32': { name: 'Thermometer High', category: 'Temperature' },
  '33': { name: 'Thermometer Low', category: 'Temperature' },
  '34': { name: 'Sunrise', category: 'Clear' },
  '35': { name: 'Sunset', category: 'Clear' },
  '36': { name: 'Humidity', category: 'Temperature' },
  '37': { name: 'Umbrella', category: 'Rain' },
  '38': { name: 'Rainbow', category: 'Clear' },
  '39': { name: 'Compass', category: 'Wind' },
  '40': { name: 'Barometer', category: 'Temperature' },
  '41': { name: 'Celsius', category: 'Temperature' },
  '42': { name: 'Fahrenheit', category: 'Temperature' },
  '43': { name: 'Cloud', category: 'Cloudy' },
  '44': { name: 'Cloud Sun', category: 'Cloudy' },
  '45': { name: 'Cloud Moon', category: 'Cloudy' },
  '46': { name: 'Snowflake', category: 'Snow' },
  '47': { name: 'Raindrop', category: 'Rain' },
};

// Weather Icons (Erik Flowers) - most common ones
const WEATHER_ICONS_MAP: Record<string, { name: string; category: string }> = {
  // Day
  'wi-day-sunny': { name: 'Day Sunny', category: 'Clear' },
  'wi-day-cloudy': { name: 'Day Cloudy', category: 'Cloudy' },
  'wi-day-cloudy-gusts': { name: 'Day Cloudy Gusts', category: 'Wind' },
  'wi-day-cloudy-windy': { name: 'Day Cloudy Windy', category: 'Wind' },
  'wi-day-fog': { name: 'Day Fog', category: 'Fog' },
  'wi-day-hail': { name: 'Day Hail', category: 'Storm' },
  'wi-day-haze': { name: 'Day Haze', category: 'Fog' },
  'wi-day-lightning': { name: 'Day Lightning', category: 'Storm' },
  'wi-day-rain': { name: 'Day Rain', category: 'Rain' },
  'wi-day-rain-mix': { name: 'Day Rain Mix', category: 'Rain' },
  'wi-day-showers': { name: 'Day Showers', category: 'Rain' },
  'wi-day-sleet': { name: 'Day Sleet', category: 'Snow' },
  'wi-day-snow': { name: 'Day Snow', category: 'Snow' },
  'wi-day-sprinkle': { name: 'Day Sprinkle', category: 'Rain' },
  'wi-day-storm-showers': { name: 'Day Storm Showers', category: 'Storm' },
  'wi-day-thunderstorm': { name: 'Day Thunderstorm', category: 'Storm' },
  // Night
  'wi-night-clear': { name: 'Night Clear', category: 'Clear' },
  'wi-night-alt-cloudy': { name: 'Night Cloudy', category: 'Cloudy' },
  'wi-night-alt-rain': { name: 'Night Rain', category: 'Rain' },
  'wi-night-alt-showers': { name: 'Night Showers', category: 'Rain' },
  'wi-night-alt-snow': { name: 'Night Snow', category: 'Snow' },
  'wi-night-alt-thunderstorm': { name: 'Night Thunderstorm', category: 'Storm' },
  'wi-night-fog': { name: 'Night Fog', category: 'Fog' },
  // Neutral
  'wi-cloud': { name: 'Cloud', category: 'Cloudy' },
  'wi-cloudy': { name: 'Cloudy', category: 'Cloudy' },
  'wi-cloudy-gusts': { name: 'Cloudy Gusts', category: 'Wind' },
  'wi-cloudy-windy': { name: 'Cloudy Windy', category: 'Wind' },
  'wi-fog': { name: 'Fog', category: 'Fog' },
  'wi-hail': { name: 'Hail', category: 'Storm' },
  'wi-lightning': { name: 'Lightning', category: 'Storm' },
  'wi-rain': { name: 'Rain', category: 'Rain' },
  'wi-rain-mix': { name: 'Rain Mix', category: 'Rain' },
  'wi-rain-wind': { name: 'Rain Wind', category: 'Rain' },
  'wi-showers': { name: 'Showers', category: 'Rain' },
  'wi-sleet': { name: 'Sleet', category: 'Snow' },
  'wi-snow': { name: 'Snow', category: 'Snow' },
  'wi-snow-wind': { name: 'Snow Wind', category: 'Snow' },
  'wi-snowflake-cold': { name: 'Snowflake Cold', category: 'Snow' },
  'wi-sprinkle': { name: 'Sprinkle', category: 'Rain' },
  'wi-storm-showers': { name: 'Storm Showers', category: 'Storm' },
  'wi-thunderstorm': { name: 'Thunderstorm', category: 'Storm' },
  'wi-tornado': { name: 'Tornado', category: 'Extreme' },
  'wi-strong-wind': { name: 'Strong Wind', category: 'Wind' },
  'wi-windy': { name: 'Windy', category: 'Wind' },
  'wi-dust': { name: 'Dust', category: 'Extreme' },
  'wi-sandstorm': { name: 'Sandstorm', category: 'Extreme' },
  'wi-hurricane': { name: 'Hurricane', category: 'Extreme' },
  // Temperature & Misc
  'wi-thermometer': { name: 'Thermometer', category: 'Temperature' },
  'wi-thermometer-exterior': { name: 'Thermometer Exterior', category: 'Temperature' },
  'wi-thermometer-internal': { name: 'Thermometer Internal', category: 'Temperature' },
  'wi-celsius': { name: 'Celsius', category: 'Temperature' },
  'wi-fahrenheit': { name: 'Fahrenheit', category: 'Temperature' },
  'wi-humidity': { name: 'Humidity', category: 'Temperature' },
  'wi-barometer': { name: 'Barometer', category: 'Temperature' },
  'wi-hot': { name: 'Hot', category: 'Temperature' },
  'wi-raindrops': { name: 'Raindrops', category: 'Rain' },
  'wi-raindrop': { name: 'Raindrop', category: 'Rain' },
  'wi-umbrella': { name: 'Umbrella', category: 'Rain' },
  'wi-sunrise': { name: 'Sunrise', category: 'Clear' },
  'wi-sunset': { name: 'Sunset', category: 'Clear' },
  // Moon phases
  'wi-moon-new': { name: 'New Moon', category: 'Moon' },
  'wi-moon-waxing-crescent-1': { name: 'Waxing Crescent', category: 'Moon' },
  'wi-moon-first-quarter': { name: 'First Quarter', category: 'Moon' },
  'wi-moon-waxing-gibbous-1': { name: 'Waxing Gibbous', category: 'Moon' },
  'wi-moon-full': { name: 'Full Moon', category: 'Moon' },
  'wi-moon-waning-gibbous-1': { name: 'Waning Gibbous', category: 'Moon' },
  'wi-moon-third-quarter': { name: 'Third Quarter', category: 'Moon' },
  'wi-moon-waning-crescent-1': { name: 'Waning Crescent', category: 'Moon' },
  // Wind direction
  'wi-wind-deg': { name: 'Wind Direction', category: 'Wind' },
  'wi-direction-up': { name: 'Direction Up', category: 'Wind' },
  'wi-direction-down': { name: 'Direction Down', category: 'Wind' },
  'wi-direction-left': { name: 'Direction Left', category: 'Wind' },
  'wi-direction-right': { name: 'Direction Right', category: 'Wind' },
};

// Basicons weather icons
const BASICONS_MAP: Record<string, { name: string; category: string }> = {
  'air-wind-weather': { name: 'Air Wind', category: 'Wind' },
  'cloud': { name: 'Cloud', category: 'Cloudy' },
  'droplet-rain-weather': { name: 'Droplet', category: 'Rain' },
  'droplets-rain-weather': { name: 'Droplets', category: 'Rain' },
  'humidity-air-weather': { name: 'Humidity', category: 'Temperature' },
  'rain-cloud-weather': { name: 'Rain Cloud', category: 'Rain' },
  'snowflakes-weather-cold': { name: 'Snowflakes', category: 'Snow' },
  'sun-day': { name: 'Sun', category: 'Clear' },
  'sunrise': { name: 'Sunrise', category: 'Clear' },
  'sunset-weather': { name: 'Sunset', category: 'Clear' },
  'thunderstorm-weather': { name: 'Thunderstorm', category: 'Storm' },
  'wind-weather': { name: 'Wind', category: 'Wind' },
};

// Animated weather icons (react-animated-weather)
// These are canvas-based animated icons - the default and recommended library
// Note: react-animated-weather only supports 10 unique animations
// For weather API mapping, use mapWeatherApiIcon() function which handles aliases
const ANIMATED_ICONS: Array<{ name: string; displayName: string; category: string; animatedIcon: string }> = [
  // Clear conditions
  { name: 'animated-clear-day', displayName: 'Clear Day', category: 'Clear', animatedIcon: 'CLEAR_DAY' },
  { name: 'animated-clear-night', displayName: 'Clear Night', category: 'Clear', animatedIcon: 'CLEAR_NIGHT' },
  // Cloudy conditions
  { name: 'animated-partly-cloudy-day', displayName: 'Partly Cloudy Day', category: 'Cloudy', animatedIcon: 'PARTLY_CLOUDY_DAY' },
  { name: 'animated-partly-cloudy-night', displayName: 'Partly Cloudy Night', category: 'Cloudy', animatedIcon: 'PARTLY_CLOUDY_NIGHT' },
  { name: 'animated-cloudy', displayName: 'Cloudy', category: 'Cloudy', animatedIcon: 'CLOUDY' },
  // Rain conditions
  { name: 'animated-rain', displayName: 'Rain', category: 'Rain', animatedIcon: 'RAIN' },
  // Snow conditions
  { name: 'animated-sleet', displayName: 'Sleet', category: 'Snow', animatedIcon: 'SLEET' },
  { name: 'animated-snow', displayName: 'Snow', category: 'Snow', animatedIcon: 'SNOW' },
  // Wind
  { name: 'animated-wind', displayName: 'Wind', category: 'Wind', animatedIcon: 'WIND' },
  // Fog/Mist/Haze (all use same animation)
  { name: 'animated-fog', displayName: 'Fog', category: 'Fog', animatedIcon: 'FOG' },
];

// Build weather icons array
function buildWeatherIcons(): WeatherIcon[] {
  const icons: WeatherIcon[] = [];

  // Animated icons (react-animated-weather) - added FIRST as default
  ANIMATED_ICONS.forEach((icon) => {
    icons.push({
      name: icon.name,
      displayName: icon.displayName,
      category: icon.category,
      svgUrl: '', // No SVG URL for animated icons
      library: 'animated',
      animated: true,
      animatedIcon: icon.animatedIcon,
    });
  });

  // Meteocons
  Object.entries(METEOCONS_MAP).forEach(([num, info]) => {
    icons.push({
      name: `meteocons-${num}`,
      displayName: info.name,
      category: info.category,
      svgUrl: `${METEOCONS_BASE}/${num}.svg`,
      library: 'meteocons',
    });
  });

  // Weather Icons (Erik Flowers)
  Object.entries(WEATHER_ICONS_MAP).forEach(([file, info]) => {
    icons.push({
      name: file,
      displayName: info.name,
      category: info.category,
      svgUrl: `${WEATHER_ICONS_BASE}/${file}.svg`,
      library: 'weather-icons',
    });
  });

  // Basicons
  Object.entries(BASICONS_MAP).forEach(([file, info]) => {
    icons.push({
      name: `basicons-${file}`,
      displayName: info.name,
      category: info.category,
      svgUrl: `${BASICONS_BASE}/${file}.svg`,
      library: 'basicons',
    });
  });

  return icons;
}

export const WEATHER_ICONS: WeatherIcon[] = buildWeatherIcons();

// Get weather icon by name
export function getWeatherIcon(name: string): WeatherIcon | undefined {
  return WEATHER_ICONS.find(icon => icon.name === name);
}

// Get weather icons by category
export function getWeatherIconsByCategory(category: string): WeatherIcon[] {
  return WEATHER_ICONS.filter(icon => icon.category === category);
}

// Get weather icons by library
export function getWeatherIconsByLibrary(library: WeatherIconLibrary): WeatherIcon[] {
  return WEATHER_ICONS.filter(icon => icon.library === library);
}

// Get all categories
export function getWeatherIconCategories(): string[] {
  return Array.from(new Set(WEATHER_ICONS.map(icon => icon.category)));
}

// Get all libraries (animated first as default)
export function getWeatherIconLibraries(): WeatherIconLibrary[] {
  return ['animated', 'meteocons', 'weather-icons', 'basicons'];
}

// Validate if an icon exists
export function isValidWeatherIcon(name: string): boolean {
  return WEATHER_ICONS.some(icon => icon.name === name);
}

// Get icon names for AI reference
export function getWeatherIconNamesForAI(): string[] {
  return WEATHER_ICONS.map(icon => icon.name);
}

/**
 * Map weather API icon strings to our animated icon names
 * Uses customizable mappings stored in localStorage
 *
 * Note: react-animated-weather only has 10 unique animations:
 * CLEAR_DAY, CLEAR_NIGHT, PARTLY_CLOUDY_DAY, PARTLY_CLOUDY_NIGHT, CLOUDY,
 * RAIN, SLEET, SNOW, WIND, FOG
 *
 * @param apiIcon - The icon string from a weather API
 * @param isNight - Whether it's nighttime (affects day/night icon selection)
 * @returns The corresponding animated icon name (one of the 10 valid icons)
 */
export function mapWeatherApiIcon(apiIcon: string, isNight: boolean = false): string {
  if (!apiIcon) return isNight ? 'animated-clear-night' : 'animated-clear-day';

  const normalized = apiIcon.toLowerCase().trim();
  const mappings = getWeatherMappings();

  // Check for exact match in user/default mappings first
  if (mappings[normalized]) {
    let iconName = mappings[normalized];
    // Handle day/night variants for clear and partly cloudy
    if (isNight) {
      if (iconName === 'animated-clear-day') iconName = 'animated-clear-night';
      if (iconName === 'animated-partly-cloudy-day') iconName = 'animated-partly-cloudy-night';
    }
    return iconName;
  }

  // Check for partial matches in mappings
  for (const [key, iconName] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      let result = iconName;
      if (isNight) {
        if (result === 'animated-clear-day') result = 'animated-clear-night';
        if (result === 'animated-partly-cloudy-day') result = 'animated-partly-cloudy-night';
      }
      return result;
    }
  }

  // Fallback keyword-based matching for unmapped terms
  if (normalized.includes('sun') || normalized.includes('clear')) {
    return isNight ? 'animated-clear-night' : 'animated-clear-day';
  }
  if (normalized.includes('cloud')) {
    if (normalized.includes('partly') || normalized.includes('partial')) {
      return isNight ? 'animated-partly-cloudy-night' : 'animated-partly-cloudy-day';
    }
    return 'animated-cloudy';
  }
  if (normalized.includes('rain') || normalized.includes('shower')) {
    return 'animated-rain';
  }
  if (normalized.includes('snow') || normalized.includes('flurr')) {
    return 'animated-snow';
  }
  if (normalized.includes('fog') || normalized.includes('mist') || normalized.includes('haze')) {
    return 'animated-fog';
  }
  if (normalized.includes('wind')) {
    return 'animated-wind';
  }
  if (normalized.includes('storm') || normalized.includes('thunder')) {
    return 'animated-rain';
  }
  if (normalized.includes('sleet') || normalized.includes('ice') || normalized.includes('freezing')) {
    return 'animated-sleet';
  }

  // Default fallback
  return isNight ? 'animated-clear-night' : 'animated-clear-day';
}

/**
 * Get the animated icon code (e.g., CLEAR_DAY) for a given icon name
 * Used by components that need to render react-animated-weather
 */
export function getAnimatedIconCode(iconName: string): string {
  const icon = WEATHER_ICONS.find(i => i.name === iconName);
  if (icon?.animatedIcon) {
    return icon.animatedIcon;
  }
  // Default to CLEAR_DAY if not found
  return 'CLEAR_DAY';
}
