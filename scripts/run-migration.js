// Script to run SQL migration via Supabase Management API
// This requires a service_role key or running via supabase db remote

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihdoylhzekyluiiigxxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZG95bGh6ZWt5bHVpaWlneHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDg5OTIsImV4cCI6MjA4MDA4NDk5Mn0.BTBy31mZUYuxTP-FTU6BU2lu95K0YTxN5eaDRX3hn8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Attempting to add thumbnail_url column...\n');

  // First, check if column already exists by trying to select it
  const { data: testData, error: testError } = await supabase
    .from('gfx_projects')
    .select('id, thumbnail_url')
    .limit(1);

  if (testError) {
    if (testError.message.includes('does not exist')) {
      console.log('❌ Column does not exist yet.');
      console.log('\nThe anon key cannot run ALTER TABLE statements.');
      console.log('You need to either:');
      console.log('\n1. Run this SQL in Supabase Dashboard SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/ihdoylhzekyluiiigxxc/sql/new');
      console.log('\n   ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;');
      console.log('\n2. Or login to Supabase CLI:');
      console.log('   supabase login');
      console.log('   Then run: pnpm db:migrate');
    } else {
      console.log('Error:', testError.message);
    }
  } else {
    console.log('✅ Column thumbnail_url already exists!');
    console.log('Test query result:', testData);

    // Show a sample project to verify
    const { data: projects } = await supabase
      .from('gfx_projects')
      .select('id, name, thumbnail_url')
      .limit(3);

    console.log('\nSample projects:');
    projects?.forEach(p => {
      console.log(`  - ${p.name}: thumbnail_url = ${p.thumbnail_url ? '(has data)' : 'null'}`);
    });
  }
}

runMigration().catch(console.error);
