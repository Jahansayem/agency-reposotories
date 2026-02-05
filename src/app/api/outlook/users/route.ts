import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { verifyOutlookApiKey, createOutlookCorsPreflightResponse } from '@/lib/outlookAuth';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get users from a specific agency via agency_members join
 */
async function getUsersFromAgency(agencyId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: members, error } = await supabase
    .from('agency_members')
    .select(`
      users!inner (
        name
      )
    `)
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  if (error) {
    logger.error('Error fetching agency members', error, { component: 'OutlookUsersAPI' });
    return [];
  }

  // Extract unique user names from the join result
  const userNames = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (members || []).forEach((m: any) => {
    if (m.users?.name) {
      userNames.add(m.users.name);
    }
  });

  return Array.from(userNames).sort();
}

export async function GET(request: NextRequest) {
  // Verify API key (constant-time comparison)
  if (!verifyOutlookApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    // Get optional agency_id from query params
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agency_id');

    // If agency_id is provided, return only users from that agency
    if (agencyId) {
      const agencyUsers = await getUsersFromAgency(agencyId);

      return NextResponse.json({
        success: true,
        users: agencyUsers,
        agencyId,
        scoped: true,
      });
    }

    // Backward compatible: return all users when no agency_id specified
    // Fetch registered users
    const { data: registeredUsers, error: usersError } = await supabase
      .from('users')
      .select('name')
      .order('name');

    if (usersError) {
      logger.error('Error fetching users', usersError, { component: 'OutlookUsersAPI' });
    }

    // Also get unique users from todos (for backwards compatibility)
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('created_by, assigned_to');

    if (todosError) {
      logger.error('Error fetching todos', todosError, { component: 'OutlookUsersAPI' });
    }

    // Combine all user names
    const userNames = new Set<string>();

    // Add registered users
    (registeredUsers || []).forEach((u: { name: string }) => {
      if (u.name) userNames.add(u.name);
    });

    // Add users from todos
    (todos || []).forEach((t: { created_by?: string; assigned_to?: string }) => {
      if (t.created_by) userNames.add(t.created_by);
      if (t.assigned_to) userNames.add(t.assigned_to);
    });

    // Convert to sorted array
    const users = Array.from(userNames).sort();

    return NextResponse.json({
      success: true,
      users,
      scoped: false,
    });
  } catch (error) {
    logger.error('Error fetching users', error, { component: 'OutlookUsersAPI' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight - only allow specific Outlook origins
export async function OPTIONS(request: NextRequest) {
  return createOutlookCorsPreflightResponse(request, 'GET, OPTIONS');
}
