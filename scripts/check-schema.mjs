import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkColumn(table, column) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${column}&limit=0`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  return response.ok;
}

async function checkTable(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=0`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  return response.ok;
}

console.log('Checking existing schema...\n');

const results = [];

// Check each migration's schema
const displayOrder = await checkColumn('todos', 'display_order');
console.log(displayOrder ? '✅' : '❌', '20260201_add_display_order:', displayOrder ? 'EXISTS' : 'MISSING');
results.push({ name: '20260201_add_display_order', exists: displayOrder });

const attachments = await checkColumn('messages', 'attachments');
console.log(attachments ? '✅' : '❌', '20260201_chat_attachments:', attachments ? 'EXISTS' : 'MISSING');
results.push({ name: '20260201_chat_attachments', exists: attachments });

const pushSubs = await checkTable('push_subscriptions');
console.log(pushSubs ? '✅' : '❌', '20260201_push_subscriptions:', pushSubs ? 'EXISTS' : 'MISSING');
results.push({ name: '20260201_push_subscriptions', exists: pushSubs });

const readBy = await checkColumn('messages', 'read_by');
console.log(readBy ? '✅' : '❌', '20260201_read_receipts:', readBy ? 'EXISTS' : 'MISSING');
results.push({ name: '20260201_read_receipts', exists: readBy });

const versions = await checkTable('todo_versions');
console.log(versions ? '✅' : '❌', '20260201_version_history:', versions ? 'EXISTS' : 'MISSING');
results.push({ name: '20260201_version_history', exists: versions });

// Check agency_id on goal_milestones (from 20260203 migration)
const agencyId = await checkColumn('goal_milestones', 'agency_id');
console.log(agencyId ? '✅' : '❌', '20260203_fix_agency_scoping (goal_milestones.agency_id):', agencyId ? 'EXISTS' : 'MISSING');

console.log('\n---');
console.log('Migrations to mark as applied (schema already exists):');
results.filter(r => r.exists).forEach(r => console.log('  -', r.name));
