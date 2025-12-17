#!/usr/bin/env tsx
/**
 * Script to extract seed data from Supabase tables
 * Tables: weather_locations, news_provider_configs, ai_providers, data_providers, sports_leagues, sports_teams, news_articles, alpaca_stocks
 *
 * Usage:
 *   npx tsx src/supabase/scripts/extract_seed_data.ts
 *   (loads SERVICE_ROLE_KEY from .env file)
 */

import { createClient } from '@jsr/supabase__supabase-js';
import { projectId2 as projectId, publicAnonKey2 as publicAnonKey } from '../../utils/supabase/info';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Use service role key from environment variable for full database access
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const apiKey = serviceRoleKey || publicAnonKey;

if (!serviceRoleKey) {
  console.warn('⚠️  WARNING: SERVICE_ROLE_KEY not found in environment variables.');
  console.warn('⚠️  Using anon key - some tables may not be accessible due to RLS policies.');
  console.warn('⚠️  Set SERVICE_ROLE_KEY in .env for full access.\n');
}

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, apiKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TableConfig {
  name: string;
  primaryKey: string;
  uniqueConstraint?: string; // Optional unique constraint column for ON CONFLICT
  excludeColumns?: string[]; // Columns to exclude from extraction (e.g., columns that don't exist in migrations)
}

const TABLES: TableConfig[] = [
  // Weather tables (from 004_weather_storage.sql)
  { name: 'weather_locations', primaryKey: 'id' },
  { name: 'weather_current', primaryKey: 'id' },
  { name: 'weather_air_quality', primaryKey: 'id' },
  { name: 'weather_hourly_forecast', primaryKey: 'id' },
  { name: 'weather_daily_forecast', primaryKey: 'id' },
  { name: 'weather_alerts', primaryKey: 'id' },

  // News provider configs (from 006_news_providers.sql)
  { name: 'news_provider_configs', primaryKey: 'id', uniqueConstraint: 'provider' },

  // AI providers (from 007_ai_providers_table.sql)
  { name: 'ai_providers', primaryKey: 'id' },

  // Unified data providers (from 008_unified_data_providers.sql)
  { name: 'data_providers', primaryKey: 'id', excludeColumns: ['dashboard', 'legacy_id', 'allow_api_key'] },

  // Sports tables (from 013 & 014)
  { name: 'sports_leagues', primaryKey: 'id' },
  { name: 'sports_teams', primaryKey: 'id' },

  // News articles (from 015_news_articles_table.sql)
  { name: 'news_articles', primaryKey: 'id' },

  // Finance tables (from 001_initial_setup.sql)
  { name: 'alpaca_stocks', primaryKey: 'id', uniqueConstraint: 'symbol' },

  // KV Store table
  { name: 'kv_store_cbef71cf', primaryKey: 'key' },
  { name: 'kv_store_629fe562', primaryKey: 'key' },
];

async function extractData(tableName: string) {
  console.log(`\nExtracting data from ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`Error extracting from ${tableName}:`, error);
    return null;
  }

  console.log(`✓ Found ${data?.length || 0} records in ${tableName}`);
  return data;
}

function generateUpsertSQL(tableName: string, data: any[], primaryKey: string, uniqueConstraint?: string, excludeColumns?: string[]): string {
  if (!data || data.length === 0) {
    return `-- No data found for ${tableName}\n\n`;
  }

  const allColumns = Object.keys(data[0]);
  const columns = excludeColumns
    ? allColumns.filter(col => !excludeColumns.includes(col))
    : allColumns;
  const sql: string[] = [];

  sql.push(`-- ============================================================`);
  sql.push(`-- SEED DATA FOR ${tableName.toUpperCase()}`);
  sql.push(`-- ============================================================`);
  sql.push(`-- Total records: ${data.length}`);
  sql.push(`-- Primary key: ${primaryKey}`);
  if (uniqueConstraint) {
    sql.push(`-- Unique constraint: ${uniqueConstraint}`);
  }
  sql.push(`\n`);

  // Generate INSERT ... ON CONFLICT statement
  sql.push(`INSERT INTO ${tableName} (${columns.join(', ')})`);
  sql.push(`VALUES`);

  const values = data.map((row, index) => {
    const rowValues = columns.map(col => {
      const value = row[col];

      // Handle NULL
      if (value === null || value === undefined) {
        return 'NULL';
      }

      // Special handling for kv_store_cbef71cf table - value column is always JSONB
      if (tableName.substring(0, 8) === 'kv_store' && col === 'value') {
        // Always treat as JSONB for this table
        if (Array.isArray(value) || typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        }
        // If it's a string, wrap it in JSON quotes (JSON.stringify) and cast to JSONB
        if (typeof value === 'string') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        }
      }

      // Handle arrays - check if it's a text array or JSONB
      if (Array.isArray(value)) {
        // Handle empty arrays - cast to text[] to avoid type ambiguity
        if (value.length === 0) {
          return `ARRAY[]::text[]`;
        }

        // Check if all elements are strings (text array)
        if (value.every(item => typeof item === 'string')) {
          // Format as PostgreSQL text array: ARRAY['val1', 'val2']::text[]
          const arrayValues = value.map(item => `'${String(item).replace(/'/g, "''")}'`).join(', ');
          return `ARRAY[${arrayValues}]::text[]`;
        }
        // Otherwise, treat as JSONB
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }

      // Handle other objects as JSONB
      if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }

      // Handle boolean
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }

      // Handle numbers
      if (typeof value === 'number') {
        return value.toString();
      }

      // Handle timestamps
      if (typeof value === 'string' && (
        col.includes('_at') ||
        col.includes('_time') ||
        col === 'published_at' ||
        col === 'sunrise' ||
        col === 'sunset'
      )) {
        return `'${value}'::timestamptz`;
      }

      // Handle strings (escape single quotes)
      return `'${String(value).replace(/'/g, "''")}'`;
    });

    const isLast = index === data.length - 1;
    return `  (${rowValues.join(', ')})${isLast ? '' : ','}`;
  });

  sql.push(...values);

  // Use uniqueConstraint if specified, otherwise use primaryKey
  const conflictColumn = uniqueConstraint || primaryKey;
  sql.push(`ON CONFLICT (${conflictColumn}) DO UPDATE SET`);

  // Generate update columns (exclude primary key, unique constraint, and created_at)
  const updateColumns = columns.filter(col =>
    col !== primaryKey &&
    col !== uniqueConstraint &&
    col !== 'created_at'
  );

  const updateSets = updateColumns.map((col, index) => {
    const isLast = index === updateColumns.length - 1;
    return `  ${col} = EXCLUDED.${col}${isLast ? ';' : ','}`;
  });

  sql.push(...updateSets);
  sql.push(`\n`);

  return sql.join('\n');
}

async function main() {
  console.log('========================================');
  console.log('Supabase Seed Data Extraction');
  console.log('========================================');
  console.log(`Project: ${projectId}`);
  console.log(`Auth: ${serviceRoleKey ? '✓ SERVICE ROLE KEY (full access)' : '✗ ANON KEY (limited access)'}`);
  console.log(`Tables: ${TABLES.map(t => t.name).join(', ')}`);
  console.log('========================================');

  const allSQL: string[] = [];

  // Header
  allSQL.push(`-- ============================================================`);
  allSQL.push(`-- SUPABASE SEED DATA`);
  allSQL.push(`-- Generated: ${new Date().toISOString()}`);
  allSQL.push(`-- Project: ${projectId}`);
  allSQL.push(`-- ============================================================`);
  allSQL.push(`-- Tables included:`);
  TABLES.forEach(t => allSQL.push(`--   - ${t.name}`));
  allSQL.push(`-- ============================================================`);
  allSQL.push(`\n`);

  // Extract and generate SQL for each table
  for (const table of TABLES) {
    const data = await extractData(table.name);
    if (data) {
      const sql = generateUpsertSQL(table.name, data, table.primaryKey, table.uniqueConstraint, table.excludeColumns);
      allSQL.push(sql);
    }
  }

  // Footer
  allSQL.push(`-- ============================================================`);
  allSQL.push(`-- END OF SEED DATA`);
  allSQL.push(`-- ============================================================`);

  // Write to file
  const outputPath = path.join(__dirname, '..', 'migrations', '016_seed_data_extracted.sql');
  fs.writeFileSync(outputPath, allSQL.join('\n'), 'utf-8');

  console.log('\n========================================');
  console.log(`✓ Seed file generated: ${outputPath}`);
  console.log('========================================\n');
}

main().catch(console.error);
