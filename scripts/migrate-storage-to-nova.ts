/**
 * Storage Migration Script: Migrate storage files from Nova-GFX to Nova Supabase
 *
 * This script copies all files from Nova-GFX storage buckets to Nova storage buckets.
 *
 * Buckets to migrate:
 * - Texures (textures for GFX templates)
 * - media (banner/sponsor media)
 * - vsimages (virtual set images)
 *
 * Usage: npx ts-node scripts/migrate-storage-to-nova.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Nova-GFX (source) - ihdoylhzekyluiiigxxc
const GFX_SUPABASE_URL = 'https://ihdoylhzekyluiiigxxc.supabase.co';
const GFX_SUPABASE_SERVICE_KEY = process.env.GFX_SUPABASE_SERVICE_KEY!;

// Nova (destination) - bgkjcngrslxyqjitksim
const NOVA_SUPABASE_URL = 'https://bgkjcngrslxyqjitksim.supabase.co';
const NOVA_SUPABASE_SERVICE_KEY = process.env.NOVA_SUPABASE_SERVICE_KEY!;

async function listAllFiles(
  client: SupabaseClient,
  bucketName: string,
  prefix = ''
): Promise<string[]> {
  const files: string[] = [];

  const { data, error } = await client.storage
    .from(bucketName)
    .list(prefix, { limit: 1000 });

  if (error) {
    console.error(`Error listing files in ${bucketName}/${prefix}:`, error.message);
    return files;
  }

  if (data) {
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        // This is a folder, recurse into it
        const subFiles = await listAllFiles(client, bucketName, path);
        files.push(...subFiles);
      } else {
        // This is a file
        files.push(path);
      }
    }
  }

  return files;
}

async function migrateFile(
  gfxClient: SupabaseClient,
  novaClient: SupabaseClient,
  bucketName: string,
  filePath: string
): Promise<boolean> {
  try {
    // Download from source
    const { data: fileData, error: downloadError } = await gfxClient.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError || !fileData) {
      console.error(`  Error downloading ${filePath}:`, downloadError?.message);
      return false;
    }

    // Upload to destination
    const { error: uploadError } = await novaClient.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        upsert: true,
        contentType: fileData.type || 'application/octet-stream',
      });

    if (uploadError) {
      console.error(`  Error uploading ${filePath}:`, uploadError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`  Exception migrating ${filePath}:`, err);
    return false;
  }
}

async function migrateBucket(
  gfxClient: SupabaseClient,
  novaClient: SupabaseClient,
  bucketName: string
): Promise<{ total: number; migrated: number; failed: number }> {
  console.log(`\nMigrating bucket: ${bucketName}`);

  // List all files
  const files = await listAllFiles(gfxClient, bucketName);
  console.log(`  Found ${files.length} files`);

  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const success = await migrateFile(gfxClient, novaClient, bucketName, file);

    if (success) {
      migrated++;
    } else {
      failed++;
    }

    // Progress update every 10 files
    if ((i + 1) % 10 === 0 || i === files.length - 1) {
      console.log(`  Progress: ${i + 1}/${files.length} (${migrated} success, ${failed} failed)`);
    }
  }

  return { total: files.length, migrated, failed };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Storage Migration Script');
  console.log('='.repeat(60));

  // Validate environment
  if (!GFX_SUPABASE_SERVICE_KEY) {
    console.error('ERROR: GFX_SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
  }

  if (!NOVA_SUPABASE_SERVICE_KEY) {
    console.error('ERROR: NOVA_SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
  }

  // Create clients
  const gfxClient = createClient(GFX_SUPABASE_URL, GFX_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const novaClient = createClient(NOVA_SUPABASE_URL, NOVA_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('\nConnecting to databases...');
  console.log(`  Source (GFX): ${GFX_SUPABASE_URL}`);
  console.log(`  Target (Nova): ${NOVA_SUPABASE_URL}`);

  // Migrate buckets
  const buckets = ['Texures', 'media', 'vsimages'];
  const results: Record<string, { total: number; migrated: number; failed: number }> = {};

  for (const bucket of buckets) {
    results[bucket] = await migrateBucket(gfxClient, novaClient, bucket);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));

  for (const [bucket, stats] of Object.entries(results)) {
    console.log(`\n${bucket}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Failed: ${stats.failed}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Storage Migration Complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
