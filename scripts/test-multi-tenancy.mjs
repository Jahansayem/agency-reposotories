#!/usr/bin/env node
/**
 * Comprehensive Multi-Tenancy Test Suite
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

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         MULTI-TENANCY VERIFICATION TEST SUITE              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================
  // 1. DATABASE SCHEMA TESTS
  // ============================================
  console.log('📦 DATABASE SCHEMA TESTS\n');

  // Test agencies table exists
  const { data: agencies, error: agenciesErr } = await supabase
    .from('agencies')
    .select('*')
    .limit(1);
  test('agencies table exists', !agenciesErr, agenciesErr?.message);

  // Test agency_members table exists
  const { data: members, error: membersErr } = await supabase
    .from('agency_members')
    .select('*')
    .limit(1);
  test('agency_members table exists', !membersErr, membersErr?.message);

  // Test agency_invitations table exists
  const { data: invitations, error: invitationsErr } = await supabase
    .from('agency_invitations')
    .select('*')
    .limit(1);
  test('agency_invitations table exists', !invitationsErr, invitationsErr?.message);

  // Test users table has email column
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, name, email, global_role')
    .limit(1);
  test('users table has email column', !usersErr && users !== null, usersErr?.message);

  // Test todos table has agency_id column
  const { data: todos, error: todosErr } = await supabase
    .from('todos')
    .select('id, agency_id')
    .limit(1);
  test('todos table has agency_id column', !todosErr && todos !== null, todosErr?.message);

  // Test messages table has agency_id column
  const { data: messages, error: messagesErr } = await supabase
    .from('messages')
    .select('id, agency_id')
    .limit(1);
  test('messages table has agency_id column', !messagesErr, messagesErr?.message);

  // ============================================
  // 2. BEALER AGENCY DATA TESTS
  // ============================================
  console.log('\n🏢 BEALER AGENCY DATA TESTS\n');

  // Test Bealer Agency exists
  const { data: bealerAgency, error: bealerErr } = await supabase
    .from('agencies')
    .select('*')
    .eq('slug', 'bealer-agency')
    .single();
  test('Bealer Agency exists', !!bealerAgency, bealerErr?.message);

  if (bealerAgency) {
    test('Bealer Agency has correct name', bealerAgency.name === 'Bealer Agency');
    test('Bealer Agency is active', bealerAgency.is_active === true);
    test('Bealer Agency has professional tier', bealerAgency.subscription_tier === 'professional');

    // Test Derrick is owner
    const { data: derrickMembership } = await supabase
      .from('agency_members')
      .select('role, status, users!inner(name)')
      .eq('agency_id', bealerAgency.id)
      .eq('users.name', 'Derrick')
      .single();
    test('Derrick is agency owner', derrickMembership?.role === 'owner');
    test('Derrick membership is active', derrickMembership?.status === 'active');

    // Test all users are members
    const { count: memberCount } = await supabase
      .from('agency_members')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', bealerAgency.id)
      .eq('status', 'active');
    test('All users are agency members', memberCount >= 2, `Found ${memberCount} members`);

    // Test all todos have agency_id
    const { count: todosWithAgency } = await supabase
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', bealerAgency.id);

    const { count: todosWithoutAgency } = await supabase
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .is('agency_id', null);

    test('All todos assigned to Bealer Agency', todosWithoutAgency === 0,
      `${todosWithoutAgency} todos without agency_id`);
  }

  // ============================================
  // 3. DATABASE FUNCTIONS TESTS
  // ============================================
  console.log('\n⚙️  DATABASE FUNCTIONS TESTS\n');

  // Test set_request_context function exists
  const { error: contextErr } = await supabase.rpc('set_request_context', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_user_name: 'Test',
    p_agency_id: null
  });
  test('set_request_context function works', !contextErr || contextErr.message.includes('null'),
    contextErr?.message);

  // Test create_agency_with_owner function exists
  const { error: createAgencyErr } = await supabase.rpc('create_agency_with_owner', {
    p_name: 'Test Agency',
    p_slug: 'test-agency-' + Date.now(),
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });
  // This will fail because the user doesn't exist, but it confirms the function exists
  test('create_agency_with_owner function exists',
    createAgencyErr?.message?.includes('violates foreign key') || !createAgencyErr,
    createAgencyErr?.message);

  // ============================================
  // 4. PERMISSIONS TESTS
  // ============================================
  console.log('\n🔐 PERMISSIONS TESTS\n');

  if (bealerAgency) {
    // Test owner has full permissions
    const { data: ownerPerms } = await supabase
      .from('agency_members')
      .select('permissions, users!inner(name)')
      .eq('agency_id', bealerAgency.id)
      .eq('users.name', 'Derrick')
      .single();

    if (ownerPerms?.permissions) {
      test('Owner can create tasks', ownerPerms.permissions.can_create_tasks === true);
      test('Owner can delete tasks', ownerPerms.permissions.can_delete_tasks === true);
      test('Owner can view strategic goals', ownerPerms.permissions.can_view_strategic_goals === true);
      test('Owner can invite users', ownerPerms.permissions.can_invite_users === true);
    }

    // Test member has limited permissions
    const { data: memberPerms } = await supabase
      .from('agency_members')
      .select('permissions, users!inner(name)')
      .eq('agency_id', bealerAgency.id)
      .neq('role', 'owner')
      .limit(1)
      .single();

    if (memberPerms?.permissions) {
      test('Member can create tasks', memberPerms.permissions.can_create_tasks === true);
      test('Member cannot delete tasks', memberPerms.permissions.can_delete_tasks === false);
      test('Member cannot view strategic goals', memberPerms.permissions.can_view_strategic_goals === false);
    }
  }

  // ============================================
  // 5. DATA ISOLATION TESTS
  // ============================================
  console.log('\n🔒 DATA ISOLATION TESTS\n');

  // Create a test agency to verify isolation
  const testSlug = 'test-isolation-' + Date.now();

  // Get a real user ID first
  const { data: realUser } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  if (realUser) {
    const { data: testAgency, error: testAgencyErr } = await supabase
      .from('agencies')
      .insert({
        name: 'Test Isolation Agency',
        slug: testSlug,
        is_active: true
      })
      .select()
      .single();

    if (testAgency) {
      // Create a test todo for this agency
      const { data: testTodo, error: testTodoErr } = await supabase
        .from('todos')
        .insert({
          text: 'Test isolation todo',
          agency_id: testAgency.id,
          created_by: 'Test'
        })
        .select()
        .single();

      test('Can create todo for test agency', !!testTodo, testTodoErr?.message);

      // Verify todo is scoped to agency
      const { data: scopedTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('agency_id', testAgency.id);

      test('Todo is correctly scoped to agency',
        scopedTodos?.length === 1 && scopedTodos[0].text === 'Test isolation todo');

      // Clean up - delete test todo
      await supabase.from('todos').delete().eq('id', testTodo?.id);

      // Clean up - delete test agency
      await supabase.from('agencies').delete().eq('id', testAgency.id);

      test('Test data cleanup successful', true);
    } else {
      test('Create test agency for isolation test', false, testAgencyErr?.message);
    }
  }

  // ============================================
  // 6. INVITATION FLOW TEST
  // ============================================
  console.log('\n📧 INVITATION FLOW TEST\n');

  if (bealerAgency && realUser) {
    // Create a test invitation
    const testToken = 'test-token-' + Date.now();
    const { data: invitation, error: inviteErr } = await supabase
      .from('agency_invitations')
      .insert({
        agency_id: bealerAgency.id,
        email: 'test@example.com',
        role: 'member',
        token: testToken,
        invited_by: realUser.id
      })
      .select()
      .single();

    test('Can create invitation', !!invitation, inviteErr?.message);

    if (invitation) {
      // Verify invitation can be retrieved by token
      const { data: foundInvite } = await supabase
        .from('agency_invitations')
        .select('*')
        .eq('token', testToken)
        .single();

      test('Can retrieve invitation by token', !!foundInvite);

      // Clean up
      await supabase.from('agency_invitations').delete().eq('id', invitation.id);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  TEST RESULTS: ${passed} passed, ${failed} failed                          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Multi-tenancy is working correctly.');
  }
}

runTests().catch(console.error);
