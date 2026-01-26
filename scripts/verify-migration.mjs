#!/usr/bin/env node
/**
 * Verify multi-tenancy migration
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function verify() {
  console.log('=== Verifying Multi-Tenancy Migration ===\n');

  // Check agencies table
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('*');

  if (agenciesError) {
    console.error('❌ Error fetching agencies:', agenciesError);
    return;
  }

  console.log(`✅ Agencies: ${agencies.length}`);
  agencies.forEach(a => {
    console.log(`   - ${a.name} (${a.slug}) - ${a.subscription_tier}`);
  });

  // Check agency_members
  const { data: members, error: membersError } = await supabase
    .from('agency_members')
    .select(`
      user_id,
      role,
      status,
      users (name)
    `);

  if (membersError) {
    console.error('❌ Error fetching members:', membersError);
  } else {
    console.log(`\n✅ Agency Members: ${members.length}`);
    members.forEach(m => {
      const userName = m.users?.name || 'Unknown';
      console.log(`   - ${userName}: ${m.role} (${m.status})`);
    });
  }

  // Check todos have agency_id
  const { data: todos, error: todosError } = await supabase
    .from('todos')
    .select('id, text, agency_id')
    .limit(5);

  if (todosError) {
    console.error('❌ Error fetching todos:', todosError);
  } else {
    const withAgency = todos.filter(t => t.agency_id);
    const withoutAgency = todos.filter(t => !t.agency_id);
    console.log(`\n✅ Sample Todos (5):`);
    console.log(`   - With agency_id: ${withAgency.length}`);
    console.log(`   - Without agency_id: ${withoutAgency.length}`);
  }

  // Count all todos with/without agency_id
  const { count: totalWithAgency } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .not('agency_id', 'is', null);

  const { count: totalWithoutAgency } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .is('agency_id', null);

  console.log(`\n📊 Todo Migration Status:`);
  console.log(`   - Total with agency_id: ${totalWithAgency || 0}`);
  console.log(`   - Total without agency_id: ${totalWithoutAgency || 0}`);

  console.log('\n=== Verification Complete ===');
}

verify();
