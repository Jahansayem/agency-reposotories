/**
 * Customer Detail API
 *
 * GET /api/customers/[id] - Get full customer details with opportunities and tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCustomerSegment, SEGMENT_CONFIGS, type SegmentTier } from '@/lib/segmentation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First try to get from customer_insights
    const { data: insight, error: insightError } = await supabase
      .from('customer_insights')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Get all opportunities for this customer (by name if we have insight, or by id)
    let opportunitiesQuery = supabase
      .from('cross_sell_opportunities')
      .select('*')
      .order('priority_rank', { ascending: true });

    if (insight) {
      opportunitiesQuery = opportunitiesQuery.eq('customer_name', insight.customer_name);
    } else {
      opportunitiesQuery = opportunitiesQuery.eq('id', id);
    }

    const { data: opportunities, error: oppError } = await opportunitiesQuery;

    // If we found neither, return 404
    if (!insight && (!opportunities || opportunities.length === 0)) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build customer object
    let customer;

    if (insight) {
      const segment = getCustomerSegment(insight.total_premium || 0, insight.total_policies || 0);
      customer = {
        id: insight.id,
        name: insight.customer_name,
        email: insight.customer_email,
        phone: insight.customer_phone,
        address: null,
        city: null,
        zipCode: null,
        totalPremium: insight.total_premium || 0,
        policyCount: insight.total_policies || 0,
        products: insight.products_held || [],
        tenureYears: insight.tenure_years || 0,
        segment,
        segmentConfig: SEGMENT_CONFIGS[segment as SegmentTier],
        retentionRisk: insight.retention_risk || 'low',
        paymentStatus: insight.payment_status || 'current',
        crossSellPotential: insight.cross_sell_potential || 0,
        recommendedProducts: insight.recommended_products || [],
        lastContactDate: insight.last_contact_date,
        lastPolicyChange: insight.last_policy_change,
        upcomingRenewal: insight.upcoming_renewal,
        createdAt: insight.created_at,
        updatedAt: insight.updated_at,
      };
    } else {
      // Build from opportunity data
      const opp = opportunities![0];
      const segment = getCustomerSegment(opp.current_premium || 0, opp.policy_count || 1);
      customer = {
        id: opp.id,
        name: opp.customer_name,
        email: opp.email,
        phone: opp.phone,
        address: opp.address,
        city: opp.city,
        zipCode: opp.zip_code,
        totalPremium: opp.current_premium || 0,
        policyCount: opp.policy_count || 1,
        products: opp.current_products?.split(',').map((p: string) => p.trim()) || [],
        tenureYears: opp.tenure_years || 0,
        segment,
        segmentConfig: SEGMENT_CONFIGS[segment as SegmentTier],
        retentionRisk: 'low',
        paymentStatus: opp.balance_due > 0 ? 'past_due' : 'current',
        crossSellPotential: opp.potential_premium_add || 0,
        recommendedProducts: opp.recommended_product ? [opp.recommended_product] : [],
        lastContactDate: opp.contacted_at,
        lastPolicyChange: null,
        upcomingRenewal: opp.renewal_date,
        createdAt: opp.created_at,
        updatedAt: opp.updated_at,
      };
    }

    // Format opportunities
    const formattedOpportunities = (opportunities || []).map(opp => ({
      id: opp.id,
      priorityRank: opp.priority_rank,
      priorityTier: opp.priority_tier,
      priorityScore: opp.priority_score,
      recommendedProduct: opp.recommended_product,
      segmentType: opp.segment_type,
      currentProducts: opp.current_products,
      potentialPremiumAdd: opp.potential_premium_add,
      expectedConversionPct: opp.expected_conversion_pct,
      renewalDate: opp.renewal_date,
      daysUntilRenewal: opp.days_until_renewal,
      renewalStatus: opp.renewal_status,
      talkingPoints: [opp.talking_point_1, opp.talking_point_2, opp.talking_point_3].filter(Boolean),
      taskId: opp.task_id,
      contactedAt: opp.contacted_at,
      contactOutcome: opp.contact_outcome,
      dismissed: opp.dismissed,
    }));

    // Get linked tasks
    const taskIds = formattedOpportunities
      .filter(o => o.taskId)
      .map(o => o.taskId);

    // Also get tasks that have this customer_id (once we add that column)
    const { data: linkedTasks, error: tasksError } = taskIds.length > 0
      ? await supabase
          .from('todos')
          .select('id, text, completed, status, priority, due_date, assigned_to, created_at')
          .in('id', taskIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null };

    // Get tasks that mention this customer's name in the text (fuzzy link)
    const { data: mentionedTasks } = await supabase
      .from('todos')
      .select('id, text, completed, status, priority, due_date, assigned_to, created_at')
      .ilike('text', `%${customer.name}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Merge and dedupe tasks
    const allTaskIds = new Set<string>();
    const allTasks = [...(linkedTasks || []), ...(mentionedTasks || [])]
      .filter(task => {
        if (allTaskIds.has(task.id)) return false;
        allTaskIds.add(task.id);
        return true;
      })
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      customer,
      opportunities: formattedOpportunities,
      tasks: allTasks.map(task => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        assignedTo: task.assigned_to,
        createdAt: task.created_at,
      })),
      stats: {
        totalOpportunities: formattedOpportunities.length,
        activeOpportunities: formattedOpportunities.filter(o => !o.dismissed && !o.contactOutcome).length,
        linkedTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.completed).length,
      },
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}
