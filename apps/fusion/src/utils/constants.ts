/**
 * Application constants
 */

// The current election year that we're tracking live data for
export const CURRENT_ELECTION_YEAR = 2024;

// GeoJSON file URLs hosted on Supabase Storage
export const GEOJSON_URLS = {
  COUNTIES: 'https://bgkjcngrslxyqjitksim.supabase.co/storage/v1/object/public/election-images/geoJSON/us_county_2023.json',
  DISTRICTS: 'https://bgkjcngrslxyqjitksim.supabase.co/storage/v1/object/public/election-images/geoJSON/us_district_2024.json'
};

// Supabase credentials for map settings
export const SUPABASE_PROJECT_ID = 'bgkjcngrslxyqjitksim';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna2pjbmdyc2x4eXFqaXRrc2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MjAyOTEsImV4cCI6MjA0NzA5NjI5MX0.wOv2fZJ8j1Ir7CRCVOhJqWxETMtf4Nxa6_uyRxRPM0c';