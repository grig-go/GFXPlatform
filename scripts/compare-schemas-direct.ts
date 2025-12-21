/**
 * Direct Schema Comparison Script
 * Queries information_schema directly via REST API to compare actual table structures
 */

const GFX_SUPABASE_URL = 'https://ihdoylhzekyluiiigxxc.supabase.co';
const GFX_SUPABASE_SERVICE_KEY = process.env.GFX_SUPABASE_SERVICE_KEY!;

const NOVA_SUPABASE_URL = 'https://bgkjcngrslxyqjitksim.supabase.co';
const NOVA_SUPABASE_SERVICE_KEY = process.env.NOVA_SUPABASE_SERVICE_KEY!;

interface ColumnDef {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

async function getTableSchema(url: string, key: string, tableName: string): Promise<ColumnDef[]> {
  // Use PostgREST to query information_schema via RPC
  // Since we can't query information_schema directly, we'll create a function
  const response = await fetch(`${url}/rest/v1/rpc/get_table_columns`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ table_name: tableName }),
  });

  if (!response.ok) {
    // Function doesn't exist, try alternative approach
    return [];
  }

  return await response.json();
}

async function executeSQL(url: string, key: string, sql: string): Promise<any> {
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('SQL execution failed:', text);
    return null;
  }

  return await response.json();
}

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

async function main() {
  console.log('='.repeat(70));
  console.log('Direct Schema Comparison: Nova-GFX Cloud vs Nova Cloud');
  console.log('='.repeat(70));

  // First, let's try to get one row from each table in GFX to see all columns
  // This works because GFX has data

  console.log('\n--- GFX Table Schemas (from data) ---\n');

  const gfxSchemas: Record<string, string[]> = {};
  const novaSchemas: Record<string, string[]> = {};

  for (const table of tablesToCompare) {
    // Get GFX columns from one row of data
    const gfxResponse = await fetch(
      `${GFX_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
      {
        headers: {
          'apikey': GFX_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${GFX_SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (gfxResponse.ok) {
      const data = await gfxResponse.json();
      if (data && data.length > 0) {
        gfxSchemas[table] = Object.keys(data[0]).sort();
      } else {
        // Table exists but empty, try to get column names from error message
        const countResponse = await fetch(
          `${GFX_SUPABASE_URL}/rest/v1/${table}?select=count`,
          {
            method: 'HEAD',
            headers: {
              'apikey': GFX_SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${GFX_SUPABASE_SERVICE_KEY}`,
              'Prefer': 'count=exact',
            },
          }
        );
        console.log(`  ${table}: Empty in GFX (exists but no data)`);
        gfxSchemas[table] = [];
      }
    } else {
      console.log(`  ${table}: Not found in GFX`);
      gfxSchemas[table] = [];
    }

    // Get Nova columns from one row of data
    const novaResponse = await fetch(
      `${NOVA_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
      {
        headers: {
          'apikey': NOVA_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${NOVA_SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (novaResponse.ok) {
      const data = await novaResponse.json();
      if (data && data.length > 0) {
        novaSchemas[table] = Object.keys(data[0]).sort();
      } else {
        // Table exists but empty - need alternate method
        novaSchemas[table] = [];
      }
    } else {
      const errorText = await novaResponse.text();
      if (errorText.includes('does not exist')) {
        console.log(`  ${table}: DOES NOT EXIST in Nova`);
      }
      novaSchemas[table] = [];
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('GFX Table Column Definitions (from actual data)');
  console.log('='.repeat(70));

  for (const table of tablesToCompare) {
    const columns = gfxSchemas[table];
    if (columns && columns.length > 0) {
      console.log(`\n${table} (${columns.length} columns):`);
      console.log(`  ${columns.join(', ')}`);
    }
  }

  // Now we need to figure out what columns Nova is missing
  // Since Nova tables are empty, we need a different approach
  // Let's use the pg_catalog through a workaround

  console.log('\n' + '='.repeat(70));
  console.log('Generating Complete Table Definitions from GFX');
  console.log('='.repeat(70));

  // For each table with data, generate a CREATE TABLE statement
  const createStatements: string[] = [];

  for (const table of tablesToCompare) {
    const columns = gfxSchemas[table];
    if (!columns || columns.length === 0) continue;

    // Get a sample row to infer types
    const gfxResponse = await fetch(
      `${GFX_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
      {
        headers: {
          'apikey': GFX_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${GFX_SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await gfxResponse.json();
    if (!data || data.length === 0) continue;

    const row = data[0];

    console.log(`\n-- ${table}`);

    const columnDefs: string[] = [];
    for (const col of columns) {
      const value = row[col];
      let dataType = 'TEXT';

      if (value === null) {
        // Can't determine type from null, default to TEXT
        dataType = 'TEXT';
      } else if (typeof value === 'boolean') {
        dataType = 'BOOLEAN';
      } else if (typeof value === 'number') {
        dataType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
      } else if (Array.isArray(value)) {
        dataType = 'TEXT[]';
      } else if (typeof value === 'object') {
        dataType = 'JSONB';
      } else if (typeof value === 'string') {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          dataType = 'UUID';
        } else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
          dataType = 'TIMESTAMPTZ';
        }
      }

      columnDefs.push(`  ${col} ${dataType}`);
      console.log(`  ${col}: ${dataType} (sample: ${JSON.stringify(value).substring(0, 50)})`);
    }
  }
}

main().catch(console.error);
