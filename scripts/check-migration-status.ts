#!/usr/bin/env ts-node
/**
 * Check Migration Status
 *
 * Shows the current status of schema migration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('📊 Schema Migration Status\n');

  // Get migration status
  const { data: status, error } = await supabase
    .from('schema_migration_status')
    .select('*')
    .eq('table_name', 'todos')
    .single();

  if (error) {
    console.log('   ⚠️  No migration in progress or not started yet');
    return;
  }

  if (!status) {
    console.log('   📋 Migration not started');
    return;
  }

  console.log(`   Status: ${status.status}`);
  console.log(`   Total Rows: ${status.total_rows}`);
  console.log(`   Migrated: ${status.rows_migrated}`);

  if (status.total_rows > 0) {
    const percentage = Math.round((status.rows_migrated / status.total_rows) * 100);
    console.log(`   Progress: ${percentage}%`);
  }

  if (status.migration_started_at) {
    console.log(`   Started: ${new Date(status.migration_started_at).toLocaleString()}`);
  }

  if (status.migration_completed_at) {
    console.log(`   Completed: ${new Date(status.migration_completed_at).toLocaleString()}`);

    // Calculate duration
    const start = new Date(status.migration_started_at).getTime();
    const end = new Date(status.migration_completed_at).getTime();
    const duration = Math.round((end - start) / 1000);
    console.log(`   Duration: ${duration} seconds`);
  }

  if (status.last_updated) {
    console.log(`   Last Updated: ${new Date(status.last_updated).toLocaleString()}`);
  }

  // Check for errors
  const { data: errors } = await supabase
    .from('migration_errors')
    .select('*')
    .eq('table_name', 'todos')
    .order('created_at', { ascending: false })
    .limit(10);

  if (errors && errors.length > 0) {
    console.log(`\n   ⚠️  Found ${errors.length} errors (showing last 10):`);
    errors.forEach(err => {
      console.log(`      - Todo ${err.record_id}: ${err.error}`);
    });
  } else {
    console.log('\n   ✅ No errors found');
  }
}

main().catch(error => {
  console.error('\n❌ Failed to check status:', error);
  process.exit(1);
});
