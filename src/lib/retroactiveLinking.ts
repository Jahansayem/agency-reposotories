/**
 * Retroactive Linking — Matching Algorithm
 *
 * Matches existing tasks to customers based on name, email, and phone
 * appearing in the task text. Used to retroactively link unlinked tasks
 * to customer records in customer_insights.
 */

export interface TaskMatch {
  taskId: string;
  customerId: string;
  customerName: string;
  taskText: string;
  confidence: number;
  matchedOn: string;
}

/**
 * Calculate how confident we are that a task belongs to a customer
 * based on identifiers found in the task text.
 *
 * Scoring:
 * - Full name exact match: +0.8
 * - Last name match (>3 chars): +0.4
 * - Email match: +0.7
 * - Phone match (10+ digits): +0.6
 *
 * Capped at 1.0.
 */
export function calculateMatchConfidence(
  taskText: string,
  customer: { name: string; email?: string | null; phone?: string | null }
): number {
  let score = 0;
  const text = taskText.toLowerCase();

  // Full name exact match = very high confidence
  const fullName = customer.name.toLowerCase();
  if (text.includes(fullName)) {
    score += 0.8;
  }

  // Last name match = medium confidence
  const nameParts = customer.name.split(' ');
  const lastName = nameParts[nameParts.length - 1]?.toLowerCase();
  if (lastName && lastName.length > 3 && text.includes(lastName)) {
    score += 0.4;
  }

  // Email match = high confidence
  if (customer.email && text.includes(customer.email.toLowerCase())) {
    score += 0.7;
  }

  // Phone match = high confidence
  if (customer.phone) {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const textNumbers = text.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && textNumbers.includes(cleanPhone)) {
      score += 0.6;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Build a human-readable reason string describing why the task matched.
 */
export function getMatchReason(
  taskText: string,
  customer: { name: string; email?: string | null; phone?: string | null },
  confidence: number
): string {
  const text = taskText.toLowerCase();
  const reasons: string[] = [];

  if (text.includes(customer.name.toLowerCase())) {
    reasons.push('Full name match');
  }

  const lastName = customer.name.split(' ').pop()?.toLowerCase();
  if (lastName && text.includes(lastName) && !reasons.length) {
    reasons.push('Last name match');
  }

  if (customer.email && text.includes(customer.email.toLowerCase())) {
    reasons.push('Email match');
  }

  if (customer.phone) {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const textNumbers = text.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && textNumbers.includes(cleanPhone)) {
      reasons.push('Phone number match');
    }
  }

  if (!reasons.length) {
    return 'Partial match';
  }

  return reasons.join(' + ');
}

/**
 * Convert a numeric confidence score to a categorical level.
 */
export function getConfidenceLevel(
  confidence: number
): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}
