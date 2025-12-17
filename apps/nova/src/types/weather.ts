export interface WeatherValue {
  value: number | FieldOverride<number>;
  unit: string | FieldOverride<string>;
}

export interface WindData {
  speed: WeatherValue;
  gust?: WeatherValue;
  direction_deg: number;
  direction_cardinal?: string;
}

export interface SunMoonData {
  sunrise: string;
  sunset: string;
  moonPhase?: string;
  illumination?: number;
}

export interface MarineData {
  waves: {
    significantHeight: WeatherValue;
    period: WeatherValue;
  };
  tides: Array<{
    time: string;
    height: WeatherValue;
    type: string;
  }>;
}

export interface SmokeData {
  surfacePM25: {
    grid: number[][];
  };
  verticallyIntegratedSmoke: {
    grid: number[][];
  };
  fireSources: Array<{
    lat: number;
    lon: number;
    confidence: number;
    brightness: number;
  }>;
}

export interface AirQuality {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  standard: string;
}

export interface Pollen {
  tree: number;
  grass: number;
  weed: number;
  risk: string;
}

export interface CurrentConditions {
  asOf: string | FieldOverride<string>;
  summary: string | FieldOverride<string>;
  icon: string | FieldOverride<string>;
  temperature: WeatherValue;
  feelsLike: WeatherValue;
  dewPoint: WeatherValue;
  humidity: number | FieldOverride<number>;
  pressure: WeatherValue & { tendency?: string | FieldOverride<string> };
  wind: WindData;
  visibility: WeatherValue;
  cloudCover: number | FieldOverride<number>;
  uvIndex: number | FieldOverride<number>;
  precipLastHr: WeatherValue;
  precipType: string | FieldOverride<string>;
  snowDepth: WeatherValue;
  sun: SunMoonData;
  airQuality: AirQuality;
  pollen: Pollen;
}

export interface HourlyForecastItem {
  time: string;
  summary: string;
  icon: string;
  temperature: WeatherValue;
  feelsLike: WeatherValue;
  dewPoint: WeatherValue;
  humidity: number;
  wind: WindData;
  pressure: WeatherValue;
  cloudCover: number;
  precipProbability: number;
  precipIntensity: WeatherValue;
  uvIndex: number;
}

export interface DailyForecastItem {
  date: string;
  summary: string;
  icon: string;
  tempMax: WeatherValue;
  tempMin: WeatherValue;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  uvIndexMax: number;
  precipProbability: number;
  precipType: string;
  precipAccumulation: WeatherValue;
  snowAccumulation: WeatherValue;
  wind: {
    speedAvg: WeatherValue;
    gustMax: WeatherValue;
    direction_deg: number;
  };
}

export interface WeatherAlert {
  id: string;
  source: string;
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  start: string;
  end: string;
  headline: string;
  description: string;
  areas: string[];
  instruction: string;
  links: string[];
}

export interface TropicalSystem {
  id: string;
  name: string;
  type: string;
  position: {
    time: string;
    lat: number;
    lon: number;
  };
  windMax: WeatherValue;
  pressureMin: WeatherValue;
  motion: {
    dir_deg: number;
    speed: WeatherValue;
  };
  forecastPoints: Array<{
    time: string;
    lat: number;
    lon: number;
    type: string;
    windMax: WeatherValue;
  }>;
}

export interface Location {
  id: string;
  name: string | FieldOverride<string>;
  admin1: string | FieldOverride<string>;
  country: string | FieldOverride<string>;
  lat: number | FieldOverride<number>;
  lon: number | FieldOverride<number>;
  elevation_m: number | FieldOverride<number>;
  stationId?: string | FieldOverride<string>;
  provider_id?: string;
  provider_name?: string;
  channel_id?: string; // Legacy single channel (for backward compatibility)
  channel_ids?: string[]; // Multiple channel assignments
}

export interface WeatherData {
  version: string;
  product: string;
  locationProvider?: string; // Data provider name for this location
  location: Location;
  current: CurrentConditions;
  hourly: {
    stepHours: number;
    items: HourlyForecastItem[];
  };
  daily: {
    items: DailyForecastItem[];
  };
  alerts: WeatherAlert[];
  tropical?: {
    basin: string;
    advisoryTime: string;
    systems: TropicalSystem[];
  };
  marine?: MarineData;
  smoke?: SmokeData;
}

// Override tracking for individual fields
export interface FieldOverride<T = any> {
  originalValue: T;
  overriddenValue: T;
  isOverridden: boolean;
  overriddenAt?: string;
  overriddenBy?: string;
  reason?: string;
}

export interface WeatherLocationWithOverrides {
  location: Location;
  data: WeatherData;
}

export interface WeatherDashboardData {
  locations: WeatherLocationWithOverrides[];
  lastUpdated: string;
}

export type WeatherView = 'current' | 'hourly' | 'daily' | 'alerts' | 'tropical' | 'air-quality' | 'other';

// Helper functions for working with overrides
export function isFieldOverridden<T>(field: T | FieldOverride<T>): field is FieldOverride<T> {
  return typeof field === 'object' && field !== null && 'isOverridden' in field;
}

export function getFieldValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.isOverridden ? field.overriddenValue : field.originalValue;
  }
  return field;
}

export function getOriginalValue<T>(field: T | FieldOverride<T>): T {
  if (isFieldOverridden(field)) {
    return field.originalValue;
  }
  return field;
}

export function createOverride<T>(originalValue: T, overriddenValue: T, reason?: string): FieldOverride<T> {
  return {
    originalValue,
    overriddenValue,
    isOverridden: true,
    overriddenAt: new Date().toISOString(),
    reason
  };
}

export function revertOverride<T>(field: FieldOverride<T>): T {
  return field.originalValue;
}

// Weather Provider Configuration
export interface WeatherProvider {
  id: string;
  name: string;
  type: 'weatherapi' | 'openweather' | 'tomorrow' | 'visualcrossing' | 'aeris' | 'custom';
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedWeatherLocation {
  id: string;
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  elevation_m?: number;
  stationId?: string;
  provider_id?: string;
  provider_name?: string;
  createdAt: string;
  updatedAt: string;
}