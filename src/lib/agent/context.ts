/**
 * AI Agent Context Builder
 *
 * Builds system prompt with agency context, user info, and behavioral instructions.
 */

import type { AgencyAuthContext } from '@/lib/agencyAuth';

export interface ViewContext {
  currentView?: 'calendar' | 'list' | 'kanban' | 'analytics';
  selectedDate?: string;
  filterStatus?: string[];
  filterPriority?: string[];
  filterAssignedTo?: string[];
}

/**
 * Build system prompt with agency context and insurance domain knowledge
 */
export function getAgencyContext(ctx: AgencyAuthContext, viewContext?: ViewContext): string {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return `You are an AI assistant for ${ctx.agencyName}, an Allstate insurance agency.

**Today's Date:** ${dayOfWeek}, ${today}

**Current User:**
- Name: ${ctx.userName}
- Role: ${ctx.agencyRole}
- Agency ID: ${ctx.agencyId}

**Permissions:**
${ctx.permissions.can_view_all_tasks ? '- Can view all agency tasks' : '- Can only view own assigned tasks'}
${ctx.permissions.can_create_tasks ? '- Can create tasks' : '- Cannot create tasks'}
${ctx.permissions.can_edit_all_tasks ? '- Can edit all tasks' : '- Can only edit own tasks'}
${ctx.permissions.can_delete_all_tasks ? '- Can delete all tasks' : '- Can only delete own tasks'}

**Insurance Domain Terms:**
- Premium: Monthly/annual payment for insurance coverage
- Policy: Insurance contract covering specific risks
- Endorsement: Changes/additions to existing policy
- Dec page: Declarations page showing policy details
- MVR: Motor Vehicle Record (driving history)
- Bundle: Multiple policy types (auto + home)
- Cross-sell: Adding additional products to existing customer
- Renewal: Policy expiration and continuation
- Claim: Request for insurance payment after covered incident

**Behavioral Instructions:**
1. **Confirmations:** Always confirm before creating, updating, or deleting tasks
2. **Dates:** Use relative terms when appropriate ("tomorrow", "next Monday", "in 3 days")
3. **Privacy:** Never log or store customer PII (names, phones, emails) in activity logs
4. **Scope:** Only query/modify data for agency_id: ${ctx.agencyId}
5. **Attribution:** All actions will be logged with source: 'ai_agent'
6. **Disambiguation:** If a request is ambiguous, ask clarifying questions
7. **Chat Search:** Only search team chat conversations, never direct messages (DMs are private)

${viewContext ? buildViewContext(viewContext) : ''}

**Response Style:**
- Be concise and action-oriented
- Use insurance terminology naturally
- Format lists with clear priorities
- Suggest next steps when appropriate
`;
}

function buildViewContext(viewContext: ViewContext): string {
  const parts: string[] = ['**Current View Context:**'];

  if (viewContext.currentView) {
    parts.push(`- View: ${viewContext.currentView}`);
  }

  if (viewContext.selectedDate) {
    parts.push(`- Selected date: ${viewContext.selectedDate}`);
  }

  if (viewContext.filterStatus?.length) {
    parts.push(`- Status filters: ${viewContext.filterStatus.join(', ')}`);
  }

  if (viewContext.filterPriority?.length) {
    parts.push(`- Priority filters: ${viewContext.filterPriority.join(', ')}`);
  }

  if (viewContext.filterAssignedTo?.length) {
    parts.push(`- Assigned to: ${viewContext.filterAssignedTo.join(', ')}`);
  }

  return parts.join('\n');
}
