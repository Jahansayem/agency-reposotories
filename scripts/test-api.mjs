#!/usr/bin/env node
/**
 * Test the API endpoints for multi-tenancy
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

const BASE_URL = 'http://localhost:3001';

async function testAPIs() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              API ENDPOINT TESTS                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get Derrick's user ID and Bealer Agency ID
  const { data: derrick } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Derrick')
    .single();

  const { data: bealerAgency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', 'bealer-agency')
    .single();

  if (!derrick || !bealerAgency) {
    console.log('❌ Could not find Derrick or Bealer Agency');
    return;
  }

  console.log(`Using user: ${derrick.name} (${derrick.id})`);
  console.log(`Using agency: ${bealerAgency.id}\n`);

  // Create session cookie value
  const session = JSON.stringify({
    userId: derrick.id,
    userName: derrick.name,
    loginAt: new Date().toISOString()
  });

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `todoSession=${encodeURIComponent(session)}`,
    'X-Agency-Id': bealerAgency.id
  };

  // Test 1: GET /api/todos
  console.log('📋 Testing GET /api/todos...');
  try {
    const res = await fetch(`${BASE_URL}/api/todos`, { headers });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      console.log(`   ✅ Success - Retrieved ${data.length} todos`);
    } else {
      console.log(`   ❌ Failed - ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`   ❌ Error - ${err.message}`);
  }

  // Test 2: GET /api/templates
  console.log('\n📝 Testing GET /api/templates...');
  try {
    const res = await fetch(`${BASE_URL}/api/templates?userName=${derrick.name}`, { headers });
    const data = await res.json();

    if (res.ok) {
      console.log(`   ✅ Success - Retrieved ${data.length || 0} templates`);
    } else {
      console.log(`   ❌ Failed - ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`   ❌ Error - ${err.message}`);
  }

  // Test 3: GET /api/activity
  console.log('\n📊 Testing GET /api/activity...');
  try {
    const res = await fetch(`${BASE_URL}/api/activity`, { headers });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      console.log(`   ✅ Success - Retrieved ${data.length} activity entries`);
    } else {
      console.log(`   ❌ Failed - ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`   ❌ Error - ${err.message}`);
  }

  // Test 4: GET /api/goals (owner-only)
  console.log('\n🎯 Testing GET /api/goals (owner-only)...');
  try {
    const res = await fetch(`${BASE_URL}/api/goals`, { headers });
    const data = await res.json();

    if (res.ok) {
      console.log(`   ✅ Success - Retrieved ${data.length || 0} goals`);
    } else {
      console.log(`   ❌ Failed - ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`   ❌ Error - ${err.message}`);
  }

  // Test 5: POST /api/todos (create with agency_id)
  console.log('\n➕ Testing POST /api/todos (create todo)...');
  try {
    const newTodo = {
      text: 'Test multi-tenancy todo - ' + Date.now(),
      priority: 'medium',
      created_by: derrick.name,
      agency_id: bealerAgency.id
    };

    const res = await fetch(`${BASE_URL}/api/todos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newTodo)
    });
    const data = await res.json();

    if (res.ok && data.id) {
      console.log(`   ✅ Success - Created todo ${data.id}`);

      // Verify agency_id was set
      const { data: verifyTodo } = await supabase
        .from('todos')
        .select('agency_id')
        .eq('id', data.id)
        .single();

      if (verifyTodo?.agency_id === bealerAgency.id) {
        console.log(`   ✅ Todo has correct agency_id`);
      } else {
        console.log(`   ❌ Todo agency_id mismatch`);
      }

      // Clean up
      await supabase.from('todos').delete().eq('id', data.id);
      console.log(`   ✅ Test todo cleaned up`);
    } else {
      console.log(`   ❌ Failed - ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`   ❌ Error - ${err.message}`);
  }

  // Test 6: Check feature flag is working
  console.log('\n🚩 Testing feature flag...');
  console.log(`   NEXT_PUBLIC_ENABLE_MULTI_TENANCY = ${env.NEXT_PUBLIC_ENABLE_MULTI_TENANCY}`);
  if (env.NEXT_PUBLIC_ENABLE_MULTI_TENANCY === 'true') {
    console.log(`   ✅ Multi-tenancy is enabled`);
  } else {
    console.log(`   ⚠️  Multi-tenancy is NOT enabled`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              API TESTS COMPLETE                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

testAPIs().catch(console.error);
