/**
 * Allstate Insurance Agency Test Personas
 *
 * Realistic user personas based on actual Allstate agency structures
 * for comprehensive UX testing of the Bealer Agency Todo List.
 *
 * Persona Categories:
 * - Tier 1: Agency Leadership (Owner, Office Manager)
 * - Tier 2: Licensed Sales Professionals (Senior/Junior LSP, Bilingual)
 * - Tier 3: Customer Service Representatives (Licensed/Unlicensed CSR)
 * - Tier 4: Specialists (Financial Specialist)
 */

import type { User, AgencyMember, Todo } from '@/types';

// ============================================================================
// PERSONA TYPES
// ============================================================================

export type PersonaRole = 'owner' | 'manager' | 'staff';
export type TechComfort = 'low' | 'medium' | 'medium-high' | 'high' | 'very-high';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'multi-device';

export interface PersonaBehavior {
  /** Primary device used */
  primaryDevice: DeviceType;
  /** Keyboard shortcut usage preference */
  usesKeyboardShortcuts: boolean;
  /** Preferred view mode */
  preferredView: 'list' | 'kanban' | 'dashboard' | 'calendar';
  /** Peak usage times */
  peakUsageHours: [number, number][];
  /** Average session duration in minutes */
  avgSessionMinutes: number;
  /** Tasks created per day */
  tasksPerDay: number;
  /** Typical task categories handled */
  taskCategories: Array<'quote' | 'renewal' | 'claim' | 'service' | 'follow-up' | 'prospecting'>;
  /** Uses AI features */
  usesAIFeatures: boolean;
  /** Mobile usage frequency */
  mobileFrequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'primarily';
  /** Chat activity level */
  chatActivity: 'silent' | 'low' | 'moderate' | 'high' | 'power-user';
}

export interface AllstatePersona {
  id: string;
  name: string;
  email: string;
  pin: string;
  color: string;
  role: PersonaRole;

  // Professional context
  title: string;
  tenure: string;
  licenses: string[];
  languages: string[];

  // Tech & behavior
  techComfort: TechComfort;
  behavior: PersonaBehavior;

  // Goals & motivations
  primaryGoals: string[];
  painPoints: string[];

  // Permissions (based on role)
  permissions: Record<string, boolean>;

  // Test scenarios this persona is best for
  testFocus: string[];
}

// ============================================================================
// PERMISSION TEMPLATES BY ROLE
// ============================================================================

export const OWNER_PERMISSIONS = {
  can_create_tasks: true,
  can_edit_own_tasks: true,
  can_edit_all_tasks: true,
  can_delete_own_tasks: true,
  can_delete_all_tasks: true,
  can_assign_tasks: true,
  can_view_all_tasks: true,
  can_reorder_tasks: true,
  can_view_team_tasks: true,
  can_view_team_stats: true,
  can_manage_team: true,
  can_use_chat: true,
  can_delete_own_messages: true,
  can_delete_all_messages: true,
  can_pin_messages: true,
  can_view_strategic_goals: true,
  can_edit_strategic_goals: true,
  can_view_archive: true,
  can_use_ai_features: true,
  can_manage_templates: true,
  can_view_activity_log: true,
};

export const MANAGER_PERMISSIONS = {
  can_create_tasks: true,
  can_edit_own_tasks: true,
  can_edit_all_tasks: true,
  can_delete_own_tasks: true,
  can_delete_all_tasks: false,
  can_assign_tasks: true,
  can_view_all_tasks: true,
  can_reorder_tasks: true,
  can_view_team_tasks: true,
  can_view_team_stats: true,
  can_manage_team: false,
  can_use_chat: true,
  can_delete_own_messages: true,
  can_delete_all_messages: false,
  can_pin_messages: true,
  can_view_strategic_goals: true,
  can_edit_strategic_goals: false,
  can_view_archive: true,
  can_use_ai_features: true,
  can_manage_templates: true,
  can_view_activity_log: true,
};

export const STAFF_PERMISSIONS = {
  can_create_tasks: true,
  can_edit_own_tasks: true,
  can_edit_all_tasks: false,
  can_delete_own_tasks: true,
  can_delete_all_tasks: false,
  can_assign_tasks: false,
  can_view_all_tasks: false,
  can_reorder_tasks: false,
  can_view_team_tasks: true,
  can_view_team_stats: false,
  can_manage_team: false,
  can_use_chat: true,
  can_delete_own_messages: true,
  can_delete_all_messages: false,
  can_pin_messages: false,
  can_view_strategic_goals: false,
  can_edit_strategic_goals: false,
  can_view_archive: true,
  can_use_ai_features: true,
  can_manage_templates: false,
  can_view_activity_log: true,
};

// ============================================================================
// TIER 1: AGENCY LEADERSHIP
// ============================================================================

export const MARCUS_BEALER: AllstatePersona = {
  id: 'marcus-bealer',
  name: 'Marcus Bealer',
  email: 'marcus@bealeragency.com',
  pin: '1234',
  color: '#0033A0', // Allstate blue
  role: 'owner',

  title: 'Agency Owner (Exclusive Agent)',
  tenure: '15 years with Allstate',
  licenses: ['P&C', 'Life & Health'],
  languages: ['English'],

  techComfort: 'medium',
  behavior: {
    primaryDevice: 'tablet',
    usesKeyboardShortcuts: false,
    preferredView: 'dashboard',
    peakUsageHours: [[6, 8], [19, 21]], // Early morning, late evening
    avgSessionMinutes: 15,
    tasksPerDay: 3,
    taskCategories: ['prospecting', 'renewal'],
    usesAIFeatures: true,
    mobileFrequency: 'often',
    chatActivity: 'low',
  },

  primaryGoals: [
    'Strategic growth oversight',
    'P&L visibility',
    'Team performance tracking',
    'High-level metrics at a glance',
  ],
  painPoints: [
    'Too much time in operational weeds',
    'Needs quick high-level visibility',
    'Information overload',
    'Context switching between agencies',
  ],

  permissions: OWNER_PERMISSIONS,

  testFocus: [
    'Dashboard comprehension in under 10 seconds',
    'Strategic goals feature adoption',
    'Delegation via task assignment',
    'Multi-agency switching (if applicable)',
    'Mobile/tablet UX for executive use',
  ],
};

export const PAT_NGUYEN: AllstatePersona = {
  id: 'pat-nguyen',
  name: 'Patricia Nguyen',
  email: 'pat@bealeragency.com',
  pin: '2345',
  color: '#7B68EE', // Medium slate blue
  role: 'manager',

  title: 'Office Manager',
  tenure: '8 years in insurance',
  licenses: ['P&C'],
  languages: ['English', 'Vietnamese'],

  techComfort: 'high',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: true,
    preferredView: 'kanban',
    peakUsageHours: [[9, 11], [14, 16]], // Morning rush, afternoon catch-up
    avgSessionMinutes: 45,
    tasksPerDay: 15,
    taskCategories: ['service', 'follow-up', 'renewal', 'claim'],
    usesAIFeatures: true,
    mobileFrequency: 'rarely',
    chatActivity: 'power-user',
  },

  primaryGoals: [
    'Workflow efficiency',
    'Team coordination',
    'Quality control',
    'Deadline tracking',
  ],
  painPoints: [
    'Context switching between team members',
    'Tracking who is doing what',
    'Meeting compliance deadlines',
    'Handling escalations',
  ],

  permissions: MANAGER_PERMISSIONS,

  testFocus: [
    'Bulk task assignment efficiency',
    'Filter/sort power user workflows',
    'Kanban board management',
    'Archive browser for compliance',
    'Team chat coordination',
    'Keyboard shortcut discoverability',
  ],
};

// ============================================================================
// TIER 2: LICENSED SALES PROFESSIONALS (LSPs)
// ============================================================================

export const DAVE_THOMPSON: AllstatePersona = {
  id: 'dave-thompson',
  name: 'David Thompson',
  email: 'dave@bealeragency.com',
  pin: '3456',
  color: '#228B22', // Forest green
  role: 'staff',

  title: 'Senior Licensed Sales Producer',
  tenure: '6 years, top performer',
  licenses: ['P&C', 'Life & Health'],
  languages: ['English'],

  techComfort: 'medium-high',
  behavior: {
    primaryDevice: 'multi-device',
    usesKeyboardShortcuts: false,
    preferredView: 'list',
    peakUsageHours: [[12, 13], [17, 18]], // Between calls, end of day
    avgSessionMinutes: 10,
    tasksPerDay: 8,
    taskCategories: ['follow-up', 'renewal', 'quote', 'prospecting'],
    usesAIFeatures: true,
    mobileFrequency: 'often', // On the go to client meetings
    chatActivity: 'moderate',
  },

  primaryGoals: [
    'Hit sales targets',
    'Retain book of business',
    'Minimize admin time',
    'Quick follow-up tracking',
  ],
  painPoints: [
    'Admin tasks eating into selling time',
    'Tracking follow-up timelines',
    'Client callback management',
    'Mobile experience for field work',
  ],

  permissions: STAFF_PERMISSIONS,

  testFocus: [
    'AI email generation for customer outreach',
    '"Waiting for response" feature usage',
    'Quick task creation from mobile',
    'Mobile task completion flow',
    'Voice-to-task creation',
  ],
};

export const JASMINE_RODRIGUEZ: AllstatePersona = {
  id: 'jasmine-rodriguez',
  name: 'Jasmine Rodriguez',
  email: 'jasmine@bealeragency.com',
  pin: '4567',
  color: '#FF69B4', // Hot pink
  role: 'staff',

  title: 'Junior Licensed Sales Producer',
  tenure: '8 months (recently licensed)',
  licenses: ['P&C'], // Studying for Life & Health
  languages: ['English', 'Spanish'],

  techComfort: 'very-high',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: true,
    preferredView: 'list',
    peakUsageHours: [[9, 12], [13, 17]], // Throughout work day
    avgSessionMinutes: 30,
    tasksPerDay: 12,
    taskCategories: ['follow-up', 'service', 'prospecting'],
    usesAIFeatures: true,
    mobileFrequency: 'sometimes',
    chatActivity: 'high', // Asks lots of questions
  },

  primaryGoals: [
    'Learn the systems',
    'Build book of business',
    'Prove value to agency',
    'Pass Life & Health exam',
  ],
  painPoints: [
    'Information overload',
    'Unsure of task priorities',
    'Needs guidance on workflows',
    'Learning curve anxiety',
  ],

  permissions: STAFF_PERMISSIONS,

  testFocus: [
    'Onboarding/first-time user experience',
    'Task templates for common workflows',
    'AI smart parse for natural language input',
    'Subtask completion tracking',
    'Chat feature for asking questions',
    'Error message clarity',
  ],
};

export const CARLOS_MENDEZ: AllstatePersona = {
  id: 'carlos-mendez',
  name: 'Carlos Mendez',
  email: 'carlos@bealeragency.com',
  pin: '5678',
  color: '#FF8C00', // Dark orange
  role: 'staff',

  title: 'Bilingual Sales Producer',
  tenure: '4 years',
  licenses: ['P&C', 'Life & Health'],
  languages: ['English', 'Spanish'],

  techComfort: 'medium',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: false,
    preferredView: 'list',
    peakUsageHours: [[10, 12], [14, 16]], // Client availability hours
    avgSessionMinutes: 20,
    tasksPerDay: 10,
    taskCategories: ['quote', 'service', 'follow-up', 'prospecting'],
    usesAIFeatures: true,
    mobileFrequency: 'sometimes', // Community events
    chatActivity: 'moderate',
  },

  primaryGoals: [
    'Serve Spanish-speaking community',
    'Cross-sell to existing customers',
    'Build referral network',
    'Community outreach',
  ],
  painPoints: [
    'Switching between languages',
    'Documenting in both languages',
    'Limited Spanish UI support',
    'Translation accuracy',
  ],

  permissions: STAFF_PERMISSIONS,

  testFocus: [
    'AI email translation/generation',
    'Task notes in multiple languages',
    'Voicemail transcription (Spanish audio)',
    'Customer name handling (accents)',
    'Bilingual content display',
  ],
};

// ============================================================================
// TIER 3: CUSTOMER SERVICE REPRESENTATIVES (CSRs)
// ============================================================================

export const SHELLY_CARTER: AllstatePersona = {
  id: 'shelly-carter',
  name: 'Michelle Carter',
  email: 'shelly@bealeragency.com',
  pin: '6789',
  color: '#4169E1', // Royal blue
  role: 'staff',

  title: 'Licensed CSR (Service & Sales)',
  tenure: '5 years',
  licenses: ['P&C'],
  languages: ['English'],

  techComfort: 'high',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: true,
    preferredView: 'list',
    peakUsageHours: [[9, 12], [13, 17]], // All business hours
    avgSessionMinutes: 60, // Continuous during shift
    tasksPerDay: 25,
    taskCategories: ['service', 'follow-up', 'claim', 'renewal'],
    usesAIFeatures: true,
    mobileFrequency: 'never',
    chatActivity: 'high',
  },

  primaryGoals: [
    'First-call resolution',
    'Cross-sell opportunities',
    'Customer retention',
    'Accurate documentation',
  ],
  painPoints: [
    'High call volume pressure',
    'Tracking callbacks',
    'Documentation during calls',
    'Duplicate customer entries',
  ],

  permissions: STAFF_PERMISSIONS,

  testFocus: [
    'Rapid task creation during calls',
    'Recurring task patterns',
    'Duplicate detection (customer calling multiple times)',
    'Push notification responsiveness',
    'Real-time sync while on calls',
    'Quick notes and updates',
  ],
};

export const TAYLOR_KIM: AllstatePersona = {
  id: 'taylor-kim',
  name: 'Taylor Kim',
  email: 'taylor@bealeragency.com',
  pin: '7890',
  color: '#9370DB', // Medium purple
  role: 'staff',

  title: 'Unlicensed CSR (Admin Focus)',
  tenure: '1.5 years',
  licenses: [], // No insurance licenses
  languages: ['English', 'Korean'],

  techComfort: 'high',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: true,
    preferredView: 'list',
    peakUsageHours: [[8, 10], [16, 18]], // Setup and wrap-up
    avgSessionMinutes: 45,
    tasksPerDay: 20,
    taskCategories: ['service', 'follow-up'],
    usesAIFeatures: false, // More limited role
    mobileFrequency: 'never',
    chatActivity: 'moderate',
  },

  primaryGoals: [
    'Keep office running smoothly',
    'Support licensed staff',
    'Document management',
    'Appointment scheduling',
  ],
  painPoints: [
    'Limited visibility into tasks',
    'Handoff coordination',
    'Knowing when to escalate',
    'Finding filed documents',
  ],

  permissions: {
    ...STAFF_PERMISSIONS,
    can_use_ai_features: false, // Restricted for unlicensed
  },

  testFocus: [
    'Task handoff to licensed staff',
    'Attachment/file upload flows',
    'Activity feed monitoring',
    'Archive browser for document retrieval',
    'Permission boundary testing',
  ],
};

// ============================================================================
// TIER 4: SPECIALISTS
// ============================================================================

export const ROB_PATTERSON: AllstatePersona = {
  id: 'rob-patterson',
  name: 'Robert Patterson',
  email: 'rob@bealeragency.com',
  pin: '8901',
  color: '#2F4F4F', // Dark slate gray
  role: 'staff',

  title: 'Financial Specialist (Life & Retirement)',
  tenure: '10 years',
  licenses: ['Life & Health', 'Series 6', 'Series 63'],
  languages: ['English'],

  techComfort: 'low',
  behavior: {
    primaryDevice: 'desktop',
    usesKeyboardShortcuts: false,
    preferredView: 'list',
    peakUsageHours: [[11, 12], [15, 16]], // Between appointments
    avgSessionMinutes: 5, // Quick check-ins
    tasksPerDay: 3,
    taskCategories: ['follow-up', 'prospecting'],
    usesAIFeatures: false, // Prefers manual
    mobileFrequency: 'rarely',
    chatActivity: 'silent',
  },

  primaryGoals: [
    'Retirement planning appointments',
    'Life policy sales',
    'Referral follow-up',
    'Minimal system interaction',
  ],
  painPoints: [
    'Another system to learn',
    'Prefers paper and phone',
    'Complex UI is frustrating',
    'Needs simplest possible workflow',
  ],

  permissions: STAFF_PERMISSIONS,

  testFocus: [
    'Minimal viable workflow (can he use just the basics?)',
    'Print/export functionality',
    'Calendar integration needs',
    'Resistance to feature complexity',
    'Essential-only UI mode',
    'Error recovery for tech-reluctant users',
  ],
};

// ============================================================================
// ALL PERSONAS COLLECTION
// ============================================================================

export const ALL_PERSONAS: AllstatePersona[] = [
  MARCUS_BEALER,
  PAT_NGUYEN,
  DAVE_THOMPSON,
  JASMINE_RODRIGUEZ,
  CARLOS_MENDEZ,
  SHELLY_CARTER,
  TAYLOR_KIM,
  ROB_PATTERSON,
];

export const PERSONAS_BY_ROLE = {
  owner: [MARCUS_BEALER],
  manager: [PAT_NGUYEN],
  staff: [DAVE_THOMPSON, JASMINE_RODRIGUEZ, CARLOS_MENDEZ, SHELLY_CARTER, TAYLOR_KIM, ROB_PATTERSON],
};

export const PERSONAS_BY_TECH_COMFORT = {
  low: [ROB_PATTERSON],
  medium: [MARCUS_BEALER, CARLOS_MENDEZ],
  'medium-high': [DAVE_THOMPSON],
  high: [PAT_NGUYEN, SHELLY_CARTER, TAYLOR_KIM],
  'very-high': [JASMINE_RODRIGUEZ],
};

// ============================================================================
// BEHAVIORAL ARCHETYPES (Cross-Role)
// ============================================================================

export type BehaviorArchetype =
  | 'power-user'
  | 'mobile-first'
  | 'reluctant-adopter'
  | 'collaborative-communicator'
  | 'data-driven';

export const ARCHETYPE_MAPPING: Record<BehaviorArchetype, AllstatePersona[]> = {
  'power-user': [PAT_NGUYEN, SHELLY_CARTER],
  'mobile-first': [DAVE_THOMPSON, MARCUS_BEALER],
  'reluctant-adopter': [ROB_PATTERSON],
  'collaborative-communicator': [JASMINE_RODRIGUEZ, SHELLY_CARTER],
  'data-driven': [PAT_NGUYEN, MARCUS_BEALER],
};

export const ARCHETYPE_TEST_FOCUS: Record<BehaviorArchetype, string[]> = {
  'power-user': [
    'Performance under heavy usage',
    'Keyboard shortcut discoverability',
    'Bulk operations efficiency',
    'Advanced filtering',
  ],
  'mobile-first': [
    'Mobile UX consistency',
    'Offline sync reliability',
    'Pull-to-refresh behavior',
    'Touch target sizes',
  ],
  'reluctant-adopter': [
    'Onboarding friction',
    'Error recovery',
    'Simplicity of core workflows',
    'Escape hatches to familiar tools',
  ],
  'collaborative-communicator': [
    'Chat performance',
    'Notification management',
    '@mention reliability',
    'Shared context visibility',
  ],
  'data-driven': [
    'Archive browser completeness',
    'CSV export accuracy',
    'Dashboard metric accuracy',
    'Activity log filtering',
  ],
};

// ============================================================================
// TEST HELPER FUNCTIONS
// ============================================================================

/**
 * Get a persona by ID
 */
export function getPersona(id: string): AllstatePersona | undefined {
  return ALL_PERSONAS.find(p => p.id === id);
}

/**
 * Get personas that match a specific test focus area
 */
export function getPersonasForTestFocus(focus: string): AllstatePersona[] {
  return ALL_PERSONAS.filter(p =>
    p.testFocus.some(f => f.toLowerCase().includes(focus.toLowerCase()))
  );
}

/**
 * Get the best persona for testing a specific feature
 */
export function getBestPersonaForFeature(feature: string): AllstatePersona | undefined {
  const featureMapping: Record<string, string> = {
    'dashboard': 'marcus-bealer',
    'kanban': 'pat-nguyen',
    'mobile': 'dave-thompson',
    'onboarding': 'jasmine-rodriguez',
    'bilingual': 'carlos-mendez',
    'high-volume': 'shelly-carter',
    'handoff': 'taylor-kim',
    'simplicity': 'rob-patterson',
    'strategic-goals': 'marcus-bealer',
    'bulk-actions': 'pat-nguyen',
    'ai-features': 'dave-thompson',
    'chat': 'jasmine-rodriguez',
  };

  const personaId = featureMapping[feature.toLowerCase()];
  return personaId ? getPersona(personaId) : undefined;
}

/**
 * Generate test user data for database seeding
 */
export function generateSeedUser(persona: AllstatePersona): Partial<User> {
  return {
    name: persona.name,
    email: persona.email,
    color: persona.color,
    role: persona.role,
  };
}

/**
 * Generate agency member data for database seeding
 */
export function generateSeedMember(persona: AllstatePersona, agencyId: string): Partial<AgencyMember> {
  return {
    agency_id: agencyId,
    role: persona.role,
    permissions: persona.permissions,
    status: 'active',
  };
}

/**
 * Generate realistic sample tasks for a persona
 */
export function generateSampleTasks(persona: AllstatePersona, count: number = 5): Partial<Todo>[] {
  const taskTemplates: Record<string, Partial<Todo>[]> = {
    'quote': [
      { text: 'Generate auto quote for new customer inquiry', category: 'quote', priority: 'high' },
      { text: 'Bundle quote for home + auto prospect', category: 'quote', priority: 'medium' },
      { text: 'Commercial insurance quote - small business', category: 'quote', policy_type: 'commercial' },
    ],
    'renewal': [
      { text: 'Review policy coverage for upcoming renewal', category: 'renewal', priority: 'medium' },
      { text: 'Contact customer about renewal options', category: 'renewal', renewal_status: 'pending' },
      { text: 'Process renewal payment received', category: 'renewal', priority: 'low' },
    ],
    'claim': [
      { text: 'File accident claim for customer collision', category: 'claim', priority: 'urgent' },
      { text: 'Follow up on pending claim status', category: 'claim', priority: 'high' },
      { text: 'Document claim photos from customer', category: 'claim' },
    ],
    'service': [
      { text: 'Update vehicle on policy - new car purchase', category: 'service', policy_type: 'auto' },
      { text: 'Process address change for customer', category: 'service', priority: 'low' },
      { text: 'Add driver to existing auto policy', category: 'service' },
    ],
    'follow-up': [
      { text: 'Call back regarding voicemail question', category: 'follow-up', priority: 'medium' },
      { text: 'Email quote details as discussed', category: 'follow-up', waiting_for_response: true },
      { text: 'Schedule annual policy review meeting', category: 'follow-up' },
    ],
    'prospecting': [
      { text: 'Contact referral from existing customer', category: 'prospecting', priority: 'high' },
      { text: 'Follow up on community event leads', category: 'prospecting' },
      { text: 'Send thank you email to new customer', category: 'prospecting' },
    ],
  };

  const tasks: Partial<Todo>[] = [];
  const categories = persona.behavior.taskCategories;

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const templates = taskTemplates[category] || taskTemplates['service'];
    const template = templates[Math.floor(Math.random() * templates.length)];

    tasks.push({
      ...template,
      created_by: persona.name,
      assigned_to: persona.name,
      status: i === 0 ? 'in_progress' : 'todo',
    });
  }

  return tasks;
}
