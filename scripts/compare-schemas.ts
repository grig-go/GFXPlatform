/**
 * Schema Comparison Script
 * Compares gfx_* and pulsar_* table schemas between Nova-GFX and Nova databases
 */

import { createClient } from '@supabase/supabase-js';

const GFX_SUPABASE_URL = 'https://ihdoylhzekyluiiigxxc.supabase.co';
const GFX_SUPABASE_SERVICE_KEY = process.env.GFX_SUPABASE_SERVICE_KEY!;

const NOVA_SUPABASE_URL = 'https://bgkjcngrslxyqjitksim.supabase.co';
const NOVA_SUPABASE_SERVICE_KEY = process.env.NOVA_SUPABASE_SERVICE_KEY!;

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getTableColumns(client: any, tableName: string): Promise<ColumnInfo[]> {
  const { data, error } = await client.rpc('get_columns_for_table', { p_table_name: tableName });
  if (error) {
    // Fallback: query information_schema directly via REST
    return [];
  }
  return data || [];
}

async function getTablesWithPrefix(client: any, prefix: string): Promise<string[]> {
  const { data, error } = await client.rpc('get_tables_with_prefix', { p_prefix: prefix });
  if (error) {
    return [];
  }
  return (data || []).map((t: any) => t.table_name);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Schema Comparison: Nova-GFX vs Nova');
  console.log('='.repeat(60));

  const gfxClient = createClient(GFX_SUPABASE_URL, GFX_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const novaClient = createClient(NOVA_SUPABASE_URL, NOVA_SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Tables to compare
  const tablesToCompare = [
    'gfx_projects',
    'gfx_project_design_systems',
    'gfx_folders',
    'gfx_templates',
    'gfx_layers',
    'gfx_elements',
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
    'pulsar_playlists',
    'pulsar_page_groups',
    'pulsar_pages',
    'pulsar_channels',
    'pulsar_channel_state',
    'pulsar_custom_uis',
    'pulsar_custom_ui_controls',
    'pulsar_command_log',
    'pulsar_playout_log',
    'pulsar_page_library',
    'pulsar_playlist_page_links',
    'pulsar_user_preferences',
  ];

  const missingColumns: Record<string, string[]> = {};
  const alterStatements: string[] = [];

  for (const table of tablesToCompare) {
    // Get one row from GFX to see all columns
    const { data: gfxRow } = await gfxClient.from(table).select('*').limit(1);
    const { data: novaRow } = await novaClient.from(table).select('*').limit(1);

    if (!gfxRow || gfxRow.length === 0) {
      console.log(`\n${table}: No data in GFX, skipping...`);
      continue;
    }

    const gfxColumns = Object.keys(gfxRow[0]);
    const novaColumns = novaRow && novaRow.length > 0 ? Object.keys(novaRow[0]) : [];

    // Find columns in GFX but not in Nova
    const missing = gfxColumns.filter(col => !novaColumns.includes(col));

    if (missing.length > 0) {
      missingColumns[table] = missing;
      console.log(`\n${table}:`);
      console.log(`  Missing in Nova: ${missing.join(', ')}`);

      // Generate ALTER statements
      for (const col of missing) {
        const value = gfxRow[0][col];
        let dataType = 'TEXT';
        if (value === null) {
          dataType = 'TEXT'; // Default to TEXT for null
        } else if (typeof value === 'boolean') {
          dataType = 'BOOLEAN DEFAULT FALSE';
        } else if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            dataType = 'INTEGER';
          } else {
            dataType = 'NUMERIC';
          }
        } else if (typeof value === 'object') {
          dataType = 'JSONB';
        } else if (typeof value === 'string') {
          // Check if it looks like a UUID
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            dataType = 'UUID';
          } else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            dataType = 'TIMESTAMPTZ';
          }
        }
        alterStatements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${dataType};`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Generated ALTER Statements:');
  console.log('='.repeat(60));
  console.log(alterStatements.join('\n'));

  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  for (const [table, cols] of Object.entries(missingColumns)) {
    console.log(`${table}: ${cols.length} missing columns`);
  }
}

main().catch(console.error);
