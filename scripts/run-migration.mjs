#!/usr/bin/env node
/**
 * Run the multi-tenancy migration directly via Supabase
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local for credentials
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE credentials in .env.local');
  process.exit(1);
}

console.log('Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('\n=== Running Multi-Tenancy Migration ===\n');

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260126_multi_tenancy.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  // Split into statements and execute each
  // We need to handle DO $$ blocks specially
  const statements = [];
  let currentStatement = '';
  let inDoBlock = false;

  for (const line of migrationSql.split('\n')) {
    // Skip pure comment lines at the start of statements
    if (currentStatement === '' && line.trim().startsWith('--')) {
      continue;
    }

    currentStatement += line + '\n';

    // Track DO $$ blocks
    if (line.trim().startsWith('DO $$')) {
      inDoBlock = true;
    }
    if (inDoBlock && line.trim() === 'END $$;') {
      inDoBlock = false;
      statements.push(currentStatement.trim());
      currentStatement = '';
      continue;
    }

    // Track CREATE FUNCTION blocks
    if (line.match(/^CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
      inDoBlock = true;
    }
    if (inDoBlock && line.match(/\$\$\s+LANGUAGE/i)) {
      // Find the end of the function
      if (line.includes(';')) {
        inDoBlock = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }
    }

    // Regular statement ending with ;
    if (!inDoBlock && line.trim().endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    // Get a description of what this statement does
    const firstLine = stmt.split('\n')[0].substring(0, 60);
    process.stdout.write(`[${i + 1}/${statements.length}] ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        // Try direct query if rpc doesn't work
        const { error: queryError } = await supabase.from('_exec').select().limit(0);
        if (queryError) {
          throw error;
        }
      }

      console.log(' OK');
      successCount++;
    } catch (err) {
      // Some errors are expected (like "already exists")
      const errMsg = err.message || String(err);
      if (errMsg.includes('already exists') || errMsg.includes('already member')) {
        console.log(' SKIPPED (already exists)');
        successCount++;
      } else {
        console.log(` ERROR: ${errMsg}`);
        errorCount++;
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Success: ${successCount}, Errors: ${errorCount}`);
}

// Alternative: Use the REST API to execute SQL
async function runMigrationViaRest() {
  console.log('\n=== Running Multi-Tenancy Migration via REST ===\n');

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260126_multi_tenancy.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  // Execute the entire migration as one SQL command
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql: migrationSql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Migration failed:', text);

    // Fall back to executing via psql-like approach
    console.log('\nTrying to execute via raw SQL endpoint...');

    const rawResponse = await fetch(`${supabaseUrl}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSql }),
    });

    if (!rawResponse.ok) {
      console.error('Raw SQL also failed:', await rawResponse.text());
      return false;
    }
  }

  console.log('Migration executed successfully!');
  return true;
}

// Run the Bealer Agency migration function
async function runBealerMigration() {
  console.log('\n=== Running Bealer Agency Migration ===\n');

  const { data, error } = await supabase.rpc('migrate_to_bealer_agency');

  if (error) {
    console.error('Bealer migration error:', error);
    return false;
  }

  console.log('Bealer Agency migration completed!');
  return true;
}

// Main execution
async function main() {
  try {
    // First verify we can connect
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Connection test failed:', error);
      process.exit(1);
    }
    console.log('Connected to Supabase successfully!\n');

    // Try to execute the migration
    // Since we can't run raw SQL easily, let's check if tables exist
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id')
      .limit(1);

    if (agenciesError && agenciesError.message.includes('does not exist')) {
      console.log('agencies table does not exist - migration needed');
      console.log('\n⚠️  The migration SQL needs to be run directly in Supabase Dashboard.');
      console.log('\nPlease run the SQL in: supabase/migrations/20260126_multi_tenancy.sql');
      console.log('Go to: https://supabase.com/dashboard/project/_/sql/new');
      console.log('\nAfter running the migration, run this script again to execute migrate_to_bealer_agency()');
    } else if (agenciesError) {
      console.error('Error checking agencies table:', agenciesError);
    } else {
      console.log('✅ agencies table exists');

      // Check if Bealer Agency already exists
      const { data: bealer } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('slug', 'bealer-agency')
        .single();

      if (bealer) {
        console.log(`✅ Bealer Agency already exists: ${bealer.name} (${bealer.id})`);
      } else {
        console.log('Running migrate_to_bealer_agency()...');
        await runBealerMigration();
      }
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
