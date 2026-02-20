/**
 * Retroactive Matches API
 *
 * GET /api/admin/retroactive-matches
 * Scans completed tasks without a customer link and matches them against
 * the customer_insights table using name/email/phone fuzzy matching.
 *
 * Returns { matches: TaskMatch[] } sorted by confidence descending.
 * Only matches with confidence >= 0.4 are included.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAgencyAdminAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import {
  type TaskMatch,
  calculateMatchConfidence,
  getMatchReason,
} from '@/lib/retroactiveLinking';

// Create Supabase client lazily to avoid build-time env var access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MIN_CONFIDENCE = 0.4;
const MAX_TASKS = 1000;

export const GET = withAgencyAdminAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const supabase = getSupabaseClient();

    // Fetch all customers for the agency
    let customersQuery = supabase
      .from('customer_insights')
      .select('id, customer_name, customer_email, customer_phone');

    if (ctx.agencyId) {
      customersQuery = customersQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: customers, error: customersError } = await customersQuery;

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Fetch completed tasks without a customer link
    let tasksQuery = supabase
      .from('todos')
      .select('id, text, notes, completed_at, updated_at')
      .is('customer_id', null)
      .eq('completed', true)
      .limit(MAX_TASKS);

    if (ctx.agencyId) {
      tasksQuery = tasksQuery.eq('agency_id', ctx.agencyId);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Cross-match tasks against customers
    const matches: TaskMatch[] = [];

    for (const task of tasks) {
      // Combine task text and notes for matching
      const fullText = [task.text, task.notes].filter(Boolean).join(' ');

      for (const customer of customers) {
        const confidence = calculateMatchConfidence(fullText, {
          name: customer.customer_name,
          email: customer.customer_email,
          phone: customer.customer_phone,
        });

        if (confidence >= MIN_CONFIDENCE) {
          const matchedOn = getMatchReason(fullText, {
            name: customer.customer_name,
            email: customer.customer_email,
            phone: customer.customer_phone,
          }, confidence);

          matches.push({
            taskId: task.id,
            customerId: customer.id,
            customerName: customer.customer_name,
            taskText: task.text,
            confidence,
            matchedOn,
          });
        }
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error in retroactive matches endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
