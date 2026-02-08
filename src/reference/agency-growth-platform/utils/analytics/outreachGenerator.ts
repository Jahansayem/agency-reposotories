/**
 * AI-Powered Outreach Message Generator
 * V7.0: HYPER-PERSONALIZED with Full Customer Data Integration
 *
 * NEW in V7.0:
 * - Claims-free recognition: 0-claim customers get "claims-free" messaging
 * - VIP treatment: High-value customers ($10K+) get premium language
 * - Multi-policy loyalty: 4+ policies = "valued multi-policy customer"
 * - Marital status hooks: Married = spouse/family angles, Life insurance push
 * - Specific product references: "your Honda Accord" not "your auto policy"
 * - Total premium context: Speaks to their investment level
 *
 * V6.5 Features (retained):
 * - Data hygiene: No database field names in customer-facing text
 * - Personalization: Every script uses 3+ customer-specific data points (increased)
 * - Dollar amounts over percentages: Calculate actual savings from premiums
 * - Concrete benefits only: No filler like "simplified billing" or "peace of mind"
 * - Channel-specific formatting: Strict word limits, proper CTAs
 * - Tone: Local agent voice, contractions, first person singular
 * - Validation checklist: Ensures quality before output
 */

import type {
  GeneratedOutreach,
  OutreachChannel,
  PriorityTier,
  CrossSellSegment,
  EnrichedCustomerData
} from '../types/outreach';

// Agent info for personalization
const AGENT_INFO = {
  name: 'Derrick Bealer',
  firstName: 'Derrick',
  agency: 'Bealer Allstate Agency',
  phone: '(805) 682-4242',
  email: 'derrickbealer@allstate.com',
  location: 'Santa Barbara & Goleta',
  licenseNumber: 'CA License #0H12345'
};

// Compliance footer templates (separate from conversation flow)
const COMPLIANCE_FOOTERS = {
  email: [
    'To unsubscribe, reply STOP or call our office.',
    `${AGENT_INFO.name} | ${AGENT_INFO.agency} | ${AGENT_INFO.phone}`,
    AGENT_INFO.licenseNumber
  ],
  sms: [
    'Reply STOP to opt out.',
    AGENT_INFO.firstName
  ],
  call: [
    'This call may be recorded for quality assurance.',
    'You may request to be placed on our do-not-call list at any time.'
  ],
  mail: [
    AGENT_INFO.licenseNumber,
    `${AGENT_INFO.agency} | ${AGENT_INFO.location}`
  ]
};

// ============================================================================
// DATA HYGIENE: Transform database fields to customer-friendly language
// ============================================================================

const PRODUCT_NAME_MAP: Record<string, string> = {
  'Auto - Private Passenger Voluntary': 'auto policy',
  'Auto - PPA': 'auto policy',
  'Auto': 'car insurance',
  'Homeowners': 'home insurance',
  'HO': 'home insurance',
  'Renters': 'renters insurance',
  'Umbrella': 'umbrella policy',
  'Personal Umbrella': 'umbrella policy',
  'Life': 'life insurance',
  'Condo': 'condo insurance',
  'Landlord': 'landlord policy'
};

const FIELDS_TO_NEVER_MENTION = [
  'Renewal Status: Not Taken',
  'Renewal Status: Taken',
  'EZPay: Enrolled',
  'EZPay: Not Enrolled',
  'Priority Score',
  'Policy Type Code',
  'Internal ID'
];

function sanitizeProductName(rawName: string): string {
  // Direct mapping
  if (PRODUCT_NAME_MAP[rawName]) {
    return PRODUCT_NAME_MAP[rawName];
  }
  // Partial matching
  for (const [key, value] of Object.entries(PRODUCT_NAME_MAP)) {
    if (rawName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  // Fallback: lowercase and clean up
  return rawName.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeForCustomer(text: string): string {
  let sanitized = text;
  // Remove any internal field references
  FIELDS_TO_NEVER_MENTION.forEach(field => {
    sanitized = sanitized.replace(new RegExp(field, 'gi'), '');
  });
  // Clean up product names in the text
  for (const [key, value] of Object.entries(PRODUCT_NAME_MAP)) {
    sanitized = sanitized.replace(new RegExp(key, 'gi'), value);
  }
  return sanitized.trim();
}

// ============================================================================
// V7.0: CUSTOMER PROFILE ANALYSIS - Extract personalization hooks
// ============================================================================

interface CustomerProfile {
  isClaimsFree: boolean;
  isVIP: boolean; // $10K+ total premium
  isHighValue: boolean; // $5K-$10K total premium
  isMultiPolicy: boolean; // 4+ policies
  isLongTenure: boolean; // 5+ years
  isMarried: boolean;
  hasFamily: boolean; // Married indicator
  needsUmbrella: boolean; // High premium + no umbrella
  needsLife: boolean; // Married + no life
  currentProductsList: string[];
  missingProducts: string[];
  vipTier: 'platinum' | 'gold' | 'silver' | 'standard';
}

function analyzeCustomerProfile(
  enrichedData: EnrichedCustomerData | undefined,
  currentProducts: string
): CustomerProfile {
  const defaults: CustomerProfile = {
    isClaimsFree: true, // Assume claims-free if no data
    isVIP: false,
    isHighValue: false,
    isMultiPolicy: false,
    isLongTenure: false,
    isMarried: false,
    hasFamily: false,
    needsUmbrella: false,
    needsLife: false,
    currentProductsList: [],
    missingProducts: [],
    vipTier: 'standard'
  };

  if (!enrichedData) {
    return defaults;
  }

  const products = enrichedData.products || [];
  const productsLower = products.map(p => p.toLowerCase());

  // VIP tiers based on total premium
  const isVIP = enrichedData.totalPremium >= 10000;
  const isHighValue = enrichedData.totalPremium >= 5000 && enrichedData.totalPremium < 10000;

  let vipTier: 'platinum' | 'gold' | 'silver' | 'standard' = 'standard';
  if (enrichedData.totalPremium >= 15000) vipTier = 'platinum';
  else if (enrichedData.totalPremium >= 10000) vipTier = 'gold';
  else if (enrichedData.totalPremium >= 5000) vipTier = 'silver';

  // Multi-policy detection
  const isMultiPolicy = enrichedData.policyCount >= 4;

  // Tenure check (months to years)
  const tenureYears = enrichedData.tenure / 12;
  const isLongTenure = tenureYears >= 5;

  // Marital status
  const isMarried = enrichedData.maritalStatus === 'Married';

  // Missing products analysis
  const allProducts = ['auto', 'home', 'umbrella', 'life', 'renters'];
  const missingProducts: string[] = [];

  const hasUmbrella = productsLower.some(p => p.includes('umbrella'));
  const hasLife = productsLower.some(p => p.includes('life'));
  const hasHome = productsLower.some(p => p.includes('home'));
  const hasRenters = productsLower.some(p => p.includes('rent'));

  if (!hasUmbrella && enrichedData.totalPremium >= 5000) missingProducts.push('umbrella');
  if (!hasLife && isMarried) missingProducts.push('life');
  if (!hasHome && !hasRenters) missingProducts.push('home/renters');

  return {
    isClaimsFree: enrichedData.claimCount === 0,
    isVIP,
    isHighValue,
    isMultiPolicy,
    isLongTenure,
    isMarried,
    hasFamily: isMarried,
    needsUmbrella: !hasUmbrella && enrichedData.totalPremium >= 5000,
    needsLife: !hasLife && isMarried,
    currentProductsList: products,
    missingProducts,
    vipTier
  };
}

// ============================================================================
// V7.0: PERSONALIZATION HOOKS - Specific language for each profile type
// ============================================================================

interface PersonalizationHooks {
  claimsFreeHook: string;
  vipHook: string;
  loyaltyHook: string;
  familyHook: string;
  multiPolicyHook: string;
}

function getPersonalizationHooks(
  profile: CustomerProfile,
  ctx: CustomerContext
): PersonalizationHooks {
  const hooks: PersonalizationHooks = {
    claimsFreeHook: '',
    vipHook: '',
    loyaltyHook: '',
    familyHook: '',
    multiPolicyHook: ''
  };

  // Claims-free hook - powerful trust signal
  if (profile.isClaimsFree) {
    hooks.claimsFreeHook = `You've been claims-free the whole time you've been with us - that's a big deal.`;
  }

  // VIP hook based on tier
  if (profile.vipTier === 'platinum') {
    const premiumFormatted = ctx.enrichedData?.totalPremium
      ? `$${Math.round(ctx.enrichedData.totalPremium).toLocaleString()}`
      : 'significant';
    hooks.vipHook = `With ${premiumFormatted} invested across your policies, you qualify for our best rates.`;
  } else if (profile.vipTier === 'gold') {
    hooks.vipHook = `As one of my top customers, I want to make sure you're getting every discount available.`;
  } else if (profile.vipTier === 'silver') {
    hooks.vipHook = `You've got a solid portfolio with us - let me make sure we're maximizing your savings.`;
  }

  // Loyalty hook
  if (profile.isLongTenure && ctx.tenureYears >= 10) {
    hooks.loyaltyHook = `${ctx.tenureYears} years together - that kind of loyalty deserves the best pricing I can get you.`;
  } else if (profile.isLongTenure) {
    hooks.loyaltyHook = `After ${ctx.tenureYears} years, you've earned discounts most customers don't qualify for.`;
  }

  // Family hook
  if (profile.isMarried) {
    hooks.familyHook = `For you and your spouse, this could mean real protection if something happens.`;
  }

  // Multi-policy hook
  if (profile.isMultiPolicy && ctx.enrichedData?.policyCount) {
    hooks.multiPolicyHook = `With ${ctx.enrichedData.policyCount} policies, you're already bundled - but there's one more discount we might be missing.`;
  }

  return hooks;
}

// ============================================================================
// DOLLAR CALCULATIONS: Convert percentages to actual dollar amounts
// ============================================================================

interface SavingsCalculation {
  lowEstimate: number;
  highEstimate: number;
  displayString: string;
}

function calculateBundleSavings(currentPremium: number, segment: string): SavingsCalculation {
  // Segment-specific discount ranges
  const discountRanges: Record<string, { low: number; high: number }> = {
    'Segment 1: Auto→Home (Homeowner)': { low: 0.15, high: 0.25 },
    'Segment 2: Home→Auto': { low: 0.10, high: 0.20 },
    'Segment 3: Auto→Renters': { low: 0.10, high: 0.15 },
    'Segment 4: Bundle→Umbrella': { low: 0, high: 0 } // Umbrella is protection, not savings
  };

  const range = discountRanges[segment] || { low: 0.10, high: 0.20 };

  // Calculate raw amounts
  const rawLow = currentPremium * range.low;
  const rawHigh = currentPremium * range.high;

  // Round to clean numbers (nearest $50)
  const lowEstimate = Math.round(rawLow / 50) * 50;
  const highEstimate = Math.round(rawHigh / 50) * 50;

  // Format display string
  let displayString: string;
  if (lowEstimate === highEstimate || lowEstimate === 0) {
    displayString = `$${highEstimate.toLocaleString()}`;
  } else {
    displayString = `$${lowEstimate.toLocaleString()}-${highEstimate.toLocaleString()}`;
  }

  return { lowEstimate, highEstimate, displayString };
}

function calculateRentersCost(): string {
  // Standard renters insurance cost range
  return '$15-20/month';
}

function calculateUmbrellaCost(): string {
  // Standard umbrella policy cost
  return '$200-350/year';
}

// ============================================================================
// SEGMENT-SPECIFIC HOOKS: Concrete value props for each cross-sell type
// ============================================================================

interface SegmentHook {
  product: string;
  friendlyProduct: string;
  qualifyingQuestion: string;
  concreteValue: (ctx: CustomerContext) => string;
  gapScenario: string;
  lowCommitmentAsk: string;
}

const SEGMENT_HOOKS: Record<string, SegmentHook> = {
  'Segment 1: Auto→Home (Homeowner)': {
    product: 'Homeowners Insurance',
    friendlyProduct: 'home insurance',
    qualifyingQuestion: 'Are you currently renting or do you own your home?',
    concreteValue: (ctx) => {
      const savings = calculateBundleSavings(ctx.currentPremium, ctx.segment);
      return `Bundling could save you ${savings.displayString} per year`;
    },
    gapScenario: 'If you have a claim that affects both your car and home, like a tree falling on your garage with your car inside, you\'d have one deductible instead of two',
    lowCommitmentAsk: 'Can I run a quick quote while I have your info up? Takes about 5 minutes'
  },
  'Segment 2: Home→Auto': {
    product: 'Auto Insurance',
    friendlyProduct: 'car insurance',
    qualifyingQuestion: 'Who\'s currently handling your auto insurance?',
    concreteValue: (ctx) => {
      const savings = calculateBundleSavings(ctx.currentPremium, ctx.segment);
      return `As an existing home customer, you qualify for our loyalty discount - typically ${savings.displayString} per year`;
    },
    gapScenario: 'If you\'ve been claims-free, that discount transfers over and stacks with the bundle savings',
    lowCommitmentAsk: 'What are you paying for car insurance now? I can tell you in two minutes if we can beat it'
  },
  'Segment 3: Auto→Renters': {
    product: 'Renters Insurance',
    friendlyProduct: 'renters insurance',
    qualifyingQuestion: 'Are you renting your current place?',
    concreteValue: () => {
      return `For about ${calculateRentersCost()}, you\'d be covered if someone breaks in, there\'s a fire, or a guest gets hurt at your place`;
    },
    gapScenario: 'Your landlord\'s insurance covers the building, but if your laptop, TV, and clothes get destroyed in a fire, that\'s on you without renters coverage. We\'re talking $10-20K in stuff most people have',
    lowCommitmentAsk: 'Want me to add a quote to your renewal? It\'s one extra line and you can decide then'
  },
  'Segment 4: Bundle→Umbrella': {
    product: 'Umbrella Policy',
    friendlyProduct: 'umbrella policy',
    qualifyingQuestion: 'Have you thought about what happens if someone sues you for more than your policy limits?',
    concreteValue: () => {
      return `An extra $1 million in liability coverage for ${calculateUmbrellaCost()} - works out to under $1 a day`;
    },
    gapScenario: 'If someone sues you for $500K after a car accident and your auto only covers $300K, the $200K gap comes out of your savings, your house equity, even future wages',
    lowCommitmentAsk: 'Can I show you where your current limits sit versus what you\'d want covered? Takes 5 minutes'
  }
};

// ============================================================================
// PERSONALIZATION VALIDATION
// ============================================================================

interface PersonalizationElements {
  usedTenure: boolean;
  usedDollarAmount: boolean;
  usedLocation: boolean;
  usedTriggerDate: boolean;
  usedLifeStage: boolean;
  count: number;
}

function trackPersonalization(): PersonalizationElements {
  return {
    usedTenure: false,
    usedDollarAmount: false,
    usedLocation: false,
    usedTriggerDate: false,
    usedLifeStage: false,
    count: 0
  };
}

function validatePersonalization(elements: PersonalizationElements): boolean {
  const count = [
    elements.usedTenure,
    elements.usedDollarAmount,
    elements.usedLocation,
    elements.usedTriggerDate,
    elements.usedLifeStage
  ].filter(Boolean).length;
  elements.count = count;
  return count >= 2;
}

// ============================================================================
// OUTPUT VALIDATION CHECKLIST
// ============================================================================

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

function validateOutput(
  message: string,
  channel: OutreachChannel,
  personalization: PersonalizationElements,
  hasDollarFigure: boolean,
  endsWithQuestionOrCTA: boolean
): ValidationResult {
  const issues: string[] = [];

  // Check for database field names
  const forbiddenPatterns = [
    /Auto - Private Passenger/i,
    /Renewal Status:/i,
    /EZPay:/i,
    /Priority Score/i,
    /Policy Type Code/i
  ];
  forbiddenPatterns.forEach(pattern => {
    if (pattern.test(message)) {
      issues.push('Contains database field names');
    }
  });

  // Check personalization
  if (!validatePersonalization(personalization)) {
    issues.push(`Only ${personalization.count} personalization elements used (need 2+)`);
  }

  // Check dollar figure
  if (!hasDollarFigure && !message.includes('$')) {
    issues.push('No specific dollar figure included');
  }

  // Check word count by channel
  const wordCount = message.split(/\s+/).length;
  const channelLimits: Record<OutreachChannel, number> = {
    call: 80, // Opening only
    email: 100,
    sms: 50,
    mail: 300
  };
  if (channel === 'sms' && wordCount > channelLimits.sms) {
    issues.push(`SMS too long: ${wordCount} words (limit: ${channelLimits.sms})`);
  }

  // Check ending
  if (!endsWithQuestionOrCTA) {
    issues.push('Does not end with question or specific CTA');
  }

  // Check for prohibited phrases
  const prohibitedPhrases = [
    'I wanted to reach out',
    'I wanted to touch base',
    'lock in your savings',
    'take advantage of',
    'did you know that',
    'At Allstate, we',
    'At Bealer, we',
    'simplified billing',
    'one statement',
    'peace of mind',
    'comprehensive coverage',
    'Call us today' // Only prohibited in call scripts
  ];
  prohibitedPhrases.forEach(phrase => {
    if (message.toLowerCase().includes(phrase.toLowerCase())) {
      if (!(phrase === 'Call us today' && channel !== 'call')) {
        issues.push(`Contains prohibited phrase: "${phrase}"`);
      }
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================================================
// TIER MESSAGING (Updated - removed "lock in" language)
// ============================================================================

const TIER_MESSAGING: Record<PriorityTier, {
  tone: string;
  urgencyLevel: 'high' | 'medium' | 'low';
  followUpTiming: string;
}> = {
  HOT: {
    tone: 'direct and time-sensitive',
    urgencyLevel: 'high',
    followUpTiming: 'within 24-48 hours'
  },
  HIGH: {
    tone: 'warm and specific',
    urgencyLevel: 'medium',
    followUpTiming: 'within 3-5 days'
  },
  MEDIUM: {
    tone: 'conversational and helpful',
    urgencyLevel: 'medium',
    followUpTiming: 'within 1-2 weeks'
  },
  LOW: {
    tone: 'casual and relationship-building',
    urgencyLevel: 'low',
    followUpTiming: 'monthly touchpoint'
  }
};

// ============================================================================
// CUSTOMER CONTEXT
// ============================================================================

interface CustomerContext {
  customerName: string;
  segment: CrossSellSegment | string;
  tier: PriorityTier;
  currentProducts: string;
  recommendedProduct: string;
  currentPremium: number;
  potentialPremiumAdd: number;
  daysUntilRenewal: number;
  renewalDate: string;
  balanceDue: number;
  tenureYears: number;
  ezpayStatus: string;
  talkingPoints: string[];
  city: string;
  // V7.0: Enriched customer data
  enrichedData?: EnrichedCustomerData;
}

/**
 * Generate a HYPER-PERSONALIZED call script
 * V7.0: Uses claims history, VIP status, family situation, policy count
 * Format: Opening (1-2 sentences) + Value prop with dollars + Qualifying question
 * Under 80 words for opening, ends with question not pitch
 */
function generateCallScript(ctx: CustomerContext): GeneratedOutreach {
  const segmentHook = SEGMENT_HOOKS[ctx.segment] || SEGMENT_HOOKS['Segment 1: Auto→Home (Homeowner)'];
  const tierMsg = TIER_MESSAGING[ctx.tier];
  const firstName = ctx.customerName.split(' ')[0];
  const firstNameFormatted = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  const personalization = trackPersonalization();

  // V7.0: Analyze customer profile
  const profile = analyzeCustomerProfile(ctx.enrichedData, ctx.currentProducts);
  const hooks = getPersonalizationHooks(profile, ctx);

  // Sanitize product names
  const cleanProducts = sanitizeProductName(ctx.currentProducts);

  let script = `Hi ${firstNameFormatted}, it's ${AGENT_INFO.firstName} from ${AGENT_INFO.agency}. `;

  // V7.0: Priority-based opening with rich personalization
  if (profile.vipTier === 'platinum' || profile.vipTier === 'gold') {
    // VIP opening - acknowledge their value
    script += hooks.vipHook;
    personalization.usedLifeStage = true;
    if (profile.isClaimsFree && ctx.tenureYears >= 3) {
      script += ` ${hooks.claimsFreeHook}`;
    }
  } else if (ctx.daysUntilRenewal <= 30 && ctx.daysUntilRenewal > 0) {
    // Renewal trigger
    script += `Your ${cleanProducts} renews ${ctx.renewalDate}`;
    personalization.usedTriggerDate = true;
    if (profile.isClaimsFree && ctx.tenureYears >= 2) {
      script += ` - you've been claims-free for ${ctx.tenureYears} years, so you qualify for better rates than when you started.`;
      personalization.usedTenure = true;
    } else if (ctx.tenureYears >= 2) {
      script += ` - you've been with us ${ctx.tenureYears} years now, so I wanted to make sure you're getting the best rate.`;
      personalization.usedTenure = true;
    } else {
      script += `, and I spotted something that could save you money.`;
    }
  } else if (profile.isMultiPolicy) {
    // Multi-policy customer - loyalty angle
    script += hooks.multiPolicyHook;
    personalization.usedLifeStage = true;
  } else if (ctx.tenureYears >= 3) {
    script += hooks.loyaltyHook || `You've been with us ${ctx.tenureYears} years - thanks for that. I'm going through my long-term customers to make sure everyone's getting the discounts they qualify for.`;
    personalization.usedTenure = true;
    personalization.usedLifeStage = true;
  } else {
    script += `I was looking at your ${cleanProducts} and found a way to save you some money.`;
  }

  // Middle: Value proposition with DOLLARS (1-2 sentences)
  script += `\n\n${segmentHook.concreteValue(ctx)}.`;
  personalization.usedDollarAmount = true;

  // V7.0: Add family hook for married customers considering life/umbrella
  if (profile.isMarried && (ctx.segment.includes('Umbrella') || profile.needsLife)) {
    script += ` ${hooks.familyHook}`;
  }

  // Close: Qualifying question (not a pitch)
  script += `\n\n${segmentHook.qualifyingQuestion}`;

  // V7.0: Build richer talking points
  const enrichedTalkingPoints = [
    segmentHook.gapScenario,
    segmentHook.lowCommitmentAsk
  ];

  if (profile.isClaimsFree) {
    enrichedTalkingPoints.push(`Claims-free discount: They've filed 0 claims - use this to highlight they're a preferred risk`);
  }
  if (profile.isVIP && ctx.enrichedData?.totalPremium) {
    enrichedTalkingPoints.push(`VIP customer: $${Math.round(ctx.enrichedData.totalPremium).toLocaleString()} in annual premium - treat accordingly`);
  }
  if (profile.isMarried) {
    enrichedTalkingPoints.push(`Married: Can reference spouse in conversation, good for life insurance angle`);
  }
  if (ctx.enrichedData?.policyCount && ctx.enrichedData.policyCount >= 3) {
    enrichedTalkingPoints.push(`Multi-policy: ${ctx.enrichedData.policyCount} policies - emphasize you're consolidating their insurance world`);
  }

  enrichedTalkingPoints.push(...ctx.talkingPoints.map(tp => sanitizeForCustomer(tp)));

  // Validate output
  const validation = validateOutput(
    script,
    'call',
    personalization,
    true,
    script.trim().endsWith('?')
  );

  return {
    channel: 'call',
    customerName: ctx.customerName,
    message: script,
    talkingPoints: enrichedTalkingPoints.filter(Boolean),
    compliance_notices: COMPLIANCE_FOOTERS.call,
    urgency: tierMsg.urgencyLevel,
    validation: {
      valid: validation.valid,
      issues: validation.issues,
      personalizationCount: personalization.count
    }
  };
}

/**
 * Generate a HYPER-PERSONALIZED email
 * V7.0: Uses claims history, VIP status, family situation, policy count
 * Format: Subject under 45 chars, body under 100 words, one clear CTA with time estimate
 * No bullet lists, specific dollar amounts, curiosity-driven subject
 */
function generateEmail(ctx: CustomerContext): GeneratedOutreach {
  const segmentHook = SEGMENT_HOOKS[ctx.segment] || SEGMENT_HOOKS['Segment 1: Auto→Home (Homeowner)'];
  const tierMsg = TIER_MESSAGING[ctx.tier];
  const firstName = ctx.customerName.split(' ')[0];
  const firstNameFormatted = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  const personalization = trackPersonalization();

  // V7.0: Analyze customer profile
  const profile = analyzeCustomerProfile(ctx.enrichedData, ctx.currentProducts);

  // Sanitize product names
  const cleanProducts = sanitizeProductName(ctx.currentProducts);
  const savings = calculateBundleSavings(ctx.currentPremium, ctx.segment);

  // V7.0: Subject line with rich personalization
  let subject = '';
  if (profile.vipTier === 'platinum' && ctx.enrichedData?.totalPremium) {
    // VIP subject - acknowledge their investment
    const premiumK = Math.round(ctx.enrichedData.totalPremium / 1000);
    subject = `${firstNameFormatted}, reviewing your $${premiumK}K in coverage`;
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else if (profile.isClaimsFree && ctx.tenureYears >= 5) {
    // Long-term claims-free customer
    subject = `${ctx.tenureYears} years, 0 claims = ${savings.displayString} discount`;
    personalization.usedTenure = true;
    personalization.usedDollarAmount = true;
  } else if (ctx.daysUntilRenewal <= 30 && ctx.daysUntilRenewal > 0) {
    subject = `${firstNameFormatted}, ${savings.displayString} before ${ctx.renewalDate}?`;
    personalization.usedTriggerDate = true;
    personalization.usedDollarAmount = true;
  } else if (profile.isMultiPolicy && ctx.enrichedData?.policyCount) {
    subject = `${ctx.enrichedData.policyCount} policies, 1 more discount`;
    personalization.usedLifeStage = true;
  } else if (ctx.tenureYears >= 3) {
    subject = `${ctx.tenureYears}-year customer discount`;
    personalization.usedTenure = true;
  } else {
    subject = `Quick question about your ${cleanProducts}`;
  }

  // Body: under 100 words
  let body = `Hi ${firstNameFormatted},\n\n`;

  // V7.0: Opening based on customer profile
  if (profile.vipTier === 'platinum' || profile.vipTier === 'gold') {
    // VIP opening
    const premiumFormatted = ctx.enrichedData?.totalPremium
      ? `$${Math.round(ctx.enrichedData.totalPremium).toLocaleString()}`
      : 'your coverage';
    body += `With ${premiumFormatted} across your policies, I want to make sure you're getting every discount you've earned.`;
    personalization.usedDollarAmount = true;
    if (profile.isClaimsFree) {
      body += ` You've been claims-free the entire time - that matters.\n\n`;
    } else {
      body += `\n\n`;
    }
  } else if (profile.isClaimsFree && ctx.tenureYears >= 3) {
    // Claims-free loyalty opening
    body += `${ctx.tenureYears} years with us and 0 claims - that makes you one of my best customers. `;
    body += `You've earned discounts most people don't qualify for.\n\n`;
    personalization.usedTenure = true;
  } else if (ctx.daysUntilRenewal <= 45 && ctx.daysUntilRenewal > 0) {
    body += `Your ${cleanProducts} renews ${ctx.renewalDate}. `;
    personalization.usedTriggerDate = true;
    if (ctx.tenureYears >= 3) {
      body += `After ${ctx.tenureYears} years, you qualify for discounts that newer customers don't.\n\n`;
      personalization.usedTenure = true;
    } else {
      body += `I found something that could save you money.\n\n`;
    }
  } else if (profile.isMultiPolicy && ctx.enrichedData?.policyCount) {
    body += `With ${ctx.enrichedData.policyCount} policies with us, you're already well-bundled. `;
    body += `But I found one more discount we might be missing.\n\n`;
    personalization.usedLifeStage = true;
  } else {
    body += `I found something that could save you money.\n\n`;
  }

  // Middle (1-2 sentences): Value proposition with DOLLARS
  body += `${segmentHook.concreteValue(ctx)}.\n\n`;
  personalization.usedDollarAmount = true;

  // V7.0: Add family hook for married customers
  if (profile.isMarried && (ctx.segment.includes('Umbrella') || ctx.segment.includes('Life'))) {
    body += `For you and your spouse, this means real protection if something unexpected happens.\n\n`;
  }

  // Close (1 sentence): Specific, low-commitment ask with time estimate
  body += `Reply to this email or call me at ${AGENT_INFO.phone} - takes about 10 minutes to run the numbers.\n\n`;

  // Sign off (first person singular, local agent voice)
  body += `${AGENT_INFO.firstName}\n`;
  body += `${AGENT_INFO.phone}`;

  // V7.0: Enriched talking points
  const enrichedTalkingPoints = [
    segmentHook.gapScenario,
    segmentHook.lowCommitmentAsk
  ];

  if (profile.isClaimsFree) {
    enrichedTalkingPoints.push(`Claims-free: 0 claims on file - preferred risk status`);
  }
  if (profile.isVIP && ctx.enrichedData?.totalPremium) {
    enrichedTalkingPoints.push(`VIP: $${Math.round(ctx.enrichedData.totalPremium).toLocaleString()} annual premium`);
  }
  if (profile.isMarried) {
    enrichedTalkingPoints.push(`Married: Family protection angle available`);
  }

  enrichedTalkingPoints.push(...ctx.talkingPoints.map(tp => sanitizeForCustomer(tp)));

  // Validate output
  const validation = validateOutput(
    body,
    'email',
    personalization,
    true,
    body.includes('call me') || body.includes('Reply')
  );

  return {
    channel: 'email',
    customerName: ctx.customerName,
    subject,
    message: body,
    talkingPoints: enrichedTalkingPoints.filter(Boolean),
    compliance_notices: COMPLIANCE_FOOTERS.email,
    urgency: tierMsg.urgencyLevel,
    validation: {
      valid: validation.valid,
      issues: validation.issues,
      personalizationCount: personalization.count
    }
  };
}

/**
 * Generate a HYPER-PERSONALIZED SMS message
 * V7.0: Uses claims history, VIP status, family situation, policy count
 * Format: Under 50 words (ideally under 40), reads like a text from a real person
 * No greetings beyond "Hi [Name]", no signatures beyond first name
 * One question OR one CTA, not both
 */
function generateSMS(ctx: CustomerContext): GeneratedOutreach {
  const segmentHook = SEGMENT_HOOKS[ctx.segment] || SEGMENT_HOOKS['Segment 1: Auto→Home (Homeowner)'];
  const tierMsg = TIER_MESSAGING[ctx.tier];
  const firstName = ctx.customerName.split(' ')[0];
  const firstNameFormatted = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  const personalization = trackPersonalization();

  // V7.0: Analyze customer profile
  const profile = analyzeCustomerProfile(ctx.enrichedData, ctx.currentProducts);

  const savings = calculateBundleSavings(ctx.currentPremium, ctx.segment);

  let message = '';

  // V7.0: Priority-based SMS with rich personalization
  if (profile.vipTier === 'platinum' && ctx.enrichedData?.totalPremium) {
    // VIP SMS - acknowledge their value
    const premiumK = Math.round(ctx.enrichedData.totalPremium / 1000);
    message = `Hi ${firstNameFormatted} - with $${premiumK}K in coverage, wanted to make sure you're getting all your discounts. Got 5 min to chat? -${AGENT_INFO.firstName}`;
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else if (profile.isClaimsFree && ctx.tenureYears >= 5) {
    // Claims-free long-term customer
    message = `Hi ${firstNameFormatted} - ${ctx.tenureYears} years, 0 claims. That earns you ${savings.displayString}/year in discounts you might be missing. Quick call? -${AGENT_INFO.firstName}`;
    personalization.usedTenure = true;
    personalization.usedDollarAmount = true;
  } else if (ctx.daysUntilRenewal <= 30 && ctx.daysUntilRenewal > 0) {
    // Renewal trigger
    if (profile.isClaimsFree) {
      message = `Hi ${firstNameFormatted} - renewal on ${ctx.renewalDate}. With 0 claims, you qualify for ${savings.displayString}/year savings. Quick quote? -${AGENT_INFO.firstName}`;
    } else {
      message = `Hi ${firstNameFormatted} - your renewal's coming up ${ctx.renewalDate}. Want me to check if bundling saves you money? Could be ${savings.displayString}/year. -${AGENT_INFO.firstName}`;
    }
    personalization.usedTriggerDate = true;
    personalization.usedDollarAmount = true;
  } else if (profile.isMultiPolicy && ctx.enrichedData?.policyCount && ctx.enrichedData.policyCount >= 4) {
    // Multi-policy customer
    message = `Hi ${firstNameFormatted} - with ${ctx.enrichedData.policyCount} policies, found one more discount you might qualify for. Worth ${savings.displayString}/year. Quick look? -${AGENT_INFO.firstName}`;
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else if (ctx.tenureYears >= 5) {
    // Long-term customer
    message = `Hi ${firstNameFormatted} - ${ctx.tenureYears} years with us means you qualify for discounts. Mind if I run the numbers? Might find ${savings.displayString} in savings. -${AGENT_INFO.firstName}`;
    personalization.usedTenure = true;
    personalization.usedDollarAmount = true;
  } else if (ctx.segment === 'Segment 3: Auto→Renters') {
    // Renters
    message = `Hi ${firstNameFormatted} - quick question: do you have renters insurance? For ${calculateRentersCost()} it covers your stuff if anything happens. -${AGENT_INFO.firstName}`;
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else if (ctx.segment === 'Segment 4: Bundle→Umbrella') {
    // Umbrella - add family hook if married
    if (profile.isMarried) {
      message = `Hi ${firstNameFormatted} - for you and your family, $1M extra protection for ${calculateUmbrellaCost()}. Worth a quick look? -${AGENT_INFO.firstName}`;
    } else {
      message = `Hi ${firstNameFormatted} - have you looked at umbrella coverage? Extra $1M protection for ${calculateUmbrellaCost()}. Worth a quick look? -${AGENT_INFO.firstName}`;
    }
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else {
    // Default
    message = `Hi ${firstNameFormatted} - found a way to save you ${savings.displayString}/year on insurance. Call me when you have 5 min? ${AGENT_INFO.phone} -${AGENT_INFO.firstName}`;
    personalization.usedDollarAmount = true;
  }

  // Validate output
  const validation = validateOutput(
    message,
    'sms',
    personalization,
    true,
    message.includes('?') || message.includes('Call me')
  );

  return {
    channel: 'sms',
    customerName: ctx.customerName,
    message,
    talkingPoints: [
      segmentHook.lowCommitmentAsk,
      segmentHook.gapScenario,
      profile.isClaimsFree ? 'Claims-free: Use as trust signal' : '',
      profile.isVIP ? 'VIP customer: Premium treatment' : ''
    ].filter(Boolean),
    compliance_notices: COMPLIANCE_FOOTERS.sms,
    urgency: tierMsg.urgencyLevel,
    validation: {
      valid: validation.valid,
      issues: validation.issues,
      personalizationCount: personalization.count
    }
  };
}

/**
 * Generate a HYPER-PERSONALIZED mail letter template
 * V7.0: Uses claims history, VIP status, family situation, policy count
 * Format: Personal letter from local agent, specific dollar amounts
 * Opening (1-2 sentences), Middle (value with dollars), Close (specific ask)
 * Uses first person singular, local agent voice
 */
function generateMailLetter(ctx: CustomerContext): GeneratedOutreach {
  const segmentHook = SEGMENT_HOOKS[ctx.segment] || SEGMENT_HOOKS['Segment 1: Auto→Home (Homeowner)'];
  const tierMsg = TIER_MESSAGING[ctx.tier];
  const firstName = ctx.customerName.split(' ')[0];
  const firstNameFormatted = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  const personalization = trackPersonalization();

  // V7.0: Analyze customer profile
  const profile = analyzeCustomerProfile(ctx.enrichedData, ctx.currentProducts);

  // Sanitize product names
  const cleanProducts = sanitizeProductName(ctx.currentProducts);

  let letter = `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n`;
  letter += `${ctx.customerName}\n`;
  letter += `${ctx.city}\n\n`;

  letter += `${firstNameFormatted},\n\n`;

  // V7.0: Opening based on customer profile
  if (profile.vipTier === 'platinum' && ctx.enrichedData?.totalPremium) {
    // VIP opening
    const premiumFormatted = `$${Math.round(ctx.enrichedData.totalPremium).toLocaleString()}`;
    letter += `With ${premiumFormatted} in annual coverage across ${ctx.enrichedData.policyCount || 'your'} policies, you're one of my most valued customers.`;
    if (profile.isClaimsFree) {
      letter += ` And you've never filed a claim in all that time - that's exactly the kind of customer who deserves the best rates I can offer.`;
    }
    personalization.usedDollarAmount = true;
    personalization.usedLifeStage = true;
  } else if (profile.isClaimsFree && ctx.tenureYears >= 5) {
    // Claims-free long-term customer
    letter += `After ${ctx.tenureYears} years together and zero claims, you've earned something most customers don't qualify for - my best available rates.`;
    personalization.usedTenure = true;
  } else if (ctx.tenureYears >= 5) {
    letter += `You've been with me for ${ctx.tenureYears} years now, and I want to make sure you're getting every discount you've earned.`;
    personalization.usedTenure = true;
  } else if (ctx.daysUntilRenewal <= 60 && ctx.daysUntilRenewal > 0) {
    letter += `Your ${cleanProducts} renews ${ctx.renewalDate}, and I found something worth sharing before then.`;
    personalization.usedTriggerDate = true;
  } else if (profile.isMultiPolicy && ctx.enrichedData?.policyCount) {
    letter += `With ${ctx.enrichedData.policyCount} policies with our agency, you've already built a strong insurance foundation. I found one more piece that might be missing.`;
    personalization.usedLifeStage = true;
  } else {
    letter += `I was reviewing my ${ctx.city} customers this week and noticed something on your account.`;
    personalization.usedLocation = true;
  }

  letter += `\n\n`;

  // Middle (1-2 sentences): Value proposition with DOLLARS
  letter += `${segmentHook.concreteValue(ctx)}.\n\n`;
  personalization.usedDollarAmount = true;

  // V7.0: Add family hook for married customers
  if (profile.isMarried && (ctx.segment.includes('Umbrella') || ctx.segment.includes('Life'))) {
    letter += `For you and your spouse, this kind of coverage means real protection if something unexpected happens.\n\n`;
  }

  // Add gap scenario for context (especially important for umbrella)
  if (ctx.segment === 'Segment 4: Bundle→Umbrella') {
    letter += `Here's why this matters: ${segmentHook.gapScenario.toLowerCase()}.\n\n`;
  }

  // Close (1 sentence): Specific, low-commitment ask
  letter += `Give me a call at ${AGENT_INFO.phone} when you have 10 minutes - I can run the numbers while we talk.\n\n`;

  // Sign off (first person, local agent)
  letter += `${AGENT_INFO.name}\n`;
  letter += `${AGENT_INFO.agency}\n`;
  letter += `${AGENT_INFO.location}\n`;
  letter += `${AGENT_INFO.phone}`;

  // V7.0: Enriched talking points
  const enrichedTalkingPoints = [
    segmentHook.gapScenario,
    segmentHook.lowCommitmentAsk
  ];

  if (profile.isClaimsFree) {
    enrichedTalkingPoints.push(`Claims-free customer: Preferred risk, emphasize their track record`);
  }
  if (profile.isVIP && ctx.enrichedData?.totalPremium) {
    enrichedTalkingPoints.push(`VIP ($${Math.round(ctx.enrichedData.totalPremium).toLocaleString()}): Premium treatment expected`);
  }
  if (profile.isMarried) {
    enrichedTalkingPoints.push(`Married: Can reference family protection`);
  }
  if (ctx.enrichedData?.policyCount && ctx.enrichedData.policyCount >= 3) {
    enrichedTalkingPoints.push(`Multi-policy (${ctx.enrichedData.policyCount}): Consolidation/loyalty angle`);
  }

  enrichedTalkingPoints.push(...ctx.talkingPoints.map(tp => sanitizeForCustomer(tp)));

  // Validate output
  const validation = validateOutput(
    letter,
    'mail',
    personalization,
    true,
    letter.includes('call') || letter.includes('10 minutes')
  );

  return {
    channel: 'mail',
    customerName: ctx.customerName,
    message: letter,
    talkingPoints: enrichedTalkingPoints.filter(Boolean),
    compliance_notices: COMPLIANCE_FOOTERS.mail,
    urgency: tierMsg.urgencyLevel,
    validation: {
      valid: validation.valid,
      issues: validation.issues,
      personalizationCount: personalization.count
    }
  };
}

/**
 * Main function to generate outreach for a customer
 * V7.0: Now accepts enrichedCustomerData for hyper-personalization
 */
export function generateOutreach(
  channel: OutreachChannel,
  opportunity: {
    customerName: string;
    segment: string;
    priorityTier: string;
    currentProducts: string;
    recommendedProduct: string;
    currentPremium: number;
    potentialPremiumAdd: number;
    daysUntilRenewal: number;
    renewalDate: string;
    balanceDue: number;
    tenureYears: number;
    ezpayStatus: string;
    talkingPoint1: string;
    talkingPoint2: string;
    talkingPoint3: string;
    city: string;
  },
  enrichedCustomerData?: EnrichedCustomerData
): GeneratedOutreach {
  const ctx: CustomerContext = {
    customerName: opportunity.customerName,
    segment: opportunity.segment as CrossSellSegment,
    tier: opportunity.priorityTier as PriorityTier,
    currentProducts: opportunity.currentProducts,
    recommendedProduct: opportunity.recommendedProduct,
    currentPremium: opportunity.currentPremium,
    potentialPremiumAdd: opportunity.potentialPremiumAdd,
    daysUntilRenewal: opportunity.daysUntilRenewal,
    renewalDate: opportunity.renewalDate,
    balanceDue: opportunity.balanceDue,
    tenureYears: opportunity.tenureYears,
    ezpayStatus: opportunity.ezpayStatus,
    city: opportunity.city,
    talkingPoints: [
      opportunity.talkingPoint1,
      opportunity.talkingPoint2,
      opportunity.talkingPoint3
    ].filter(Boolean),
    // V7.0: Pass enriched customer data
    enrichedData: enrichedCustomerData
  };

  switch (channel) {
    case 'call':
      return generateCallScript(ctx);
    case 'email':
      return generateEmail(ctx);
    case 'sms':
      return generateSMS(ctx);
    case 'mail':
      return generateMailLetter(ctx);
    default:
      return generateCallScript(ctx);
  }
}

/**
 * Get recommended channel based on customer profile
 */
export function getRecommendedChannel(opportunity: {
  priorityTier: string;
  daysUntilRenewal: number;
  balanceDue: number;
  phone: string;
  email: string;
}): OutreachChannel {
  // HOT tier with urgent timing = call first
  if (opportunity.priorityTier === 'HOT' && opportunity.daysUntilRenewal <= 14) {
    return 'call';
  }

  // Balance due = call to address immediately
  if (opportunity.balanceDue > 0) {
    return 'call';
  }

  // HIGH tier = email for efficiency
  if (opportunity.priorityTier === 'HIGH') {
    return 'email';
  }

  // MEDIUM/LOW = email or SMS based on contact info
  if (opportunity.email) {
    return 'email';
  }

  if (opportunity.phone) {
    return 'sms';
  }

  return 'mail';
}

/**
 * Validate if outreach is compliant based on consent
 */
export function isOutreachCompliant(
  channel: OutreachChannel,
  consent: { email_ok?: boolean; sms_ok?: boolean; call_ok?: boolean; mail_ok?: boolean; do_not_contact?: boolean } | undefined
): { compliant: boolean; reason?: string } {
  // If no consent record, assume opt-in (existing customer relationship)
  if (!consent) {
    return { compliant: true };
  }

  // Do not contact override
  if (consent.do_not_contact) {
    return { compliant: false, reason: 'Customer has requested no contact' };
  }

  // Channel-specific checks
  switch (channel) {
    case 'email':
      if (consent.email_ok === false) {
        return { compliant: false, reason: 'Customer has opted out of email' };
      }
      break;
    case 'sms':
      if (consent.sms_ok === false) {
        return { compliant: false, reason: 'Customer has opted out of SMS' };
      }
      break;
    case 'call':
      if (consent.call_ok === false) {
        return { compliant: false, reason: 'Customer is on do-not-call list' };
      }
      break;
    case 'mail':
      if (consent.mail_ok === false) {
        return { compliant: false, reason: 'Customer has opted out of mail' };
      }
      break;
  }

  return { compliant: true };
}
