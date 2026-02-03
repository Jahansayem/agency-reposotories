import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function query(table, select = '*') {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${select}`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  if (!response.ok) {
    return { error: await response.text() };
  }
  return { data: await response.json() };
}

console.log('Verifying data after migration...\n');

// Check todos
const { data: todos, error: todosErr } = await query('todos', 'id,text,agency_id');
if (todosErr) {
  console.log('❌ Error fetching todos:', todosErr);
} else {
  console.log(`✅ Todos: ${todos.length} records`);
  const withAgency = todos.filter(t => t.agency_id).length;
  console.log(`   - With agency_id: ${withAgency}`);
}

// Check messages
const { data: messages, error: msgsErr } = await query('messages', 'id,agency_id');
if (msgsErr) {
  console.log('❌ Error fetching messages:', msgsErr);
} else {
  console.log(`✅ Messages: ${messages.length} records`);
}

// Check users
const { data: users, error: usersErr } = await query('users', 'id,name');
if (usersErr) {
  console.log('❌ Error fetching users:', usersErr);
} else {
  console.log(`✅ Users: ${users.length} records`);
  users.forEach(u => console.log(`   - ${u.name}`));
}

// Check agencies
const { data: agencies, error: agErr } = await query('agencies', 'id,name');
if (agErr) {
  console.log('❌ Error fetching agencies:', agErr);
} else {
  console.log(`✅ Agencies: ${agencies.length} records`);
  agencies.forEach(a => console.log(`   - ${a.name}`));
}

// Check agency members
const { data: members, error: memErr } = await query('agency_members', 'id,role,user_id,agency_id');
if (memErr) {
  console.log('❌ Error fetching agency_members:', memErr);
} else {
  console.log(`✅ Agency members: ${members.length} records`);
}

console.log('\n✅ Data verification complete!');
