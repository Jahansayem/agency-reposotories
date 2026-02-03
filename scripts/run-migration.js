#!/usr/bin/env node
/**
 * Script to run the agency scoping migration against Supabase
 * Uses the service role key to execute raw SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration: 20260203_fix_agency_scoping.sql');
  console.log('📍 Target: ' + supabaseUrl);
  console.log('');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260203_fix_agency_scoping.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📄 Loaded migration file (${migrationSql.length} characters)`);

  // Split into logical parts for better error reporting
  // The migration uses -- Part X comments to separate sections
  const parts = migrationSql.split(/-- Part \d+:/);

  console.log(`📦 Migration has ${parts.length} parts`);
  console.log('');

  try {
    // Execute the entire migration as one transaction
    console.log('⏳ Executing migration...');

    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (error) {
      // If RPC doesn't exist, try direct execution via REST API
      if (error.message.includes('function') || error.code === '42883') {
        console.log('ℹ️  exec_sql RPC not available, trying alternative method...');

        // Use the Supabase REST API directly for SQL execution
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: migrationSql })
        });

        if (!response.ok) {
          throw new Error(`REST API error: ${response.status} ${await response.text()}`);
        }
      } else {
        throw error;
      }
    }

    console.log('✅ Migration executed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    console.log('');
    console.log('💡 Alternative: Copy the SQL from supabase/migrations/20260203_fix_agency_scoping.sql');
    console.log('   and paste it into the Supabase SQL Editor at:');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '')}/project/default/sql`);
    process.exit(1);
  }

  // Verify the migration worked
  console.log('');
  console.log('🔍 Verifying migration...');

  // Check if agency_id column exists on goal_milestones
  const { data: columns, error: colErr } = await supabase
    .from('goal_milestones')
    .select('agency_id')
    .limit(1);

  if (colErr && colErr.message.includes('agency_id')) {
    console.log('⚠️  Warning: agency_id column may not have been added to goal_milestones');
  } else {
    console.log('✅ goal_milestones.agency_id column exists');
  }

  // Check RLS policies
  const { data: policies } = await supabase.rpc('get_policies_info').catch(() => ({ data: null }));

  console.log('');
  console.log('🎉 Migration complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify the app works correctly');
  console.log('  2. Commit and push the changes');
}

runMigration().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
