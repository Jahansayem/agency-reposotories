#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function fixMigration() {
  console.log('🔍 Checking migration status...\n');
  
  // Get Bealer Agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug')
    .eq('slug', 'bealer-agency')
    .single();
  
  if (!agency) {
    console.log('❌ Bealer Agency not found!');
    console.log('   Need to run full migration in Supabase SQL Editor:');
    console.log('   SELECT migrate_to_bealer_agency();\n');
    return;
  }
  
  console.log('✅ Bealer Agency found:', agency.name);
  console.log('   ID:', agency.id, '\n');
  
  // Check todos
  const { count: nullTodos } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .is('agency_id', null);
  
  if (nullTodos === 0) {
    console.log('✅ All todos already assigned to Bealer Agency\n');
    return;
  }
  
  console.log(`⚠️  Found ${nullTodos} todos without agency_id`);
  console.log('   Fixing now...\n');
  
  // Fix todos
  const { error: todosError } = await supabase
    .from('todos')
    .update({ agency_id: agency.id })
    .is('agency_id', null);
  
  if (todosError) {
    console.log('❌ Failed to update todos:', todosError.message);
    return;
  }
  
  // Fix messages
  await supabase.from('messages').update({ agency_id: agency.id }).is('agency_id', null);
  
  // Fix activity_log  
  await supabase.from('activity_log').update({ agency_id: agency.id }).is('agency_id', null);
  
  // Fix task_templates
  await supabase.from('task_templates').update({ agency_id: agency.id }).is('agency_id', null);
  
  // Fix strategic_goals
  await supabase.from('strategic_goals').update({ agency_id: agency.id }).is('agency_id', null);
  
  // Fix goal_categories
  await supabase.from('goal_categories').update({ agency_id: agency.id }).is('agency_id', null);
  
  console.log('✅ Successfully backfilled agency_id on all tables\n');
  
  // Verify
  const { count: remainingNull } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .is('agency_id', null);
  
  console.log('📊 Verification:');
  console.log('   Todos without agency_id:', remainingNull);
  console.log('   Status:', remainingNull === 0 ? '✅ COMPLETE' : '❌ INCOMPLETE\n');
}

fixMigration().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
