// Script to run SQL migration using service_role key
import { createClient } from '@supabase/supabase-js';

// Require environment variables - no hardcoded fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  console.error('Make sure your .env file is configured and loaded');
  process.exit(1);
}

// Create admin client with service_role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running migration to add thumbnail_url column...\n');

  // Use rpc to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;'
  });

  if (error) {
    // rpc might not exist, try alternative approach
    console.log('rpc method not available, trying direct approach...');

    // Try to use the column - if it works, it exists
    const { data: testData, error: testError } = await supabase
      .from('gfx_projects')
      .select('id, thumbnail_url')
      .limit(1);

    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('❌ Column does not exist.');
        console.log('\nThe service_role key cannot run DDL directly via PostgREST.');
        console.log('You need to run this SQL in Supabase Dashboard:');
        console.log('\n  ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;');
        console.log('\nDashboard: https://supabase.com/dashboard/project/ihdoylhzekyluiiigxxc/sql/new');
      } else {
        console.log('Error:', testError.message);
      }
    } else {
      console.log('✅ Column thumbnail_url already exists!');

      // Show sample projects
      const { data: projects } = await supabase
        .from('gfx_projects')
        .select('id, name, thumbnail_url')
        .limit(3);

      console.log('\nSample projects:');
      projects?.forEach(p => {
        console.log(`  - ${p.name}: thumbnail = ${p.thumbnail_url ? '(has data ~' + Math.round(p.thumbnail_url.length/1024) + 'KB)' : 'null'}`);
      });
    }
  } else {
    console.log('✅ Migration completed successfully!');
    console.log('Result:', data);
  }
}

runMigration().catch(console.error);
