/**
 * Auto-Restore In-Progress Tasks
 * No confirmation required - just restores them
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Automatic Task Recovery\n');
  console.log('=' .repeat(80) + '\n');

  // Find tasks with inconsistent state
  const { data: inconsistent, error } = await supabase
    .from('todos')
    .select('*')
    .eq('completed', true)
    .eq('status', 'in_progress');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!inconsistent || inconsistent.length === 0) {
    console.log('✅ No tasks to restore. All tasks are in correct state.\n');
    return;
  }

  console.log(`Found ${inconsistent.length} tasks to restore:\n`);

  inconsistent.forEach((task, i) => {
    console.log(`${i + 1}. "${task.text}"`);
    console.log(`   Assigned to: ${task.assigned_to || '(none)'}`);
    console.log('');
  });

  console.log('🔄 Restoring tasks to incomplete state...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of inconsistent) {
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
  console.log('');

  if (successCount > 0) {
    console.log('🎉 Tasks restored! They should now appear as incomplete in the app.');
    console.log('💡 Refresh your browser to see the restored tasks.\n');
  }
}

main().catch(console.error);
