/**
 * Application constants
 */

// The current election year that we're tracking live data for
export const CURRENT_ELECTION_YEAR = 2024;

// Get Supabase URL from environment variables
const supabaseUrl = import.meta.env.VITE_FUSION_SUPABASE_URL || '';

// GeoJSON file URLs hosted on Supabase Storage
export const GEOJSON_URLS = {
  COUNTIES: `${supabaseUrl}/storage/v1/object/public/election-images/geoJSON/us_county_2023.json`,
  DISTRICTS: `${supabaseUrl}/storage/v1/object/public/election-images/geoJSON/us_district_2024.json`
};

// Supabase credentials from environment variables
const url = import.meta.env.VITE_FUSION_SUPABASE_URL || '';
export const SUPABASE_PROJECT_ID = url.replace('https://', '').replace('http://', '').replace('.supabase.co', '').split(':')[0];
export const SUPABASE_ANON_KEY = import.meta.env.VITE_FUSION_SUPABASE_ANON_KEY || '';
