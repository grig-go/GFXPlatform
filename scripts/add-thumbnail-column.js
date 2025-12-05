// Script to add thumbnail_url column to gfx_projects table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ihdoylhzekyluiiigxxc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZG95bGh6ZWt5bHVpaWlneHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDg5OTIsImV4cCI6MjA4MDA4NDk5Mn0.BTBy31mZUYuxTP-FTU6BU2lu95K0YTxN5eaDRX3hn8o';

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
