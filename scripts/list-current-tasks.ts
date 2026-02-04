/**
 * List All Current Tasks
 * Shows exactly what's in the database right now
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📋 Current Tasks in Database\n');
  console.log('=' .repeat(80) + '\n');

  // Get all tasks
  const { data: allTasks, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!allTasks || allTasks.length === 0) {
    console.log('❌ No tasks found in database!\n');
    return;
  }

  console.log(`Total tasks: ${allTasks.length}\n`);

  // Group by status
  const incomplete = allTasks.filter(t => !t.completed);
  const completed = allTasks.filter(t => t.completed);

  console.log(`📊 Breakdown:`);
  console.log(`   ⬜ Incomplete: ${incomplete.length}`);
  console.log(`   ✅ Completed: ${completed.length}\n`);

  console.log('━'.repeat(80));
  console.log('INCOMPLETE TASKS');
  console.log('━'.repeat(80) + '\n');

  if (incomplete.length === 0) {
    console.log('   (none)\n');
  } else {
    incomplete.forEach((task, i) => {
      console.log(`${i + 1}. ${task.text}`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   Created by: ${task.created_by}`);
      console.log(`   Assigned to: ${task.assigned_to || '(unassigned)'}`);
      console.log(`   Priority: ${task.priority || 'medium'}`);
      console.log('');
    });
  }

  console.log('━'.repeat(80));
  console.log(`COMPLETED TASKS (showing first 20 of ${completed.length})`);
  console.log('━'.repeat(80) + '\n');

  completed.slice(0, 20).forEach((task, i) => {
    console.log(`${i + 1}. ${task.text}`);
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    console.log(`   Completed: ✅`);
    console.log('');
  });

  if (completed.length > 20) {
    console.log(`   ... and ${completed.length - 20} more completed tasks\n`);
  }

  // Tasks created in last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentTasks = allTasks.filter(t => new Date(t.created_at) > oneDayAgo);

  console.log('━'.repeat(80));
  console.log(`RECENT TASKS (created in last 24 hours)`);
  console.log('━'.repeat(80) + '\n');

  if (recentTasks.length === 0) {
    console.log('   (none)\n');
  } else {
    recentTasks.forEach((task, i) => {
      console.log(`${i + 1}. ${task.text}`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   Status: ${task.completed ? '✅ Completed' : '⬜ Incomplete'}`);
      console.log('');
    });
  }

  console.log('=' .repeat(80));
}

main().catch(console.error);
