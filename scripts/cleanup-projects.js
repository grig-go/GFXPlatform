// Cleanup script to delete all projects from Supabase
// Run with: node scripts/cleanup-projects.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file manually
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  const env = {};

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const devUserEmail = env.VITE_DEV_USER_EMAIL;
const devUserPassword = env.VITE_DEV_USER_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!devUserEmail || !devUserPassword) {
  console.error('Missing VITE_DEV_USER_EMAIL or VITE_DEV_USER_PASSWORD in .env');
  console.error('These are required to authenticate and delete projects.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupProjects() {
  console.log('Starting database cleanup...\n');

  // Sign in as the dev user
  console.log(`Signing in as ${devUserEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: devUserEmail,
    password: devUserPassword,
  });

  if (authError) {
    console.error('Failed to sign in:', authError.message);
    process.exit(1);
  }
  console.log('✓ Signed in successfully\n');

  // Delete in order to respect foreign key constraints
  // Order: keyframes -> animations -> bindings -> elements -> templates -> folders -> layers -> projects
  // Tables are prefixed with 'gfx_'

  const tables = [
    'gfx_keyframes',
    'gfx_animations',
    'gfx_bindings',
    'gfx_elements',
    'gfx_templates',
    'gfx_folders',
    'gfx_layers',
    'gfx_project_design_systems',
    'gfx_projects'
  ];

  for (const table of tables) {
    console.log(`Deleting all records from ${table}...`);
    const { error, count } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq with impossible id)

    if (error) {
      console.error(`  Error deleting from ${table}:`, error.message);
    } else {
      console.log(`  ✓ Deleted from ${table}`);
    }
  }

  console.log('\n✅ Database cleanup complete!');
  console.log('You can now create new test projects.');
}

cleanupProjects().catch(console.error);
