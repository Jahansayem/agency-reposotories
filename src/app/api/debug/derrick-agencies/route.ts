import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get Derrick's user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Derrick')
    .single();

  if (userError || !user) {
    return NextResponse.json({
      error: 'Derrick not found',
      userError
    });
  }

  // Get Derrick's agencies
  const { data: memberships, error: memberError } = await supabase
    .from('agency_members')
    .select(`
      agency_id,
      role,
      status,
      is_default_agency,
      agencies!inner (
        id,
        name,
        slug,
        is_active
      )
    `)
    .eq('user_id', user.id);

  return NextResponse.json({
    user,
    totalMemberships: memberships?.length || 0,
    activeMemberships: memberships?.filter(m => m.status === 'active').length || 0,
    memberships,
    memberError,
    diagnosis: memberships?.length === 0
      ? '❌ PROBLEM: Derrick has NO agency memberships! This is why AgencySwitcher is not showing.'
      : `✅ Derrick has ${memberships?.length} agency membership(s)`
  });
}
