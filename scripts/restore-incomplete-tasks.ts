/**
 * Restore In-Progress Tasks
 * Marks tasks with status='in_progress' back to incomplete
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔧 Task Recovery Script\n');
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
    console.log('✅ No inconsistent tasks found. All tasks are in correct state.\n');
    return;
  }

  console.log(`Found ${inconsistent.length} tasks with status='in_progress' but marked as completed:\n`);

  inconsistent.forEach((task, i) => {
    console.log(`${i + 1}. "${task.text}"`);
    console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
    console.log(`   Assigned to: ${task.assigned_to || '(none)'}`);
    console.log(`   Priority: ${task.priority || 'medium'}`);
    console.log(`   ID: ${task.id}`);
    console.log('');
  });

  console.log('━'.repeat(80));
  console.log('This script will set completed=false for these tasks.\n');

  const answer = await question('Do you want to restore these tasks? (yes/no): ');

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('\n❌ Cancelled. No changes made.\n');
    rl.close();
    return;
  }

  console.log('\n🔄 Restoring tasks...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of inconsistent) {
    const { error: updateError } = await supabase
      .from('todos')
      .update({
        completed: false,
        updated_at: new Date().toISOString(),
        updated_by: 'System Recovery'
      })
      .eq('id', task.id);

    if (updateError) {
      console.log(`❌ Error restoring "${task.text}": ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`✅ Restored: "${task.text}"`);
      successCount++;
    }
  }

  console.log('');
  console.log('=' .repeat(80));
  console.log('📊 RESULTS\n');
  console.log(`✅ Successfully restored: ${successCount} tasks`);
  console.log(`❌ Errors: ${errorCount} tasks`);
  console.log('');

  if (successCount > 0) {
    console.log('🎉 Tasks have been restored! They should now appear as incomplete in the app.\n');
    console.log('💡 Refresh the app to see the changes.\n');
  }

  rl.close();
}

main().catch(console.error);
