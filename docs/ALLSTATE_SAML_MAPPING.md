# Allstate SAML Attribute Mapping Guide

**Created:** 2026-02-04
**Status:** Reference Documentation
**Identity Provider:** Allstate PingFederate (backed by Azure AD)

---

## Overview

This document defines how SAML attributes from Allstate's PingFederate identity provider map to our database schema. Allstate uses PingFederate as the central authentication hub, with Azure AD as the underlying identity source.

### Identity Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Allstate Identity Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐   │
│   │   Azure AD   │ ──────► │ PingFederate │ ──────► │    Clerk     │   │
│   │  (Identity   │  SAML   │   (Central   │  SAML   │   (Auth      │   │
│   │   Source)    │         │    Hub)      │         │   Broker)    │   │
│   └──────────────┘         └──────────────┘         └──────────────┘   │
│                                                              │          │
│                                                              ▼          │
│                                                     ┌──────────────┐   │
│                                                     │  Our App     │   │
│                                                     │  (Next.js)   │   │
│                                                     └──────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Expected SAML Attributes

The following attributes are expected in the SAML assertion from PingFederate:

| SAML Attribute Name | Required | Source | Description | Example Value |
|---------------------|----------|--------|-------------|---------------|
| `NameID` | Yes | Azure AD | Unique user identifier (typically email or UPN) | `john.smith@allstate.com` |
| `email` | Yes | Azure AD | User's email address | `john.smith@allstate.com` |
| `first_name` | Yes | Azure AD | User's given name | `John` |
| `last_name` | Yes | Azure AD | User's surname | `Smith` |
| `agency_code` | Yes | Azure AD/Custom | Allstate agency identifier (5-6 characters) | `AG1234` |
| `role` | Yes | Azure AD/Custom | User's role within the agency | `Agent`, `Manager`, `Adjuster` |
| `employee_id` | No | Azure AD | Allstate employee/contractor ID | `EMP123456` |
| `department` | No | Azure AD | Department or business unit | `Auto Claims`, `Property Sales` |

### Attribute Name Variations

PingFederate may use different attribute naming conventions. Here are the expected variations:

| Standard Name | Alternative Names | OID Format |
|---------------|-------------------|------------|
| `email` | `mail`, `emailAddress`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | `urn:oid:0.9.2342.19200300.100.1.3` |
| `first_name` | `givenName`, `firstName`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` | `urn:oid:2.5.4.42` |
| `last_name` | `surname`, `sn`, `lastName`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` | `urn:oid:2.5.4.4` |
| `agency_code` | `agencyCode`, `agency_id`, `allstate_agency_code`, `custom:agency_code` | N/A (custom) |
| `role` | `groups`, `memberOf`, `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` | N/A |
| `employee_id` | `employeeId`, `employeeNumber`, `allstate_employee_id` | `urn:oid:2.16.840.1.113730.3.1.3` |
| `department` | `departmentName`, `ou`, `organizationalUnit` | `urn:oid:2.5.4.11` |

---

## 2. Database Mapping

### 2.1 Users Table Mapping

SAML attributes map to the `users` table as follows:

| SAML Attribute | Database Column | Transformation | Notes |
|----------------|-----------------|----------------|-------|
| `NameID` | `clerk_id` | Clerk-provided ID | Clerk wraps the SAML NameID |
| `email` | `email` | Lowercase, trim | `john.smith@allstate.com` |
| `first_name` + `last_name` | `name` | `"${first_name} ${last_name.charAt(0)}."` | `"John S."` |
| N/A | `color` | Auto-assigned | Random from Allstate brand colors |
| N/A | `pin_hash` | `NULL` | SSO users don't have PINs |

**Database Schema Reference:**

```sql
-- From: supabase/migrations/20260204_add_clerk_id.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Existing columns used:
-- id: UUID (primary key, auto-generated)
-- name: TEXT (display name from SAML)
-- color: TEXT (Allstate brand color)
-- pin_hash: TEXT (NULL for SSO users)
```

### 2.2 Agency Members Table Mapping

SAML attributes map to the `agency_members` table as follows:

| SAML Attribute | Database Column | Transformation | Notes |
|----------------|-----------------|----------------|-------|
| `agency_code` | `agency_id` | Lookup via `agencies.slug` | See Agency Matching section |
| `role` | `role` | Role mapping function | See Role Mapping section |
| N/A | `user_id` | From newly created/linked user | FK to `users.id` |
| N/A | `status` | `'active'` | SSO users are immediately active |
| N/A | `permissions` | From role defaults | See `DEFAULT_PERMISSIONS` in `src/types/agency.ts` |
| N/A | `is_default_agency` | `true` | First agency is default |

**Database Schema Reference:**

```sql
-- From: supabase/migrations/20260126_multi_tenancy.sql
CREATE TABLE agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  permissions JSONB DEFAULT '{...}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  is_default_agency BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);
```

---

## 3. Clerk Configuration

### 3.1 SAML Connection Setup

In Clerk Dashboard, configure the SAML connection with Allstate's PingFederate:

**Clerk Dashboard > Organizations > SAML Connections > Add Connection**

```yaml
Connection Name: Allstate PingFederate
IdP Entity ID: https://fed.allstate.com/idp/sso
SSO URL: https://fed.allstate.com/idp/SSO.saml2
Certificate: [Upload Allstate's X.509 signing certificate]
```

### 3.2 Attribute Mapping Configuration

Configure attribute mappings in Clerk Dashboard:

**Clerk Dashboard > SAML Connection > Attribute Mapping**

| Clerk Field | SAML Attribute (try in order) |
|-------------|-------------------------------|
| Email | `email`, `mail`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
| First Name | `first_name`, `givenName`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` |
| Last Name | `last_name`, `surname`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` |

### 3.3 Custom Attribute Passthrough

For attributes not natively supported by Clerk (like `agency_code` and `role`), configure them as **Public Metadata** attributes:

**Clerk Dashboard > SAML Connection > Public Metadata Mapping**

| Metadata Key | SAML Attribute (try in order) |
|--------------|-------------------------------|
| `agency_code` | `agency_code`, `agencyCode`, `custom:agency_code` |
| `allstate_role` | `role`, `groups`, `memberOf` |
| `employee_id` | `employee_id`, `employeeId`, `employeeNumber` |
| `department` | `department`, `departmentName`, `ou` |

These will be accessible in your application via:

```typescript
// In a server-side API route or middleware
import { auth } from '@clerk/nextjs/server';

const { userId, sessionClaims } = auth();

// Access SAML attributes from public metadata
const agencyCode = sessionClaims?.publicMetadata?.agency_code;
const allstateRole = sessionClaims?.publicMetadata?.allstate_role;
```

### 3.4 Webhook Configuration

Configure Clerk webhooks to trigger JIT provisioning:

**Clerk Dashboard > Webhooks > Add Endpoint**

```yaml
Endpoint URL: https://your-app.railway.app/api/webhooks/clerk
Events:
  - user.created
  - user.updated
  - session.created
Signing Secret: whsec_...
```

---

## 4. Just-In-Time (JIT) Provisioning Logic

When a user authenticates via SAML for the first time, they are automatically provisioned in our database.

### 4.1 Provisioning Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        JIT Provisioning Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User clicks "Sign in with Allstate"                                  │
│                    │                                                     │
│                    ▼                                                     │
│  2. Redirect to PingFederate → Azure AD authentication                   │
│                    │                                                     │
│                    ▼                                                     │
│  3. SAML assertion returned to Clerk                                     │
│                    │                                                     │
│                    ▼                                                     │
│  4. Clerk creates/updates user record                                    │
│                    │                                                     │
│                    ▼                                                     │
│  5. Clerk fires `user.created` or `session.created` webhook              │
│                    │                                                     │
│                    ▼                                                     │
│  6. Our webhook handler:                                                 │
│     a. Extract SAML attributes from Clerk user                           │
│     b. Look up agency by agency_code                                     │
│     c. Map Allstate role to our role                                     │
│     d. Create/link user in our database                                  │
│     e. Create agency membership                                          │
│                    │                                                     │
│                    ▼                                                     │
│  7. User redirected to app with valid session                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation Code

The JIT provisioning is handled by the `linkClerkUser` function with SAML-specific extensions:

```typescript
// src/lib/auth/linkClerkUserWithSAML.ts

import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PERMISSIONS } from '@/types/agency';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allstate brand colors for user assignment
const USER_COLORS = [
  '#0033A0', // Brand Blue
  '#72B5E8', // Sky Blue
  '#C9A227', // Gold
  '#003D7A', // Navy
  '#6E8AA7', // Muted Blue
  '#5BA8A0', // Teal
  '#E87722', // Orange
  '#98579B', // Purple
];

interface SAMLUserData {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  agencyCode: string;
  allstateRole: string;
  employeeId?: string;
  department?: string;
}

interface ProvisionedUser {
  user: {
    id: string;
    name: string;
    email: string;
    clerk_id: string;
  };
  membership: {
    agency_id: string;
    role: 'owner' | 'manager' | 'staff';
  };
}

/**
 * Provision a user from SAML attributes
 */
export async function provisionUserFromSAML(
  samlData: SAMLUserData
): Promise<ProvisionedUser> {
  const {
    clerkUserId,
    email,
    firstName,
    lastName,
    agencyCode,
    allstateRole,
  } = samlData;

  // Step 1: Find or create the agency
  const agency = await findOrCreateAgency(agencyCode);

  // Step 2: Map Allstate role to our role
  const mappedRole = mapAllstateRole(allstateRole);

  // Step 3: Find or create the user
  const user = await findOrCreateUser({
    clerkUserId,
    email,
    firstName,
    lastName,
  });

  // Step 4: Create or update agency membership
  const membership = await createOrUpdateMembership({
    userId: user.id,
    agencyId: agency.id,
    role: mappedRole,
  });

  return { user, membership };
}

/**
 * Find agency by code or create if it doesn't exist (with pending status)
 */
async function findOrCreateAgency(agencyCode: string) {
  // Normalize agency code (uppercase, trim)
  const normalizedCode = agencyCode.toUpperCase().trim();

  // Try to find existing agency
  const { data: existing } = await supabase
    .from('agencies')
    .select('*')
    .eq('slug', normalizedCode.toLowerCase())
    .single();

  if (existing) {
    return existing;
  }

  // Agency doesn't exist - this could be:
  // 1. First user from this agency (needs to set up)
  // 2. Invalid agency code
  // For now, create with pending status
  const { data: newAgency, error } = await supabase
    .from('agencies')
    .insert({
      name: `Agency ${normalizedCode}`,
      slug: normalizedCode.toLowerCase(),
      is_active: false, // Requires admin activation
      subscription_tier: 'starter',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create agency: ${error.message}`);
  }

  return newAgency;
}

/**
 * Find user by Clerk ID or email, or create new
 */
async function findOrCreateUser(data: {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const { clerkUserId, email, firstName, lastName } = data;

  // Check if already linked
  const { data: existingByClerk } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (existingByClerk) {
    return existingByClerk;
  }

  // Check if email exists (from previous PIN auth)
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (existingByEmail) {
    // Link existing user to Clerk
    const { data: linked } = await supabase
      .from('users')
      .update({ clerk_id: clerkUserId })
      .eq('id', existingByEmail.id)
      .select()
      .single();

    return linked;
  }

  // Create new user
  const displayName = `${firstName} ${lastName.charAt(0)}.`;

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name: displayName,
      email: email.toLowerCase(),
      clerk_id: clerkUserId,
      color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
      pin_hash: null, // SSO users don't have PINs
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
}

/**
 * Create or update agency membership
 */
async function createOrUpdateMembership(data: {
  userId: string;
  agencyId: string;
  role: 'owner' | 'manager' | 'staff';
}) {
  const { userId, agencyId, role } = data;
  const permissions = DEFAULT_PERMISSIONS[role];

  const { data: membership, error } = await supabase
    .from('agency_members')
    .upsert({
      user_id: userId,
      agency_id: agencyId,
      role,
      permissions,
      status: 'active',
      is_default_agency: true,
      joined_at: new Date().toISOString(),
    }, {
      onConflict: 'agency_id,user_id',
      // Don't demote existing owners/managers on re-login
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create membership: ${error.message}`);
  }

  return membership;
}
```

---

## 5. Role Mapping

### 5.1 Allstate Role to Application Role Mapping

| Allstate Role (from SAML) | Our Role | Permissions Summary |
|---------------------------|----------|---------------------|
| `Agency Owner` | `owner` | Full access, billing, agency settings |
| `Agency Manager` | `owner` | Full access (treated as owner) |
| `Manager` | `manager` | Team oversight, task assignment |
| `Supervisor` | `manager` | Team oversight, task assignment |
| `Team Lead` | `manager` | Team oversight, task assignment |
| `Agent` | `staff` | Own tasks, basic features |
| `Sales Agent` | `staff` | Own tasks, basic features |
| `Service Rep` | `staff` | Own tasks, basic features |
| `Adjuster` | `staff` | Own tasks, basic features |
| `Claims Adjuster` | `staff` | Own tasks, basic features |
| `Admin Assistant` | `staff` | Own tasks, basic features |
| (default/unknown) | `staff` | Safest default |

### 5.2 Role Mapping Implementation

```typescript
// src/lib/auth/roleMapping.ts

type AllstateRole = string;
type AppRole = 'owner' | 'manager' | 'staff';

/**
 * Map Allstate role from SAML to our application role
 */
export function mapAllstateRole(allstateRole: AllstateRole): AppRole {
  // Normalize role string
  const normalizedRole = allstateRole?.toLowerCase().trim() || '';

  // Owner-level roles
  const ownerRoles = [
    'agency owner',
    'agency_owner',
    'agencyowner',
    'agency manager',  // Primary manager of agency
    'agency_manager',
    'principal',
    'principal agent',
  ];

  // Manager-level roles
  const managerRoles = [
    'manager',
    'supervisor',
    'team lead',
    'team_lead',
    'teamlead',
    'senior agent',
    'senior_agent',
    'lead',
    'coordinator',
    'office manager',
    'office_manager',
  ];

  // Check owner roles
  if (ownerRoles.some(r => normalizedRole.includes(r))) {
    return 'owner';
  }

  // Check manager roles
  if (managerRoles.some(r => normalizedRole.includes(r))) {
    return 'manager';
  }

  // Default to staff for all other roles
  // This includes: agent, adjuster, service rep, etc.
  return 'staff';
}

/**
 * Check if a role string indicates elevated privileges
 */
export function isElevatedRole(allstateRole: string): boolean {
  const role = mapAllstateRole(allstateRole);
  return role === 'owner' || role === 'manager';
}
```

### 5.3 Permission Defaults by Role

From `src/types/agency.ts`, each role has default permissions:

| Permission | Owner | Manager | Staff |
|------------|-------|---------|-------|
| `can_create_tasks` | Yes | Yes | Yes |
| `can_edit_own_tasks` | Yes | Yes | Yes |
| `can_edit_all_tasks` | Yes | Yes | No |
| `can_delete_own_tasks` | Yes | Yes | Yes |
| `can_delete_all_tasks` | Yes | No | No |
| `can_assign_tasks` | Yes | Yes | No |
| `can_view_all_tasks` | Yes | Yes | No |
| `can_reorder_tasks` | Yes | Yes | No |
| `can_view_team_tasks` | Yes | Yes | No |
| `can_view_team_stats` | Yes | Yes | No |
| `can_manage_team` | Yes | No | No |
| `can_use_chat` | Yes | Yes | Yes |
| `can_delete_own_messages` | Yes | Yes | Yes |
| `can_delete_all_messages` | Yes | No | No |
| `can_pin_messages` | Yes | Yes | No |
| `can_view_strategic_goals` | Yes | Yes | No |
| `can_edit_strategic_goals` | Yes | No | No |
| `can_view_archive` | Yes | Yes | No |
| `can_use_ai_features` | Yes | Yes | Yes |
| `can_manage_templates` | Yes | Yes | No |
| `can_view_activity_log` | Yes | Yes | Yes |

---

## 6. Agency Matching

### 6.1 Agency Code Format

Allstate agency codes typically follow these patterns:

| Pattern | Example | Description |
|---------|---------|-------------|
| Standard | `AG1234` | Most common format |
| Extended | `AG12345A` | With location suffix |
| State Prefix | `IL-1234` | State-specific agencies |
| Legacy | `123456` | Numeric only (older systems) |

### 6.2 Agency Lookup Logic

```typescript
// src/lib/auth/agencyLookup.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AgencyLookupResult {
  found: boolean;
  agency?: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  };
  action: 'use_existing' | 'create_pending' | 'error';
  message?: string;
}

/**
 * Look up or create an agency by Allstate agency code
 */
export async function lookupAgencyByCode(
  agencyCode: string
): Promise<AgencyLookupResult> {
  // Normalize the agency code
  const slug = normalizeAgencyCode(agencyCode);

  if (!slug) {
    return {
      found: false,
      action: 'error',
      message: 'Invalid agency code format',
    };
  }

  // Try exact match on slug
  let { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, is_active')
    .eq('slug', slug)
    .single();

  if (agency) {
    return {
      found: true,
      agency,
      action: 'use_existing',
    };
  }

  // Try alternate formats
  const alternateSlug = generateAlternateSlugs(agencyCode);
  for (const alt of alternateSlug) {
    const { data: altAgency } = await supabase
      .from('agencies')
      .select('id, name, slug, is_active')
      .eq('slug', alt)
      .single();

    if (altAgency) {
      return {
        found: true,
        agency: altAgency,
        action: 'use_existing',
      };
    }
  }

  // Agency not found - return action to create
  return {
    found: false,
    action: 'create_pending',
    message: `Agency with code "${agencyCode}" not found. Will create pending agency.`,
  };
}

/**
 * Normalize agency code to slug format
 */
function normalizeAgencyCode(code: string): string | null {
  if (!code || code.length < 3) {
    return null;
  }

  return code
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate alternate slug formats to try
 */
function generateAlternateSlugs(code: string): string[] {
  const normalized = code.toLowerCase().trim();
  const slugs: string[] = [];

  // Remove common prefixes/suffixes
  if (normalized.startsWith('ag')) {
    slugs.push(normalized.slice(2));
  }

  // Add with/without hyphens
  if (normalized.includes('-')) {
    slugs.push(normalized.replace(/-/g, ''));
  } else {
    // Try adding hyphen after letters
    const match = normalized.match(/^([a-z]+)(\d+)$/);
    if (match) {
      slugs.push(`${match[1]}-${match[2]}`);
    }
  }

  return slugs;
}
```

### 6.3 Agency Creation for New Codes

When an agency code doesn't exist, we create a "pending" agency:

```typescript
/**
 * Create a pending agency for a new agency code
 */
async function createPendingAgency(agencyCode: string, firstUserEmail: string) {
  const slug = normalizeAgencyCode(agencyCode)!;

  const { data: agency, error } = await supabase
    .from('agencies')
    .insert({
      name: `Agency ${agencyCode.toUpperCase()}`, // Placeholder name
      slug,
      is_active: false, // Requires manual activation
      subscription_tier: 'starter',
      primary_color: '#0033A0', // Allstate blue
      secondary_color: '#72B5E8',
      // Store metadata for admin review
      settings: {
        pending_activation: true,
        first_user_email: firstUserEmail,
        created_from_saml: true,
        original_agency_code: agencyCode,
        created_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create pending agency: ${error.message}`);
  }

  // Log for admin notification
  console.log(`[SAML] Created pending agency: ${slug} (needs activation)`);

  // TODO: Send notification to admin
  // await notifyAdminOfPendingAgency(agency);

  return agency;
}
```

---

## 7. Error Handling

### 7.1 Error Scenarios and Responses

| Scenario | Error Code | User Message | Action |
|----------|------------|--------------|--------|
| Missing `agency_code` | `MISSING_AGENCY_CODE` | "Your account is not associated with an agency. Please contact your administrator." | Block login, log error |
| Missing `email` | `MISSING_EMAIL` | "Unable to retrieve your email address. Please contact IT support." | Block login, log error |
| Invalid agency code format | `INVALID_AGENCY_CODE` | "Invalid agency code format. Please contact your administrator." | Block login, log error |
| Agency not found | `AGENCY_NOT_FOUND` | "Your agency is being set up. You'll receive access within 24 hours." | Create pending agency, allow limited access |
| Agency deactivated | `AGENCY_DEACTIVATED` | "Your agency's account has been suspended. Please contact support." | Block login, notify admin |
| Database error | `DATABASE_ERROR` | "A technical error occurred. Please try again in a few minutes." | Retry, log error, alert ops |
| Clerk error | `AUTH_ERROR` | "Authentication failed. Please try again." | Retry, log error |

### 7.2 Error Handling Implementation

```typescript
// src/lib/auth/samlErrorHandler.ts

export class SAMLProvisioningError extends Error {
  code: string;
  userMessage: string;
  shouldBlock: boolean;

  constructor(
    code: string,
    userMessage: string,
    shouldBlock: boolean = true,
    details?: string
  ) {
    super(details || userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.shouldBlock = shouldBlock;
  }
}

/**
 * Validate SAML attributes and throw appropriate errors
 */
export function validateSAMLAttributes(attrs: Record<string, unknown>) {
  // Check required fields
  if (!attrs.email) {
    throw new SAMLProvisioningError(
      'MISSING_EMAIL',
      'Unable to retrieve your email address. Please contact IT support.',
      true
    );
  }

  if (!attrs.agency_code) {
    throw new SAMLProvisioningError(
      'MISSING_AGENCY_CODE',
      'Your account is not associated with an agency. Please contact your administrator.',
      true
    );
  }

  // Validate agency code format
  const agencyCode = String(attrs.agency_code).trim();
  if (agencyCode.length < 3 || agencyCode.length > 20) {
    throw new SAMLProvisioningError(
      'INVALID_AGENCY_CODE',
      'Invalid agency code format. Please contact your administrator.',
      true,
      `Agency code "${agencyCode}" has invalid length`
    );
  }

  // Check for required name fields
  if (!attrs.first_name && !attrs.last_name) {
    // Not blocking, but log warning
    console.warn('[SAML] Missing name fields, will use email prefix');
  }
}

/**
 * Handle agency-related errors
 */
export async function handleAgencyError(
  agencyCode: string,
  error: unknown
): Promise<void> {
  // Log the error
  console.error('[SAML] Agency error:', {
    agencyCode,
    error: error instanceof Error ? error.message : error,
    timestamp: new Date().toISOString(),
  });

  // Could send to error tracking service
  // await logToSentry(error, { agencyCode });

  // Could notify admin
  // await notifyAdmin('agency_error', { agencyCode, error });
}
```

### 7.3 User-Facing Error Page

When SAML provisioning fails, redirect users to an error page:

```typescript
// In your SAML callback handler
try {
  await provisionUserFromSAML(samlData);
} catch (error) {
  if (error instanceof SAMLProvisioningError) {
    // Redirect to error page with user-friendly message
    const params = new URLSearchParams({
      error: error.code,
      message: error.userMessage,
    });
    return redirect(`/auth/error?${params}`);
  }

  // Unknown error
  return redirect('/auth/error?error=UNKNOWN');
}
```

---

## 8. Testing SAML Integration

### 8.1 Test Data

Use these test values when testing the SAML integration:

| Attribute | Test Value 1 | Test Value 2 | Test Value 3 |
|-----------|--------------|--------------|--------------|
| `email` | `agent1@test.allstate.com` | `manager1@test.allstate.com` | `owner1@test.allstate.com` |
| `first_name` | `Test` | `Test` | `Test` |
| `last_name` | `Agent` | `Manager` | `Owner` |
| `agency_code` | `TEST01` | `TEST01` | `TEST01` |
| `role` | `Agent` | `Manager` | `Agency Owner` |
| `employee_id` | `EMP001` | `EMP002` | `EMP003` |

### 8.2 Testing Checklist

- [ ] New user with valid agency code creates user and membership
- [ ] Existing PIN user with matching email gets linked to Clerk
- [ ] User with new agency code creates pending agency
- [ ] Role mapping works for all Allstate roles
- [ ] Missing email blocks login with appropriate message
- [ ] Missing agency_code blocks login with appropriate message
- [ ] Deactivated agency blocks login
- [ ] User can log in to multiple agencies (if applicable)
- [ ] Permissions are correctly applied based on role

### 8.3 Debugging SAML Issues

To debug SAML attribute issues, enable verbose logging:

```typescript
// In your SAML callback handler
console.log('[SAML Debug] Raw Clerk user:', JSON.stringify(clerkUser, null, 2));
console.log('[SAML Debug] Public metadata:', clerkUser.publicMetadata);
console.log('[SAML Debug] Private metadata:', clerkUser.privateMetadata);
```

In Clerk Dashboard, you can also view the raw SAML assertion:
**Clerk Dashboard > Users > [User] > SAML Debug**

---

## 9. Security Considerations

### 9.1 Attribute Trust

- **Never trust user-modifiable attributes** for authorization decisions
- `agency_code` and `role` should come from Azure AD groups or PingFederate mapping rules, not user profile fields
- Verify attribute source in SAML assertion (should be signed by IdP)

### 9.2 Session Security

- Clerk handles session management with secure, HttpOnly cookies
- Sessions inherit Allstate's SSO timeout policies
- Force re-authentication for sensitive operations (handled by PingFederate)

### 9.3 Audit Logging

Log all SAML provisioning events:

```typescript
// Log successful provisioning
await logActivity({
  action: 'user_provisioned_saml',
  user_name: user.name,
  details: {
    clerk_id: clerkUserId,
    agency_code: agencyCode,
    mapped_role: mappedRole,
    source: 'pingfederate',
  },
});

// Log role changes
await logActivity({
  action: 'role_changed_saml',
  user_name: user.name,
  details: {
    from: previousRole,
    to: newRole,
    source: 'saml_attribute',
  },
});
```

---

## 10. Appendix

### 10.1 Related Files

| File | Purpose |
|------|---------|
| `src/lib/auth/linkClerkUser.ts` | Base user linking logic |
| `src/types/agency.ts` | Agency types and permissions |
| `supabase/migrations/20260204_add_clerk_id.sql` | Database schema for Clerk ID |
| `supabase/migrations/20260126_multi_tenancy.sql` | Multi-tenancy schema |
| `docs/AUTH_MIGRATION_PLAN.md` | Overall auth migration plan |

### 10.2 PingFederate Configuration Checklist

For Allstate IT to configure:

- [ ] Create Service Provider (SP) connection for Clerk
- [ ] Configure attribute mapping in PingFederate
- [ ] Release `agency_code` attribute from Azure AD
- [ ] Release `role` or group membership attribute
- [ ] Set up IdP-initiated login URL
- [ ] Configure session timeout policies
- [ ] Whitelist Clerk's ACS URL

### 10.3 Clerk Enterprise SAML Configuration Reference

```yaml
# Example Clerk SAML configuration (for reference)
saml:
  idp_entity_id: "https://fed.allstate.com/idp/sso"
  idp_sso_url: "https://fed.allstate.com/idp/SSO.saml2"
  idp_slo_url: "https://fed.allstate.com/idp/SLO.saml2"
  idp_certificate: |
    -----BEGIN CERTIFICATE-----
    [Allstate's signing certificate]
    -----END CERTIFICATE-----

  sp_entity_id: "https://your-clerk-domain.clerk.accounts.dev"
  sp_acs_url: "https://your-clerk-domain.clerk.accounts.dev/v1/saml/acs"

  attribute_mapping:
    email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    first_name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
    last_name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"

  public_metadata_mapping:
    agency_code: "agency_code"
    allstate_role: "role"
    employee_id: "employee_id"
    department: "department"
```

---

**Last Updated:** 2026-02-04
**Maintained by:** Development Team
**Next Review:** After PingFederate integration testing
