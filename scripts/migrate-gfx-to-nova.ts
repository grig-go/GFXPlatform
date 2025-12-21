/**
 * Migration Script: Migrate GFX data from Nova-GFX Supabase to Nova Supabase
 *
 * This script migrates all GFX and Pulsar data from the Nova-GFX project (ihdoylhzekyluiiigxxc)
 * to the Nova project (bgkjcngrslxyqjitksim).
 *
 * Prerequisites:
 * - Both Supabase projects must be accessible
 * - The gfx_* and pulsar_* tables must already exist in Nova (from migrations)
 * - The u_organizations and u_users tables must exist in Nova
 *
 * The script maps:
 * - Nova-GFX organizations.id -> Nova u_organizations.id (by matching slug/name)
 * - Nova-GFX users.id -> Nova u_users.id (by matching email)
 *
 * Usage: npx ts-node scripts/migrate-gfx-to-nova.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Nova-GFX (source) - ihdoylhzekyluiiigxxc
const GFX_SUPABASE_URL = 'https://ihdoylhzekyluiiigxxc.supabase.co';
const GFX_SUPABASE_SERVICE_KEY = process.env.GFX_SUPABASE_SERVICE_KEY!;

// Nova (destination) - bgkjcngrslxyqjitksim
const NOVA_SUPABASE_URL = 'https://bgkjcngrslxyqjitksim.supabase.co';
const NOVA_SUPABASE_SERVICE_KEY = process.env.NOVA_SUPABASE_SERVICE_KEY!;

interface MigrationMapping {
  orgIdMap: Map<string, string>;  // GFX org_id -> Nova org_id
  userIdMap: Map<string, string>; // GFX user_id -> Nova user_id (by auth_user_id)
}

async function buildMappings(gfxClient: SupabaseClient, novaClient: SupabaseClient): Promise<MigrationMapping> {
  console.log('Building ID mappings...');

  const orgIdMap = new Map<string, string>();
  const userIdMap = new Map<string, string>();

  // Get all organizations from GFX
  const { data: gfxOrgs } = await gfxClient.from('organizations').select('id, name, slug, allowed_domains');
  const { data: novaOrgs } = await novaClient.from('u_organizations').select('id, name, slug, allowed_domains');

  if (gfxOrgs && novaOrgs) {
    // Find the Emergent org in Nova (target for all GFX data)
    const emergentOrg = novaOrgs.find(o => o.slug === 'emergent' || o.name.toLowerCase().includes('emergent'));

    for (const gfxOrg of gfxOrgs) {
      // Map "Nova Development" (test org) to Emergent - they're the same
      if (gfxOrg.id === '00000000-0000-0000-0000-000000000001' || gfxOrg.name === 'Nova Development') {
        if (emergentOrg) {
          orgIdMap.set(gfxOrg.id, emergentOrg.id);
          console.log(`  Org mapping: ${gfxOrg.name} (${gfxOrg.id}) -> ${emergentOrg.id} (Emergent)`);
          continue;
        }
      }

      // Match by slug first, then by name, then by allowed_domains overlap
      let novaOrg = novaOrgs.find(o => o.slug === gfxOrg.slug);
      if (!novaOrg) {
        novaOrg = novaOrgs.find(o => o.name === gfxOrg.name);
      }
      if (!novaOrg && gfxOrg.allowed_domains?.length > 0) {
        // Check if any allowed_domains overlap
        novaOrg = novaOrgs.find(o =>
          o.allowed_domains?.some((d: string) => gfxOrg.allowed_domains.includes(d))
        );
      }
      if (novaOrg) {
        orgIdMap.set(gfxOrg.id, novaOrg.id);
        console.log(`  Org mapping: ${gfxOrg.name} (${gfxOrg.id}) -> ${novaOrg.id}`);
      } else {
        console.warn(`  WARNING: No matching Nova org for ${gfxOrg.name} (${gfxOrg.id})`);
      }
    }
  }

  // Get all users from GFX
  const { data: gfxUsers } = await gfxClient.from('users').select('id, email');
  const { data: novaUsers } = await novaClient.from('u_users').select('id, email, auth_user_id');

  if (gfxUsers && novaUsers) {
    for (const gfxUser of gfxUsers) {
      // Match by email
      const novaUser = novaUsers.find(u => u.email.toLowerCase() === gfxUser.email.toLowerCase());
      if (novaUser) {
        userIdMap.set(gfxUser.id, novaUser.id);
        console.log(`  User mapping: ${gfxUser.email} (${gfxUser.id}) -> ${novaUser.id}`);
      } else {
        console.warn(`  WARNING: No matching Nova user for ${gfxUser.email} (${gfxUser.id})`);
      }
    }
  }

  return { orgIdMap, userIdMap };
}

// Tables that require organization_id mapping (skip if unmapped)
const TABLES_WITH_ORG_ID = new Set([
  'gfx_projects',
  'gfx_project_design_systems',
  'gfx_folders',
  'gfx_animation_presets',
  'gfx_support_tickets',
  'organization_textures',
  'pulsar_channels',
  'pulsar_channel_state',
  'pulsar_custom_uis',
  'pulsar_custom_ui_controls',
  'pulsar_command_log',
  'pulsar_playout_log',
  'pulsar_page_library',
  'pulsar_user_preferences',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIds(row: any, mapping: MigrationMapping, tableName: string): any {
  const result = { ...row };

  // Map organization_id - only skip if table requires org_id and it's unmapped
  if (result.organization_id && typeof result.organization_id === 'string') {
    const newOrgId = mapping.orgIdMap.get(result.organization_id);
    if (newOrgId) {
      result.organization_id = newOrgId;
    } else if (TABLES_WITH_ORG_ID.has(tableName)) {
      // Skip rows with unmapped organizations only for tables that require org_id
      return null;
    }
    // For tables without org_id requirement, just remove the field
    // (it doesn't exist in source anyway)
  }

  // Helper to map user IDs - sets to null if unmapped
  const mapUserField = (fieldName: string) => {
    if (result[fieldName] && typeof result[fieldName] === 'string') {
      const newUserId = mapping.userIdMap.get(result[fieldName]);
      if (newUserId) {
        result[fieldName] = newUserId;
      } else {
        // Set to null for unmapped users (FK allows null)
        result[fieldName] = null;
      }
    }
  };

  // Map all user reference fields
  mapUserField('created_by');
  mapUserField('uploaded_by');
  mapUserField('triggered_by');
  mapUserField('operator_id');
  mapUserField('controlled_by');
  mapUserField('locked_by');
  mapUserField('user_id');
  mapUserField('updated_by');

  return result;
}

// Special migration for gfx_elements - needs topological sort for parent_element_id
async function migrateElements(
  gfxClient: SupabaseClient,
  novaClient: SupabaseClient,
  mapping: MigrationMapping
): Promise<number> {
  console.log(`\nMigrating gfx_elements (with parent ordering)...`);

  // Fetch ALL elements first
  const allElements: any[] = [];
  let offset = 0;
  const batchSize = 500;

  while (true) {
    const { data: rows, error } = await gfxClient
      .from('gfx_elements')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error || !rows || rows.length === 0) break;
    allElements.push(...rows);
    if (rows.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`  Fetched ${allElements.length} elements total`);

  // Map IDs
  const mappedElements = allElements
    .map(row => mapIds(row, mapping, 'gfx_elements'))
    .filter(row => row !== null);

  console.log(`  ${mappedElements.length} elements after org filtering`);

  // Build parent->children map and find roots
  const elementMap = new Map(mappedElements.map(e => [e.id, e]));
  const roots: any[] = [];
  const children = new Map<string, any[]>();

  for (const elem of mappedElements) {
    if (!elem.parent_element_id || !elementMap.has(elem.parent_element_id)) {
      roots.push(elem);
    } else {
      const parentId = elem.parent_element_id;
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId)!.push(elem);
    }
  }

  // BFS to get insertion order (parents before children)
  const ordered: any[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const elem = queue.shift()!;
    ordered.push(elem);
    const kids = children.get(elem.id) || [];
    queue.push(...kids);
  }

  console.log(`  Inserting ${ordered.length} elements in parent-first order...`);

  // Insert in batches, respecting order
  let totalMigrated = 0;
  const insertBatchSize = 50;

  for (let i = 0; i < ordered.length; i += insertBatchSize) {
    const batch = ordered.slice(i, i + insertBatchSize);
    const { error } = await novaClient
      .from('gfx_elements')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      // Try one by one
      for (const elem of batch) {
        const { error: rowErr } = await novaClient
          .from('gfx_elements')
          .upsert([elem], { onConflict: 'id' });
        if (!rowErr) totalMigrated++;
      }
    } else {
      totalMigrated += batch.length;
    }

    if ((i + insertBatchSize) % 200 === 0 || i + insertBatchSize >= ordered.length) {
      console.log(`  Progress: ${Math.min(i + insertBatchSize, ordered.length)}/${ordered.length}`);
    }
  }

  console.log(`  Total migrated: ${totalMigrated}`);
  return totalMigrated;
}

async function migrateTable(
  gfxClient: SupabaseClient,
  novaClient: SupabaseClient,
  tableName: string,
  mapping: MigrationMapping,
  batchSize = 100
): Promise<number> {
  console.log(`\nMigrating ${tableName}...`);

  let offset = 0;
  let totalMigrated = 0;

  while (true) {
    const { data: rows, error } = await gfxClient
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`  Error fetching from ${tableName}:`, error.message);
      break;
    }

    if (!rows || rows.length === 0) {
      break;
    }

    // Map IDs for each row, filter out rows with unmapped organizations
    const mappedRows = rows.map(row => mapIds(row, mapping, tableName)).filter(row => row !== null);

    if (mappedRows.length === 0) {
      console.log(`  Skipped ${rows.length} rows (unmapped organization)`);
    } else {
      // Try batch insert first
      const { error: insertError } = await novaClient
        .from(tableName)
        .upsert(mappedRows, { onConflict: 'id' });

      if (insertError) {
        // Batch failed - try one by one to skip bad rows
        console.warn(`  Batch insert failed: ${insertError.message}`);
        console.log(`  Retrying row-by-row...`);
        let successCount = 0;
        for (const row of mappedRows) {
          const { error: rowError } = await novaClient
            .from(tableName)
            .upsert([row], { onConflict: 'id' });
          if (rowError) {
            console.warn(`    Skipped row ${row.id}: ${rowError.message}`);
          } else {
            successCount++;
          }
        }
        totalMigrated += successCount;
        console.log(`  Migrated ${successCount}/${mappedRows.length} rows from this batch`);
      } else {
        totalMigrated += mappedRows.length;
        console.log(`  Migrated ${totalMigrated} rows...`);
      }
    }

    if (rows.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  console.log(`  Total migrated: ${totalMigrated}`);
  return totalMigrated;
}

async function main() {
  console.log('='.repeat(60));
  console.log('GFX to Nova Migration Script');
  console.log('='.repeat(60));

  // Validate environment
  if (!GFX_SUPABASE_SERVICE_KEY) {
    console.error('ERROR: GFX_SUPABASE_SERVICE_KEY environment variable is required');
    console.error('Set it with: export GFX_SUPABASE_SERVICE_KEY=your_service_role_key');
    process.exit(1);
  }

  if (!NOVA_SUPABASE_SERVICE_KEY) {
    console.error('ERROR: NOVA_SUPABASE_SERVICE_KEY environment variable is required');
    console.error('Set it with: export NOVA_SUPABASE_SERVICE_KEY=your_service_role_key');
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

  // Build ID mappings
  const mapping = await buildMappings(gfxClient, novaClient);

  if (mapping.orgIdMap.size === 0) {
    console.error('\nERROR: No organization mappings found. Make sure the Emergent org exists in Nova.');
    process.exit(1);
  }

  // Migrate GFX tables (in order of dependencies)
  // Note: gfx_elements is handled separately with special ordering
  const gfxTables = [
    'gfx_projects',
    'gfx_project_design_systems',
    'gfx_folders',
    'gfx_templates',
    'gfx_layers',
    // 'gfx_elements' - handled separately below
    'gfx_animations',
    'gfx_keyframes',
    'gfx_bindings',
    'gfx_animation_presets',
    'gfx_template_versions',
    'gfx_chat_history',
    'gfx_chat_messages',
    'gfx_playback_state',
    'gfx_playback_commands',
    'gfx_support_tickets',
    'organization_textures',
  ];

  console.log('\n' + '='.repeat(60));
  console.log('Migrating GFX Tables');
  console.log('='.repeat(60));

  for (const table of gfxTables) {
    if (table === 'gfx_layers') {
      await migrateTable(gfxClient, novaClient, table, mapping);
      // After layers, migrate elements with special ordering
      await migrateElements(gfxClient, novaClient, mapping);
    } else {
      await migrateTable(gfxClient, novaClient, table, mapping);
    }
  }

  // Migrate Pulsar tables - channels first since playlists reference them
  const pulsarTables = [
    'pulsar_channels',        // First - no FK dependencies
    'pulsar_channel_state',   // References channels
    'pulsar_playlists',       // References channels
    'pulsar_page_groups',     // References playlists
    'pulsar_pages',           // References playlists, templates
    'pulsar_playlist_page_links', // References pages and playlists
    'pulsar_custom_uis',
    'pulsar_custom_ui_controls',
    'pulsar_command_log',
    'pulsar_playout_log',
    'pulsar_page_library',
    'pulsar_user_preferences',
  ];

  console.log('\n' + '='.repeat(60));
  console.log('Migrating Pulsar Tables');
  console.log('='.repeat(60));

  for (const table of pulsarTables) {
    await migrateTable(gfxClient, novaClient, table, mapping);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Verify the data in Nova Supabase dashboard');
  console.log('2. Run the storage migration script to copy files');
  console.log('3. Update the Nova-GFX app to point to Nova Supabase');
}

main().catch(console.error);
