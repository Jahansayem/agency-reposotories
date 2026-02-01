# Agency Creation Workflow

**Last Updated**: 2026-02-01
**Status**: ✅ Fully Implemented
**Access**: Owner-only (Derrick) or System Administrators

---

## Overview

This document describes the complete workflow for creating and managing new agencies in the Bealer Agency Todo List platform. The system supports multi-agency management, allowing multiple Allstate agencies to use the platform with complete data isolation.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [User Interface Workflow](#user-interface-workflow)
3. [Manual/SQL Workflow](#manualsql-workflow)
4. [API Workflow](#api-workflow)
5. [Post-Creation Tasks](#post-creation-tasks)
6. [Troubleshooting](#troubleshooting)
7. [Security & Permissions](#security--permissions)

---

## Quick Start

### For System Administrators (Derrick)

**Via UI (Recommended)**:
1. Login to the app
2. Click on the **AgencySwitcher** button in the top-left sidebar
3. Click **"Create New Agency"** at the bottom of the dropdown
4. Fill out the form:
   - **Agency Name**: e.g., "Bealer Agency Chicago"
   - **URL Slug**: Auto-generated (can customize)
   - **Primary Color**: Choose from Allstate brand colors
5. Click **"Create Agency"**
6. ✅ You're automatically assigned as the **Owner** of the new agency

---

## User Interface Workflow

### Step 1: Access the Creation Form

**Path**: AgencySwitcher → "Create New Agency"

**Requirements**:
- Must be logged in as **Derrick** (Owner role)
- Multi-tenancy must be enabled (`NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true`)

**UI Location**:
- Desktop: Top-left sidebar, in AgencySwitcher dropdown
- Mobile: Agency selector menu

### Step 2: Fill Out Agency Information

#### **Agency Name** (Required)
- **Format**: Any text, 3-100 characters
- **Examples**:
  - "Bealer Agency Chicago"
  - "Bealer Agency - Downtown"
  - "North Side Allstate Agency"
- **Validation**:
  - Minimum 3 characters
  - Maximum 100 characters
  - Cannot be empty

#### **URL Slug** (Auto-generated, customizable)
- **Format**: Lowercase letters, numbers, hyphens only
- **Auto-generated from name**: "Bealer Agency Chicago" → `bealer-agency-chicago`
- **Can customize**: Click in the field to manually edit
- **Validation**:
  - Must be unique across all agencies
  - Only `a-z`, `0-9`, and `-` allowed
  - Minimum 3 characters

#### **Primary Color** (Optional)
- **Default**: Allstate Blue (`#0033A0`)
- **Options**: 8 pre-selected Allstate brand colors:
  - Brand Blue (`#0033A0`)
  - Sky Blue (`#72B5E8`)
  - Gold (`#C9A227`)
  - Navy (`#003D7A`)
  - Teal (`#5BA8A0`)
  - Orange (`#E87722`)
  - Purple (`#98579B`)
  - Muted Blue (`#6E8AA7`)
- **Usage**: Icon background, agency branding

### Step 3: Preview

The modal shows a **live preview** of:
- Agency icon with first letter and color
- Agency name
- URL slug path (`/agencies/slug`)

### Step 4: Create

Click **"Create Agency"** button.

**What happens**:
1. Form validation checks all fields
2. API call to `/api/agencies` (POST)
3. Database creates:
   - New agency record in `agencies` table
   - New membership record in `agency_members` table (you as owner)
4. Activity log entry created
5. Modal closes automatically
6. **You are now the owner** of the new agency
7. AgencyContext refreshes, new agency appears in dropdown

---

## Manual/SQL Workflow

For advanced users or bulk operations, you can create agencies directly in the database.

### SQL Template

```sql
-- 1. Create the agency
INSERT INTO agencies (name, slug, primary_color, secondary_color, subscription_tier, max_users, max_storage_mb, is_active)
VALUES (
  'New Agency Name',
  'new-agency-slug',
  '#0033A0',  -- Primary color
  '#72B5E8',  -- Secondary color
  'professional',  -- Subscription tier
  50,  -- Max users (professional tier)
  5120,  -- Max storage in MB (5GB for professional)
  true  -- Active
)
RETURNING id;

-- 2. Assign owner (replace with actual user_id and agency_id from step 1)
INSERT INTO agency_members (user_id, agency_id, role, status, permissions, is_default_agency)
VALUES (
  (SELECT id FROM users WHERE name = 'Derrick'),
  '<agency_id_from_step_1>',
  'owner',
  'active',
  '{
    "can_create_tasks": true,
    "can_delete_tasks": true,
    "can_view_strategic_goals": true,
    "can_invite_users": true,
    "can_manage_templates": true
  }'::jsonb,
  false  -- Not default agency
);

-- 3. Verify
SELECT
  a.name as agency_name,
  a.slug,
  u.name as owner_name,
  am.role
FROM agencies a
JOIN agency_members am ON a.id = am.agency_id
JOIN users u ON am.user_id = u.id
WHERE a.slug = 'new-agency-slug';
```

### Subscription Tier Limits

| Tier | Max Users | Max Storage |
|------|-----------|-------------|
| **starter** | 10 | 1 GB (1024 MB) |
| **professional** | 50 | 5 GB (5120 MB) |
| **enterprise** | 999 | 50 GB (51200 MB) |

---

## API Workflow

For programmatic agency creation or integration with external systems.

### Endpoint

```
POST /api/agencies
```

### Request Headers

```
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Bealer Agency Chicago",
  "slug": "bealer-agency-chicago",  // Optional, auto-generated if omitted
  "logo_url": "https://...",  // Optional
  "primary_color": "#0033A0",  // Optional, defaults to Allstate Blue
  "secondary_color": "#72B5E8",  // Optional, defaults to Sky Blue
  "created_by": "Derrick"  // User name creating the agency (becomes owner)
}
```

### Response (Success)

```json
{
  "success": true,
  "agency": {
    "id": "uuid",
    "name": "Bealer Agency Chicago",
    "slug": "bealer-agency-chicago",
    "logo_url": null,
    "primary_color": "#0033A0",
    "secondary_color": "#72B5E8",
    "subscription_tier": "professional",
    "max_users": 50,
    "max_storage_mb": 5120,
    "is_active": true,
    "created_at": "2026-02-01T12:00:00Z",
    "updated_at": "2026-02-01T12:00:00Z"
  },
  "message": "Agency \"Bealer Agency Chicago\" created successfully. You are now the owner."
}
```

### Response (Error)

**400 Bad Request** - Validation error
```json
{
  "error": "Agency name is required"
}
```

**409 Conflict** - Slug already exists
```json
{
  "error": "An agency with this name already exists. Please choose a different name."
}
```

**403 Forbidden** - Not authorized
```json
{
  "error": "Unauthorized. Only system administrators can create agencies."
}
```

**404 Not Found** - User not found
```json
{
  "error": "User not found"
}
```

### Example cURL

```bash
curl -X POST https://your-domain.com/api/agencies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bealer Agency Chicago",
    "primary_color": "#0033A0",
    "created_by": "Derrick"
  }'
```

### Example JavaScript

```javascript
const response = await fetch('/api/agencies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Bealer Agency Chicago',
    primary_color: '#0033A0',
    created_by: 'Derrick',
  }),
});

const data = await response.json();

if (response.ok) {
  console.log('Agency created:', data.agency);
} else {
  console.error('Error:', data.error);
}
```

---

## Post-Creation Tasks

After creating a new agency, you'll typically want to:

### 1. Invite Team Members

**Coming Soon**: Agency invitation system

**Current Method** (Manual SQL):
```sql
-- Add existing user to agency as admin or member
INSERT INTO agency_members (user_id, agency_id, role, status, permissions, is_default_agency)
VALUES (
  (SELECT id FROM users WHERE name = 'Sefra'),
  (SELECT id FROM agencies WHERE slug = 'bealer-agency-chicago'),
  'member',  -- or 'admin'
  'active',
  '{
    "can_create_tasks": true,
    "can_delete_tasks": false,
    "can_view_strategic_goals": false,
    "can_invite_users": false,
    "can_manage_templates": false
  }'::jsonb,
  false
);
```

### 2. Migrate Existing Data (Optional)

If you have existing tasks/messages to migrate:

```sql
-- Migrate todos to new agency
UPDATE todos
SET agency_id = (SELECT id FROM agencies WHERE slug = 'bealer-agency-chicago')
WHERE created_by = 'Derrick'
  AND agency_id IS NULL;

-- Migrate messages
UPDATE messages
SET agency_id = (SELECT id FROM agencies WHERE slug = 'bealer-agency-chicago')
WHERE created_by = 'Derrick'
  AND agency_id IS NULL;

-- Migrate activity log
UPDATE activity_log
SET agency_id = (SELECT id FROM agencies WHERE slug = 'bealer-agency-chicago')
WHERE user_name = 'Derrick'
  AND agency_id IS NULL;
```

### 3. Set as Default Agency (Optional)

Make the new agency your default when logging in:

```sql
-- Set new agency as default for Derrick
UPDATE agency_members
SET is_default_agency = false
WHERE user_id = (SELECT id FROM users WHERE name = 'Derrick');

UPDATE agency_members
SET is_default_agency = true
WHERE user_id = (SELECT id FROM users WHERE name = 'Derrick')
  AND agency_id = (SELECT id FROM agencies WHERE slug = 'bealer-agency-chicago');
```

### 4. Configure Agency Settings

**Future Features**:
- Upload agency logo
- Customize theme colors
- Set agency-specific permissions
- Configure integrations

---

## Troubleshooting

### "Unauthorized. Only system administrators can create agencies."

**Cause**: Only users with the `owner` role (Derrick) can create agencies.

**Solution**:
1. Verify you're logged in as Derrick
2. Check user role in database:
   ```sql
   SELECT name, role FROM users WHERE name = 'Derrick';
   ```
3. If role is not `owner`, update it:
   ```sql
   UPDATE users SET role = 'owner' WHERE name = 'Derrick';
   ```

### "An agency with this name already exists."

**Cause**: The generated slug conflicts with an existing agency.

**Solution**:
1. Customize the slug manually in the form
2. Or check existing agencies:
   ```sql
   SELECT name, slug FROM agencies;
   ```

### Modal doesn't appear when clicking "Create New Agency"

**Cause**: Multi-tenancy feature flag not enabled or JavaScript error.

**Solution**:
1. Check environment variable: `NEXT_PUBLIC_ENABLE_MULTI_TENANCY=true`
2. Check browser console for errors
3. Verify you're logged in as Derrick (owner)

### New agency doesn't appear in AgencySwitcher dropdown

**Cause**: AgencyContext hasn't refreshed yet.

**Solution**:
1. Refresh the page
2. Or re-login
3. Check database to verify agency was created:
   ```sql
   SELECT * FROM agencies WHERE slug = 'your-slug';
   SELECT * FROM agency_members WHERE agency_id = (SELECT id FROM agencies WHERE slug = 'your-slug');
   ```

### Can't switch to newly created agency

**Cause**: RLS policies or missing membership.

**Solution**:
1. Verify membership exists:
   ```sql
   SELECT * FROM agency_members
   WHERE user_id = (SELECT id FROM users WHERE name = 'Derrick')
     AND agency_id = (SELECT id FROM agencies WHERE slug = 'your-slug');
   ```
2. Check RLS policies are permissive (see [QUICK_START_MULTI_AGENCY.md](../QUICK_START_MULTI_AGENCY.md))

---

## Security & Permissions

### Who Can Create Agencies?

**Current Policy**: **Owner-only** (Derrick)

**Enforced at**:
- **UI Level**: "Create New Agency" button only shows for system owners
- **API Level**: `/api/agencies` endpoint checks `user.role === 'owner'`
- **Database Level**: No RLS restrictions (application-level only)

### Future Models

#### Option A: Owner-Only (Current)
- Only Derrick can create agencies
- Use case: Bealer Agency managing multiple office locations

#### Option B: Admin+ Only
- Owners and admins can create agencies
- Use case: Franchise model with regional managers

#### Option C: Public Multi-Tenant SaaS
- Any registered user can create their own agency
- Use case: SaaS platform for independent insurance agents
- **Requires**: Billing integration, subscription management

### Data Isolation

Each agency has **complete data isolation**:
- ✅ Tasks (`todos.agency_id`)
- ✅ Messages (`messages.agency_id`)
- ✅ Activity Log (`activity_log.agency_id`)
- ✅ Templates (`task_templates.agency_id`)
- ✅ Strategic Goals (`strategic_goals.agency_id`)

**Users can be members of multiple agencies** and switch between them using the AgencySwitcher.

### Activity Logging

All agency creation events are logged:

```sql
SELECT * FROM activity_log WHERE action = 'agency_created';
```

Example entry:
```json
{
  "action": "agency_created",
  "user_name": "Derrick",
  "details": {
    "agency_id": "uuid",
    "agency_name": "Bealer Agency Chicago",
    "agency_slug": "bealer-agency-chicago"
  },
  "created_at": "2026-02-01T12:00:00Z"
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START_MULTI_AGENCY.md](../QUICK_START_MULTI_AGENCY.md) | Initial multi-agency setup guide |
| [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) | Multi-agency implementation details |
| [src/types/agency.ts](../src/types/agency.ts) | Agency TypeScript types and interfaces |
| [src/app/api/agencies/route.ts](../src/app/api/agencies/route.ts) | API endpoint implementation |
| [src/components/CreateAgencyModal.tsx](../src/components/CreateAgencyModal.tsx) | UI component code |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-01 | 1.0 | Initial documentation for agency creation workflow |

---

**Questions or Issues?**
Contact: System Administrator (Derrick)
GitHub Issues: https://github.com/adrianstier/shared-todo-list/issues
