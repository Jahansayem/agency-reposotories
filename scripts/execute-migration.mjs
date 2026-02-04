/**
 * Execute the agency scoping migration using fetch to call Supabase SQL API
 */
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];

console.log('🚀 Migration executor');
console.log('📍 Project:', projectRef);
console.log('');

// Read migration
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260203_fix_agency_scoping.sql');
const sql = readFileSync(migrationPath, 'utf8');
console.log(`📄 Loaded migration (${sql.length} chars)`);

// Split into parts and execute each separately
// The migration has 8 parts, each starting with "-- Part X:"
const parts = sql.split(/(?=-- Part \d+:)/).filter(p => p.trim());

console.log(`📦 Found ${parts.length} parts to execute`);
console.log('');

// Execute SQL via PostgREST isn't possible for DDL
// Instead, we'll need to use the Supabase Management API or psql

// Let's try the database connection approach using the pooler
// First, let's check what endpoints are available
console.log('Checking available methods...');

// Method 1: Try using the SQL API endpoint (requires Management API key, not service key)
// Method 2: Use psql with DATABASE_URL
// Method 3: Copy-paste to dashboard

console.log('');
console.log('⚠️  Direct SQL execution requires one of:');
console.log('   1. Supabase Management API key (not service role key)');
console.log('   2. psql CLI tool');
console.log('   3. Manual paste in Supabase Dashboard SQL Editor');
console.log('');

// Let's construct the database URL for reference
const dbPassword = process.env.SUPABASE_DB_PASSWORD || '[YOUR_DB_PASSWORD]';
const dbUrl = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

console.log('📝 Database connection URL (replace password):');
console.log(dbUrl);
console.log('');

console.log('🔧 To execute via psql (if installed):');
console.log(`   psql "${dbUrl}" -f supabase/migrations/20260203_fix_agency_scoping.sql`);
console.log('');

console.log('🌐 To execute via Dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('');

// Actually, let's check if we already have the needed changes by querying the schema
// If agency_id exists on goal_milestones, migration may have already run

console.log('🔍 Checking current schema state...');

const checkResponse = await fetch(`${supabaseUrl}/rest/v1/goal_milestones?select=id,agency_id&limit=0`, {
  headers: {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`
  }
});

if (checkResponse.ok) {
  console.log('✅ goal_milestones.agency_id already exists - migration Part 1 may have been applied');
} else {
  const errText = await checkResponse.text();
  if (errText.includes('agency_id')) {
    console.log('❌ goal_milestones.agency_id does not exist - migration needed');
  } else {
    console.log('Response:', checkResponse.status, errText);
  }
}

// Check todo_versions
const checkVersions = await fetch(`${supabaseUrl}/rest/v1/todo_versions?select=id,agency_id&limit=0`, {
  headers: {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`
  }
});

if (checkVersions.ok) {
  console.log('✅ todo_versions.agency_id already exists');
} else {
  console.log('❌ todo_versions.agency_id needs migration');
}

console.log('');
console.log('='.repeat(60));
console.log('');
console.log('📋 MANUAL STEPS REQUIRED:');
console.log('');
console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('');
console.log('2. Copy and paste the SQL from:');
console.log('   supabase/migrations/20260203_fix_agency_scoping.sql');
console.log('');
console.log('3. Click "Run" to execute');
console.log('');
console.log('4. Verify success by checking for agency_id columns');
console.log('');
