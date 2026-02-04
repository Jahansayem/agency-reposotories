/**
 * Audit Completion Changes
 * Triple-check that recovery script didn't accidentally complete tasks
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 COMPREHENSIVE COMPLETION AUDIT\n');
  console.log('=' .repeat(80) + '\n');

  const yesterday5pm = new Date();
  yesterday5pm.setDate(yesterday5pm.getDate() - 1);
  yesterday5pm.setHours(17, 0, 0, 0);
  const yesterday5pmISO = yesterday5pm.toISOString();

  // Check 1: Activity log for task_completed events
  console.log('CHECK 1: Tasks Completed Since Yesterday 5pm\n');

  const { data: completedEvents, error: completedError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_completed')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: true });

  if (!completedError && completedEvents) {
    console.log(`Found ${completedEvents.length} completion events:\n`);

    const byUser: { [key: string]: number } = {};
    completedEvents.forEach(event => {
      byUser[event.user_name] = (byUser[event.user_name] || 0) + 1;
    });

    console.log('Completion events by user:');
    Object.entries(byUser).forEach(([user, count]) => {
      console.log(`   ${user}: ${count} tasks`);
    });
    console.log('');

    console.log('Timeline of completions:');
    completedEvents.forEach((event, i) => {
      const time = new Date(event.created_at).toLocaleString();
      console.log(`${i + 1}. [${time}] "${event.todo_text}" by ${event.user_name}`);
    });
    console.log('');
  }

  // Check 2: Activity log for task_reopened events
  console.log('━'.repeat(80));
  console.log('CHECK 2: Tasks Reopened Since Yesterday 5pm\n');

  const { data: reopenedEvents, error: reopenedError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_reopened')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: true });

  if (!reopenedError && reopenedEvents) {
    if (reopenedEvents.length === 0) {
      console.log('✅ No task_reopened events found (as expected).\n');
      console.log('ℹ️  Note: Recovery script updates completed=false directly,');
      console.log('   not via the UI, so no activity log entries are created.\n');
    } else {
      console.log(`Found ${reopenedEvents.length} reopen events:\n`);
      reopenedEvents.forEach((event, i) => {
        const time = new Date(event.created_at).toLocaleString();
        console.log(`${i + 1}. [${time}] "${event.todo_text}" by ${event.user_name}`);
      });
      console.log('');
    }
  }

  // Check 3: Tasks updated by recovery script
  console.log('━'.repeat(80));
  console.log('CHECK 3: Tasks Updated by Recovery Script\n');

  const { data: recoveryUpdates, error: recoveryError } = await supabase
    .from('todos')
    .select('*')
    .eq('updated_by', 'System Recovery Script')
    .order('updated_at', { ascending: true });

  if (!recoveryError && recoveryUpdates) {
    console.log(`Found ${recoveryUpdates.length} tasks updated by recovery script:\n`);
    recoveryUpdates.forEach((task, i) => {
      const status = task.completed ? '✅ Completed' : '⬜ Incomplete';
      const time = new Date(task.updated_at).toLocaleString();
      console.log(`${i + 1}. "${task.text}"`);
      console.log(`   Status: ${status}`);
      console.log(`   Updated: ${time}`);
      console.log(`   ID: ${task.id}`);
      console.log('');
    });

    // Verify all are incomplete
    const anyCompleted = recoveryUpdates.filter(t => t.completed);
    if (anyCompleted.length > 0) {
      console.log(`⚠️  WARNING: ${anyCompleted.length} tasks touched by recovery script are still completed!\n`);
      anyCompleted.forEach(task => {
        console.log(`   - "${task.text}" (ID: ${task.id})`);
      });
      console.log('');
    } else {
      console.log('✅ All tasks touched by recovery script are now incomplete.\n');
    }
  }

  // Check 4: Current database state
  console.log('━'.repeat(80));
  console.log('CHECK 4: Current Database State\n');

  const { data: allTasks, error: allError } = await supabase
    .from('todos')
    .select('*')
    .order('completed', { ascending: true });

  if (!allError && allTasks) {
    const incomplete = allTasks.filter(t => !t.completed);
    const completed = allTasks.filter(t => t.completed);

    console.log(`📊 Database Summary:`);
    console.log(`   Total tasks: ${allTasks.length}`);
    console.log(`   Incomplete: ${incomplete.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log('');

    console.log(`⬜ Incomplete tasks (${incomplete.length}):\n`);
    incomplete.forEach((task, i) => {
      console.log(`${i + 1}. "${task.text}"`);
      console.log(`   Status: ${task.status || 'todo'}`);
      console.log(`   Assigned: ${task.assigned_to || '(none)'}`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log('');
    });
  }

  // Check 5: Look for any tasks accidentally completed in last hour
  console.log('━'.repeat(80));
  console.log('CHECK 5: Tasks Completed in Last Hour (Accident Check)\n');

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const oneHourAgoISO = oneHourAgo.toISOString();

  const { data: recentCompleted, error: recentError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_completed')
    .gte('created_at', oneHourAgoISO)
    .order('created_at', { ascending: true });

  if (!recentError && recentCompleted) {
    if (recentCompleted.length === 0) {
      console.log('✅ No tasks completed in last hour (good!).\n');
    } else {
      console.log(`⚠️  Found ${recentCompleted.length} tasks completed in last hour:\n`);
      recentCompleted.forEach((event, i) => {
        const time = new Date(event.created_at).toLocaleString();
        console.log(`${i + 1}. [${time}] "${event.todo_text}"`);
        console.log(`   By: ${event.user_name}`);
        console.log(`   Task ID: ${event.todo_id}`);
        console.log('');
      });

      console.log('⚠️  If these completions are unexpected, they may need to be reverted!\n');
    }
  }

  // Check 6: Verify expected incomplete count
  console.log('━'.repeat(80));
  console.log('CHECK 6: Verification Against Expected State\n');

  const expectedIncomplete = 9; // Based on recovery
  const actualIncomplete = allTasks?.filter(t => !t.completed).length || 0;

  console.log(`Expected incomplete tasks: ${expectedIncomplete}`);
  console.log(`Actual incomplete tasks: ${actualIncomplete}\n`);

  if (actualIncomplete === expectedIncomplete) {
    console.log('✅ Count matches! Recovery appears successful.\n');
  } else if (actualIncomplete > expectedIncomplete) {
    console.log(`ℹ️  Count is HIGHER than expected (+${actualIncomplete - expectedIncomplete}).\n`);
    console.log('   This might be okay if additional tasks were created/restored.\n');
  } else {
    console.log(`⚠️  WARNING: Count is LOWER than expected (-${expectedIncomplete - actualIncomplete})!\n`);
    console.log('   Some tasks may have been accidentally completed.\n');
  }

  // Final summary
  console.log('=' .repeat(80));
  console.log('🎯 AUDIT SUMMARY\n');

  const issues: string[] = [];

  if (recoveryUpdates?.some(t => t.completed)) {
    issues.push('❌ Some recovery script updates resulted in completed tasks');
  }

  if (actualIncomplete < expectedIncomplete) {
    issues.push(`❌ Incomplete count lower than expected (${actualIncomplete} vs ${expectedIncomplete})`);
  }

  if (recentCompleted && recentCompleted.length > 0) {
    issues.push(`⚠️  ${recentCompleted.length} tasks completed in last hour (verify these are intentional)`);
  }

  if (issues.length === 0) {
    console.log('✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅\n');
    console.log('No accidental completions detected.');
    console.log('Recovery script worked correctly.');
    console.log('All restored tasks are incomplete as expected.\n');
  } else {
    console.log('⚠️  ISSUES DETECTED:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('');
  }

  console.log('=' .repeat(80));
}

main().catch(console.error);
