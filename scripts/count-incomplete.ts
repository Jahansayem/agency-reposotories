import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('completed', false)
    .order('created_at', { ascending: false });

  console.log(`\nTotal incomplete tasks: ${data?.length || 0}\n`);

  data?.forEach((t, i) => {
    console.log(`${i+1}. "${t.text}"`);
    console.log(`   Status: ${t.status || 'todo'}`);
    console.log(`   Assigned: ${t.assigned_to || '(none)'}`);
    console.log('');
  });
}

main();
