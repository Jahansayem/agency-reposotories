/**
 * Restore Recently Completed Tasks
 * Restores tasks that were completed this morning
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Restoring Recently Completed Tasks\n');
  console.log('=' .repeat(80) + '\n');

  const yesterday5pm = new Date();
  yesterday5pm.setDate(yesterday5pm.getDate() - 1);
  yesterday5pm.setHours(17, 0, 0, 0);
  const yesterday5pmISO = yesterday5pm.toISOString();

  // Get tasks completed since yesterday 5pm (from activity log)
  const { data: completedEvents, error: activityError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'task_completed')
    .gte('created_at', yesterday5pmISO)
    .order('created_at', { ascending: false });

  if (activityError) {
    console.error('❌ Error:', activityError);
    return;
  }

  if (!completedEvents || completedEvents.length === 0) {
    console.log('ℹ️  No recently completed tasks found.\n');
    return;
  }

  // Filter out test tasks and duplicates
  const taskIds = new Set<string>();
  const tasksToRestore: any[] = [];

  for (const event of completedEvents) {
    if (!event.todo_id) continue;
    if (taskIds.has(event.todo_id)) continue; // Skip duplicates
    if (event.todo_text?.toLowerCase() === 'test') continue; // Skip test tasks

    taskIds.add(event.todo_id);

    // Check if task still exists and is completed
    const { data: task } = await supabase
      .from('todos')
      .select('*')
      .eq('id', event.todo_id)
      .single();

    if (task && task.completed) {
      tasksToRestore.push({
        id: task.id,
        text: task.text,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        priority: task.priority,
        status: task.status
      });
    }
  }

  if (tasksToRestore.length === 0) {
    console.log('✅ No additional tasks to restore (test tasks excluded).\n');
    return;
  }

  console.log(`Found ${tasksToRestore.length} tasks to restore:\n`);

  tasksToRestore.forEach((task, i) => {
    console.log(`${i + 1}. "${task.text}"`);
    console.log(`   Assigned to: ${task.assigned_to || '(none)'}`);
    console.log(`   Priority: ${task.priority || 'medium'}`);
    console.log(`   Status: ${task.status || 'todo'}`);
    console.log('');
  });

  console.log('🔄 Restoring tasks to incomplete state...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of tasksToRestore) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({
        completed: false,
        updated_at: new Date().toISOString(),
        updated_by: 'System Recovery Script'
      })
      .eq('id', task.id);

    if (updateError) {
      console.log(`❌ Error: "${task.text}" - ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`✅ Restored: "${task.text}"`);
      successCount++;
    }
  }

  console.log('');
  console.log('=' .repeat(80));
  console.log('📊 RECOVERY COMPLETE\n');
  console.log(`✅ Successfully restored: ${successCount} tasks`);
  console.log(`❌ Errors: ${errorCount} tasks`);
  console.log(`⏭️  Skipped: ${completedEvents.length - tasksToRestore.length} tasks (test tasks or duplicates)`);
  console.log('');

  if (successCount > 0) {
    console.log('🎉 Additional tasks restored! Refresh your browser to see them.');
    console.log('💡 Total incomplete tasks should now be higher.\n');
  }
}

main().catch(console.error);
