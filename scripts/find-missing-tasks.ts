/**
 * Find Missing In-Progress Tasks
 * Compares current state vs. activity log to find tasks that were in progress
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Finding Missing In-Progress Tasks\n');
  console.log('=' .repeat(80) + '\n');

  const yesterday5pm = new Date();
  yesterday5pm.setDate(yesterday5pm.getDate() - 1);
  yesterday5pm.setHours(17, 0, 0, 0);
  const yesterday5pmISO = yesterday5pm.toISOString();

  // Check current tasks with status 'in_progress'
  console.log('📊 Current In-Progress Tasks:\n');

  const { data: currentInProgress, error: currentError } = await supabase
    .from('todos')
    .select('*')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false });

  if (!currentError && currentInProgress) {
    console.log(`Found ${currentInProgress.length} tasks with status='in_progress'\n`);
    currentInProgress.forEach((task, i) => {
      console.log(`${i + 1}. "${task.text}"`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   Completed: ${task.completed ? 'Yes' : 'No'}`);
      console.log(`   ID: ${task.id}`);
      console.log('');
    });
  }

  // Check activity log for status changes to/from in_progress
  console.log('━'.repeat(80));
  console.log('📝 Recent Status Changes (last 24 hours):\n');

  const { data: statusChanges, error: statusError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'status_changed')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false });

  if (!statusError && statusChanges) {
    console.log(`Found ${statusChanges.length} status change events\n`);
    statusChanges.forEach((change, i) => {
      const details = change.details || {};
      console.log(`${i + 1}. "${change.todo_text}"`);
      console.log(`   Changed: ${details.from} → ${details.to}`);
      console.log(`   When: ${new Date(change.created_at).toLocaleString()}`);
      console.log(`   By: ${change.user_name}`);
      console.log(`   Task ID: ${change.todo_id}`);
      console.log('');
    });
  } else {
    console.log('No status changes found.\n');
  }

  // Check for tasks that were marked completed recently
  console.log('━'.repeat(80));
  console.log('✅ Tasks Completed Since Yesterday 5pm:\n');

  const { data: completedRecently, error: completedError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_completed')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false });

  if (!completedError && completedRecently) {
    console.log(`Found ${completedRecently.length} tasks marked completed\n`);
    completedRecently.forEach((event, i) => {
      console.log(`${i + 1}. "${event.todo_text}"`);
      console.log(`   Completed at: ${new Date(event.created_at).toLocaleString()}`);
      console.log(`   By: ${event.user_name}`);
      console.log(`   Task ID: ${event.todo_id}`);
      console.log('');
    });
  } else {
    console.log('No completion events found.\n');
  }

  // Check for tasks reopened
  console.log('━'.repeat(80));
  console.log('🔄 Tasks Reopened Since Yesterday 5pm:\n');

  const { data: reopened, error: reopenedError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_reopened')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false });

  if (!reopenedError && reopened) {
    console.log(`Found ${reopened.length} tasks reopened\n`);
    if (reopened.length > 0) {
      reopened.forEach((event, i) => {
        console.log(`${i + 1}. "${event.todo_text}"`);
        console.log(`   Reopened at: ${new Date(event.created_at).toLocaleString()}`);
        console.log(`   By: ${event.user_name}`);
        console.log(`   Task ID: ${event.todo_id}`);
        console.log('');
      });
    } else {
      console.log('(none)\n');
    }
  }

  // Find tasks that exist but have completed=true AND status='in_progress' (inconsistent state)
  console.log('━'.repeat(80));
  console.log('⚠️  Inconsistent Task States:\n');

  const { data: inconsistent, error: inconsistentError } = await supabase
    .from('todos')
    .select('*')
    .eq('completed', true)
    .eq('status', 'in_progress');

  if (!inconsistentError && inconsistent) {
    if (inconsistent.length > 0) {
      console.log(`Found ${inconsistent.length} tasks marked completed but status='in_progress':\n`);
      inconsistent.forEach((task, i) => {
        console.log(`${i + 1}. "${task.text}"`);
        console.log(`   Completed: ${task.completed}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   ID: ${task.id}`);
        console.log('');
      });
    } else {
      console.log('No inconsistent states found.\n');
    }
  }

  // Get all incomplete tasks (completed=false)
  console.log('━'.repeat(80));
  console.log('⬜ All Currently Incomplete Tasks:\n');

  const { data: allIncomplete, error: incompleteError } = await supabase
    .from('todos')
    .select('*')
    .eq('completed', false)
    .order('created_at', { ascending: false });

  if (!incompleteError && allIncomplete) {
    console.log(`Total incomplete tasks: ${allIncomplete.length}\n`);
    allIncomplete.forEach((task, i) => {
      console.log(`${i + 1}. "${task.text}"`);
      console.log(`   Status: ${task.status || 'todo'}`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   Assigned to: ${task.assigned_to || '(none)'}`);
      console.log(`   Priority: ${task.priority || 'medium'}`);
      console.log(`   ID: ${task.id}`);
      console.log('');
    });
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Current incomplete tasks: ${allIncomplete?.length || 0}`);
  console.log(`Tasks with status='in_progress': ${currentInProgress?.length || 0}`);
  console.log(`Tasks completed since yesterday 5pm: ${completedRecently?.length || 0}`);
  console.log(`Status changes since yesterday 5pm: ${statusChanges?.length || 0}`);
  console.log('');

  if ((completedRecently?.length || 0) > 10) {
    console.log('⚠️  WARNING: More than 10 tasks were completed since yesterday 5pm!');
    console.log('   This might explain the missing in-progress tasks.\n');
    console.log('🔧 RECOVERY OPTION:');
    console.log('   These tasks can be marked as incomplete again.\n');
    console.log('   Task IDs to restore:');
    completedRecently?.forEach((event) => {
      console.log(`   - ${event.todo_id} ("${event.todo_text}")`);
    });
    console.log('');
  }

  console.log('=' .repeat(80));
}

main().catch(console.error);
