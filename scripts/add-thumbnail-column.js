// Script to add thumbnail_url column to gfx_projects table
import { createClient } from '@supabase/supabase-js';

// Require environment variables - no hardcoded fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
  console.error('Make sure your .env file is configured and loaded');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addThumbnailColumn() {
  console.log('Checking if thumbnail_url column exists...');

  // Try to query the column - if it fails, the column doesn't exist
  const { data, error } = await supabase
    .from('gfx_projects')
    .select('thumbnail_url')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('Column does not exist. You need to run the migration manually.');
      console.log('\nRun this SQL in the Supabase SQL Editor:');
      console.log('-------------------------------------------');
      console.log('ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;');
      console.log('-------------------------------------------');
      console.log('\nOr login to Supabase CLI and run: pnpm db:migrate');
    } else {
      console.log('Error checking column:', error.message);
    }
  } else {
    console.log('✅ thumbnail_url column already exists!');
    console.log('Sample data:', data);
  }
}

addThumbnailColumn().catch(console.error);
