// Script to run SQL migration via Supabase Management API
// This requires a service_role key or running via supabase db remote

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
