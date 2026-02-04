/**
 * Verify API endpoints are working correctly after migration
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    const status = response.status;
    const ok = status >= 200 && status < 400;

    console.log(`${ok ? '✅' : '❌'} ${name}: ${status}`);

    if (!ok && status !== 401) {
      const text = await response.text();
      console.log(`   Error: ${text.substring(0, 100)}`);
    }

    return ok;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    return false;
  }
}

console.log('Testing API Endpoints...\n');
console.log('=== Public Endpoints ===');

// Test public endpoints
await testEndpoint('Health check', `${BASE_URL}/api/health/env-check`);

console.log('\n=== Auth-Required Endpoints (expect 401 without auth) ===');

// These should return 401 (unauthorized) without auth - that's correct behavior
await testEndpoint('GET /api/todos (no auth)', `${BASE_URL}/api/todos`);
await testEndpoint('GET /api/agencies (no auth)', `${BASE_URL}/api/agencies`);

console.log('\n=== Outlook API (requires API key) ===');

const outlookApiKey = process.env.OUTLOOK_ADDON_API_KEY;
await testEndpoint('GET /api/outlook/users', `${BASE_URL}/api/outlook/users`, {
  headers: { 'X-API-Key': outlookApiKey }
});

console.log('\n=== Database Connection Test ===');

// Test database via Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const dbResponse = await fetch(`${supabaseUrl}/rest/v1/todos?select=id&limit=1`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
});

if (dbResponse.ok) {
  const data = await dbResponse.json();
  console.log(`✅ Database connection: OK (${data.length} todo returned)`);
} else {
  console.log(`❌ Database connection: ${dbResponse.status}`);
}

// Test agency-scoped data
const agencyTodos = await fetch(`${supabaseUrl}/rest/v1/todos?select=id,agency_id&limit=5`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
});

if (agencyTodos.ok) {
  const data = await agencyTodos.json();
  const withAgency = data.filter(t => t.agency_id).length;
  console.log(`✅ Agency-scoped todos: ${withAgency}/${data.length} have agency_id`);
} else {
  console.log(`❌ Agency-scoped query failed`);
}

console.log('\n=== New Schema Columns ===');

// Test new columns
const cols = [
  ['goal_milestones', 'agency_id'],
  ['todo_versions', 'agency_id'],
  ['push_subscriptions', 'id'],
  ['messages', 'attachments'],
];

for (const [table, col] of cols) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${col}&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  console.log(`${resp.ok ? '✅' : '❌'} ${table}.${col}: ${resp.ok ? 'EXISTS' : 'MISSING'}`);
}

console.log('\n✅ API verification complete!');
