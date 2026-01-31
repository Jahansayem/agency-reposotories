/**
 * Task Recovery Script
 *
 * This script helps recover deleted or missing tasks from the Supabase database.
 * It provides multiple recovery strategies:
 *
 * 1. Check activity log for deleted tasks
 * 2. Query soft-deleted tasks (if deleted_at column exists)
 * 3. Show tasks updated/created near the deletion time
 * 4. Provide manual recovery options
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  created_by: string;
  assigned_to?: string;
  priority?: string;
  status?: string;
  notes?: string;
  deleted_at?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  todo_id?: string;
  todo_text?: string;
  user_name: string;
  created_at: string;
  details?: any;
}

async function main() {
  console.log('🔍 Task Recovery Tool - Starting...\n');
  console.log('Target time: Yesterday at 5:00 PM\n');

  // Calculate yesterday 5pm timestamp
  const now = new Date();
  const yesterday5pm = new Date(now);
  yesterday5pm.setDate(yesterday5pm.getDate() - 1);
  yesterday5pm.setHours(17, 0, 0, 0);

  const yesterday5pmISO = yesterday5pm.toISOString();
  console.log(`Timestamp: ${yesterday5pmISO}\n`);

  // Strategy 1: Check activity log for deleted tasks
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Strategy 1: Checking Activity Log for Deletions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: deletedActivities, error: activityError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_deleted')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false });

  if (activityError) {
    console.error('❌ Error fetching activity log:', activityError);
  } else if (deletedActivities && deletedActivities.length > 0) {
    console.log(`✅ Found ${deletedActivities.length} deleted tasks since yesterday 5pm:\n`);

    deletedActivities.forEach((activity: ActivityLog, index: number) => {
      console.log(`${index + 1}. "${activity.todo_text}"`);
      console.log(`   - Deleted by: ${activity.user_name}`);
      console.log(`   - Deleted at: ${new Date(activity.created_at).toLocaleString()}`);
      console.log(`   - Task ID: ${activity.todo_id}`);
      if (activity.details) {
        console.log(`   - Details: ${JSON.stringify(activity.details)}`);
      }
      console.log('');
    });

    console.log('📝 Recovery SQL for deleted tasks:');
    console.log('Copy these task IDs to restore from backups:\n');
    deletedActivities.forEach((activity: ActivityLog) => {
      console.log(`-- Task: "${activity.todo_text}"`);
      console.log(`-- ID: ${activity.todo_id}\n`);
    });
  } else {
    console.log('ℹ️  No deleted tasks found in activity log since yesterday 5pm.\n');
  }

  // Strategy 2: Check for soft-deleted tasks
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Strategy 2: Checking for Soft-Deleted Tasks');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if deleted_at column exists in todos table
  const { data: softDeleted, error: softDeleteError } = await supabase
    .from('todos')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', yesterday5pmISO)
    .order('deleted_at', { ascending: false });

  if (softDeleteError) {
    console.log('ℹ️  No soft-delete column found (this is normal).\n');
  } else if (softDeleted && softDeleted.length > 0) {
    console.log(`✅ Found ${softDeleted.length} soft-deleted tasks:\n`);

    softDeleted.forEach((task: Todo, index: number) => {
      console.log(`${index + 1}. "${task.text}"`);
      console.log(`   - Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   - Deleted: ${task.deleted_at ? new Date(task.deleted_at).toLocaleString() : 'Unknown'}`);
      console.log(`   - ID: ${task.id}`);
      console.log('');
    });

    console.log('🔧 Recovery SQL:');
    console.log('-- Run this in Supabase SQL Editor to restore:\n');
    console.log('UPDATE todos');
    console.log('SET deleted_at = NULL');
    console.log(`WHERE id IN (`);
    softDeleted.forEach((task: Todo, index: number) => {
      console.log(`  '${task.id}'${index < softDeleted.length - 1 ? ',' : ''}`);
    });
    console.log(');\n');
  } else {
    console.log('ℹ️  No soft-deleted tasks found.\n');
  }

  // Strategy 3: Show all tasks that existed at yesterday 5pm
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Strategy 3: Tasks Created Before Yesterday 5pm');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: historicalTasks, error: historicalError } = await supabase
    .from('todos')
    .select('*')
    .lte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false })
    .limit(50);

  if (historicalError) {
    console.error('❌ Error fetching historical tasks:', historicalError);
  } else if (historicalTasks && historicalTasks.length > 0) {
    console.log(`✅ Found ${historicalTasks.length} tasks that existed at yesterday 5pm:\n`);

    historicalTasks.forEach((task: Todo, index: number) => {
      console.log(`${index + 1}. "${task.text}"`);
      console.log(`   - Status: ${task.completed ? '✅ Completed' : '⬜ Incomplete'}`);
      console.log(`   - Created: ${new Date(task.created_at).toLocaleString()}`);
      console.log(`   - Created by: ${task.created_by}`);
      console.log(`   - ID: ${task.id}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No historical tasks found.\n');
  }

  // Strategy 4: Check current tasks count
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Strategy 4: Current Database State');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { count: totalCount, error: countError } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true });

  const { count: completedCount, error: completedError } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true);

  if (!countError && !completedError) {
    console.log(`📊 Current Database Statistics:`);
    console.log(`   - Total tasks: ${totalCount}`);
    console.log(`   - Completed: ${completedCount}`);
    console.log(`   - Incomplete: ${totalCount! - completedCount!}\n`);
  }

  // Strategy 5: Check for bulk deletion activity
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Strategy 5: Bulk Deletion Detection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: recentActivity, error: recentError } = await supabase
    .from('activity_log')
    .select('*')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!recentError && recentActivity) {
    const deletions = recentActivity.filter((a: ActivityLog) => a.action === 'task_deleted');
    const updates = recentActivity.filter((a: ActivityLog) => a.action === 'task_updated');
    const creations = recentActivity.filter((a: ActivityLog) => a.action === 'task_created');

    console.log(`📈 Activity Summary (since yesterday 5pm):`);
    console.log(`   - Tasks created: ${creations.length}`);
    console.log(`   - Tasks updated: ${updates.length}`);
    console.log(`   - Tasks deleted: ${deletions.length}\n`);

    if (deletions.length > 5) {
      console.log(`⚠️  ALERT: ${deletions.length} tasks were deleted - this may indicate bulk deletion!\n`);
    }
  }

  // Recovery recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recovery Recommendations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔧 Supabase Dashboard Options:\n');
  console.log('1. **Point-in-Time Recovery** (if enabled):');
  console.log('   - Go to Supabase Dashboard → Database → Backups');
  console.log('   - Restore to yesterday 5:00 PM');
  console.log('   - WARNING: This restores ENTIRE database\n');

  console.log('2. **SQL Editor Recovery**:');
  console.log('   - Go to Supabase Dashboard → SQL Editor');
  console.log('   - Use the SQL provided above to restore soft-deleted tasks\n');

  console.log('3. **Manual Recreation**:');
  console.log('   - Use the activity log data above to manually recreate tasks');
  console.log('   - Copy task text, assigned users, priorities from logs\n');

  console.log('4. **Check Browser localStorage**:');
  console.log('   - If app was open yesterday, localStorage might have cached data');
  console.log('   - Open browser DevTools → Application → Local Storage');
  console.log('   - Look for "todoSession" or task-related keys\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Recovery analysis complete!');
  console.log('\nNext steps:');
  console.log('1. Review deleted tasks list above');
  console.log('2. Choose recovery strategy (Supabase backup recommended)');
  console.log('3. Contact Derrick/Sefra to verify which tasks are missing\n');
}

main().catch(console.error);
