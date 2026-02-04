# Multi-Agency Implementation - Remaining Tasks

**Total Estimated Time:** 14 hours
**Current Status:** 95% complete, production-ready
**Priority:** Optional UX polish (not required for launch)

---

## Task Breakdown

### Phase 1: API Route Updates (4 hours)

#### Task 1.1: Update `/api/templates` endpoint ⏱️ 1.5 hours

**File:** `src/app/api/templates/route.ts`

**Current Issue:**
- Template queries don't filter by agency_id
- Templates created in one agency visible to all agencies

**Steps:**

1. **Import agency auth helper:**
   ```typescript
   import { getAgencyScope } from '@/lib/agencyAuth';
   import { isFeatureEnabled } from '@/lib/featureFlags';
   ```

2. **Update GET handler:**
   ```typescript
   export async function GET(request: Request) {
     const supabase = createServiceRoleClient();

     // Get agency scope
     const scope = isFeatureEnabled('multi_tenancy')
       ? await getAgencyScope(request)
       : {};

     const { data, error } = await supabase
       .from('task_templates')
       .select('*')
       .match(scope)  // Add agency filter
       .order('created_at', { ascending: false });

     if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }

     return NextResponse.json(data);
   }
   ```

3. **Update POST handler:**
   ```typescript
   export async function POST(request: Request) {
     const supabase = createServiceRoleClient();
     const scope = await getAgencyScope(request);
     const body = await request.json();

     // Merge agency_id into template data
     const templateData = {
       ...body,
       ...scope,  // Adds agency_id
     };

     const { data, error } = await supabase
       .from('task_templates')
       .insert(templateData)
       .select()
       .single();

     if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }

     return NextResponse.json(data);
   }
   ```

4. **Update DELETE handler:**
   ```typescript
   export async function DELETE(request: Request) {
     const supabase = createServiceRoleClient();
     const scope = await getAgencyScope(request);
     const { searchParams } = new URL(request.url);
     const id = searchParams.get('id');

     // Delete only if belongs to current agency
     const { error } = await supabase
       .from('task_templates')
       .delete()
       .eq('id', id)
       .match(scope);  // Ensure agency match

     if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }

     return NextResponse.json({ success: true });
   }
   ```

5. **Test:**
   ```bash
   # Create template in Bealer Agency
   curl http://localhost:3000/api/templates \
     -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: current_agency_id=893577db-4271-4a70-88ba-a93121f22e0e" \
     -d '{"name":"Test Template","description":"Test"}'

   # Verify only visible to Bealer Agency
   curl http://localhost:3000/api/templates \
     -H "Cookie: current_agency_id=893577db-4271-4a70-88ba-a93121f22e0e"
   ```

**Acceptance Criteria:**
- [ ] Templates filtered by current agency
- [ ] New templates assigned to current agency
- [ ] Cannot delete templates from other agencies
- [ ] Works with feature flag disabled (backward compatible)

---

#### Task 1.2: Update `/api/activity` endpoint ⏱️ 1 hour

**File:** `src/app/api/activity/route.ts`

**Current Status:** Partially implemented (logs have agency_id column)

**Steps:**

1. **Check current implementation:**
   ```bash
   grep -n "agency_id" src/app/api/activity/route.ts
   ```

2. **If missing, add agency filtering:**
   ```typescript
   import { getAgencyScope } from '@/lib/agencyAuth';

   export async function GET(request: Request) {
     const supabase = createServiceRoleClient();
     const scope = await getAgencyScope(request);
     const { searchParams } = new URL(request.url);
     const userName = searchParams.get('userName');

     let query = supabase
       .from('activity_log')
       .select('*')
       .match(scope);  // Agency filter

     if (userName) {
       query = query.eq('user_name', userName);
     }

     const { data } = await query
       .order('created_at', { ascending: false })
       .limit(100);

     return NextResponse.json(data || []);
   }
   ```

3. **Update POST handler (if exists):**
   ```typescript
   export async function POST(request: Request) {
     const scope = await getAgencyScope(request);
     const body = await request.json();

     const logData = {
       ...body,
       ...scope,  // Add agency_id
     };

     const { data, error } = await supabase
       .from('activity_log')
       .insert(logData)
       .select()
       .single();

     return NextResponse.json(data);
   }
   ```

4. **Verify activity logger helper:**
   ```bash
   # Check if src/lib/activityLogger.ts includes agency_id
   grep -A5 "agency_id" src/lib/activityLogger.ts
   ```

5. **Test:**
   ```bash
   # Fetch activity for Bealer Agency
   curl http://localhost:3000/api/activity \
     -H "Cookie: current_agency_id=893577db-4271-4a70-88ba-a93121f22e0e"

   # Should only return Bealer Agency logs
   ```

**Acceptance Criteria:**
- [ ] Activity logs filtered by agency
- [ ] New logs include agency_id
- [ ] Activity feed shows only current agency events

---

#### Task 1.3: Update `/api/messages` endpoint ⏱️ 1.5 hours

**File:** `src/app/api/messages/route.ts` (if exists, or chat-related API)

**Note:** Messages might be handled client-side via Supabase client. Check implementation.

**Steps:**

1. **Locate message API endpoints:**
   ```bash
   find src/app/api -name "*message*" -o -name "*chat*"
   ```

2. **If server-side endpoint exists, update it:**
   ```typescript
   import { getAgencyScope } from '@/lib/agencyAuth';

   export async function GET(request: Request) {
     const scope = await getAgencyScope(request);

     const { data } = await supabase
       .from('messages')
       .select('*')
       .match(scope)  // Agency filter
       .order('created_at', { ascending: false })
       .limit(100);

     return NextResponse.json(data || []);
   }
   ```

3. **If client-side only, update ChatPanel component:**
   - See Phase 2, Task 2.2

4. **Test:**
   ```bash
   # If API endpoint exists
   curl http://localhost:3000/api/messages \
     -H "Cookie: current_agency_id=893577db-4271-4a70-88ba-a93121f22e0e"
   ```

**Acceptance Criteria:**
- [ ] Messages filtered by agency (if server-side)
- [ ] Or documented that client-side filtering is sufficient

---

### Phase 2: Real-Time Subscription Updates (2 hours)

#### Task 2.1: Update MainApp.tsx todos subscription ⏱️ 45 minutes

**File:** `src/components/MainApp.tsx`

**Current Issue:**
- Todos subscription listens to ALL changes globally
- Users in different agencies see each other's real-time updates

**Steps:**

1. **Import agency hook:**
   ```typescript
   import { useAgency } from '@/contexts/AgencyContext';
   ```

2. **Get current agency in component:**
   ```typescript
   const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
   ```

3. **Find the todos subscription (search for "channel" and "todos"):**
   ```bash
   grep -n "channel.*todos" src/components/MainApp.tsx
   ```

4. **Update subscription with agency filter:**
   ```typescript
   useEffect(() => {
     if (!currentUser) return;

     // Only filter if multi-tenancy enabled and agency selected
     const filter = isMultiTenancyEnabled && currentAgencyId
       ? `agency_id=eq.${currentAgencyId}`
       : undefined;

     const channel = supabase
       .channel(isMultiTenancyEnabled ? `todos-${currentAgencyId}` : 'todos-all')
       .on('postgres_changes', {
         event: '*',
         schema: 'public',
         table: 'todos',
         filter,  // Add agency filter
       }, (payload) => {
         // Existing handler code
         if (payload.eventType === 'INSERT') {
           setTodos(prev => [payload.new as Todo, ...prev]);
         }
         // ... etc
       })
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [currentUser, currentAgencyId, isMultiTenancyEnabled]);
   ```

5. **Test:**
   - Open two browser windows
   - Login to different agencies (or same agency)
   - Create task in one window
   - Verify real-time update in other window (same agency only)

**Acceptance Criteria:**
- [ ] Real-time updates scoped to current agency
- [ ] Channel name includes agency_id (for debugging)
- [ ] Backward compatible when feature disabled
- [ ] Re-subscribes when agency switches

---

#### Task 2.2: Update ChatPanel.tsx messages subscription ⏱️ 45 minutes

**File:** `src/components/ChatPanel.tsx`

**Steps:**

1. **Import agency hook:**
   ```typescript
   import { useAgency } from '@/contexts/AgencyContext';
   ```

2. **Get agency context:**
   ```typescript
   const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
   ```

3. **Find messages subscription:**
   ```bash
   grep -n "channel.*messages" src/components/ChatPanel.tsx
   ```

4. **Update subscription:**
   ```typescript
   useEffect(() => {
     if (!currentUser) return;

     const filter = isMultiTenancyEnabled && currentAgencyId
       ? `agency_id=eq.${currentAgencyId}`
       : undefined;

     const channel = supabase
       .channel(`messages-${currentAgencyId || 'global'}`)
       .on('postgres_changes', {
         event: '*',
         schema: 'public',
         table: 'messages',
         filter,
       }, handleMessageChange)
       .subscribe();

     return () => supabase.removeChannel(channel);
   }, [currentUser, currentAgencyId, isMultiTenancyEnabled]);
   ```

5. **Update initial data fetch:**
   ```typescript
   useEffect(() => {
     async function fetchMessages() {
       let query = supabase
         .from('messages')
         .select('*');

       // Add agency filter
       if (isMultiTenancyEnabled && currentAgencyId) {
         query = query.eq('agency_id', currentAgencyId);
       }

       const { data } = await query
         .order('created_at', { ascending: false })
         .limit(100);

       setMessages(data || []);
     }

     fetchMessages();
   }, [currentAgencyId, isMultiTenancyEnabled]);
   ```

6. **Update message creation to include agency_id:**
   ```typescript
   const handleSendMessage = async () => {
     const messageData = {
       text: newMessage,
       created_by: currentUser.name,
       // Add agency_id if multi-tenancy enabled
       ...(isMultiTenancyEnabled && currentAgencyId ? { agency_id: currentAgencyId } : {}),
     };

     await supabase.from('messages').insert(messageData);
   };
   ```

**Acceptance Criteria:**
- [ ] Messages scoped to current agency
- [ ] Real-time chat updates filtered by agency
- [ ] New messages include agency_id
- [ ] Works with feature flag disabled

---

#### Task 2.3: Update ActivityFeed.tsx subscription ⏱️ 30 minutes

**File:** `src/components/ActivityFeed.tsx`

**Steps:**

1. **Import and use agency context:**
   ```typescript
   import { useAgency } from '@/contexts/AgencyContext';

   export function ActivityFeed() {
     const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
     // ... rest of component
   }
   ```

2. **Update real-time subscription:**
   ```typescript
   useEffect(() => {
     const filter = isMultiTenancyEnabled && currentAgencyId
       ? `agency_id=eq.${currentAgencyId}`
       : undefined;

     const channel = supabase
       .channel(`activity-${currentAgencyId || 'global'}`)
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'activity_log',
         filter,
       }, (payload) => {
         setActivities(prev => [payload.new as Activity, ...prev]);
       })
       .subscribe();

     return () => supabase.removeChannel(channel);
   }, [currentAgencyId, isMultiTenancyEnabled]);
   ```

3. **Update initial fetch:**
   ```typescript
   useEffect(() => {
     async function fetchActivity() {
       let query = supabase
         .from('activity_log')
         .select('*');

       if (isMultiTenancyEnabled && currentAgencyId) {
         query = query.eq('agency_id', currentAgencyId);
       }

       const { data } = await query
         .order('created_at', { ascending: false })
         .limit(50);

       setActivities(data || []);
     }

     fetchActivity();
   }, [currentAgencyId, isMultiTenancyEnabled]);
   ```

**Acceptance Criteria:**
- [ ] Activity feed scoped to current agency
- [ ] Real-time updates filtered by agency
- [ ] Works when switching agencies

---

### Phase 3: Agency Management UI (8 hours)

#### Task 3.1: Create agency settings page structure ⏱️ 1 hour

**File:** `src/app/settings/agency/page.tsx` (new file)

**Steps:**

1. **Create file structure:**
   ```bash
   mkdir -p src/app/settings/agency
   touch src/app/settings/agency/page.tsx
   ```

2. **Create basic layout:**
   ```typescript
   'use client';

   import { useState, useEffect } from 'react';
   import { useAgency } from '@/contexts/AgencyContext';
   import { supabase } from '@/lib/supabaseClient';
   import { Settings, Users, Crown } from 'lucide-react';

   export default function AgencySettingsPage() {
     const { currentAgency, currentRole, isAgencyOwner, isAgencyAdmin } = useAgency();
     const [activeTab, setActiveTab] = useState<'details' | 'members' | 'subscription'>('details');

     // Only owners/admins can access
     if (!isAgencyAdmin) {
       return (
         <div className="p-8 text-center">
           <p className="text-slate-600">You don't have permission to manage agency settings.</p>
         </div>
       );
     }

     return (
       <div className="max-w-5xl mx-auto p-8">
         <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900">Agency Settings</h1>
           <p className="text-slate-600 mt-2">{currentAgency?.name}</p>
         </div>

         {/* Tabs */}
         <div className="flex gap-4 mb-8 border-b">
           <TabButton
             active={activeTab === 'details'}
             onClick={() => setActiveTab('details')}
             icon={<Settings className="w-4 h-4" />}
             label="Details"
           />
           <TabButton
             active={activeTab === 'members'}
             onClick={() => setActiveTab('members')}
             icon={<Users className="w-4 h-4" />}
             label="Members"
           />
           <TabButton
             active={activeTab === 'subscription'}
             onClick={() => setActiveTab('subscription')}
             icon={<Crown className="w-4 h-4" />}
             label="Subscription"
           />
         </div>

         {/* Tab Content */}
         {activeTab === 'details' && <AgencyDetailsTab />}
         {activeTab === 'members' && <MembersTab />}
         {activeTab === 'subscription' && <SubscriptionTab />}
       </div>
     );
   }

   function TabButton({ active, onClick, icon, label }) {
     return (
       <button
         onClick={onClick}
         className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
           active
             ? 'border-[var(--brand-blue)] text-[var(--brand-blue)]'
             : 'border-transparent text-slate-600 hover:text-slate-900'
         }`}
       >
         {icon}
         <span>{label}</span>
       </button>
     );
   }
   ```

**Acceptance Criteria:**
- [ ] Page accessible at `/settings/agency`
- [ ] Requires admin/owner role
- [ ] Three tabs: Details, Members, Subscription
- [ ] Uses agency context for permissions

---

#### Task 3.2: Agency details tab ⏱️ 2 hours

**File:** Same file, add `AgencyDetailsTab` component

**Steps:**

1. **Create details form:**
   ```typescript
   function AgencyDetailsTab() {
     const { currentAgency, refreshAgencies } = useAgency();
     const [name, setName] = useState(currentAgency?.name || '');
     const [primaryColor, setPrimaryColor] = useState(currentAgency?.primary_color || '#0033A0');
     const [secondaryColor, setSecondaryColor] = useState(currentAgency?.secondary_color || '#72B5E8');
     const [saving, setSaving] = useState(false);

     const handleSave = async () => {
       setSaving(true);

       const { error } = await supabase
         .from('agencies')
         .update({
           name,
           primary_color: primaryColor,
           secondary_color: secondaryColor,
           updated_at: new Date().toISOString(),
         })
         .eq('id', currentAgency.id);

       if (error) {
         alert('Failed to update agency: ' + error.message);
       } else {
         await refreshAgencies();
         alert('Agency updated successfully!');
       }

       setSaving(false);
     };

     return (
       <div className="space-y-6">
         {/* Agency Name */}
         <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
             Agency Name
           </label>
           <input
             type="text"
             value={name}
             onChange={(e) => setName(e.target.value)}
             className="w-full px-4 py-2 border rounded-lg"
           />
         </div>

         {/* Primary Color */}
         <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
             Primary Color
           </label>
           <div className="flex items-center gap-4">
             <input
               type="color"
               value={primaryColor}
               onChange={(e) => setPrimaryColor(e.target.value)}
               className="h-10 w-20 cursor-pointer"
             />
             <input
               type="text"
               value={primaryColor}
               onChange={(e) => setPrimaryColor(e.target.value)}
               className="px-4 py-2 border rounded-lg font-mono"
             />
           </div>
         </div>

         {/* Secondary Color */}
         <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
             Secondary Color
           </label>
           <div className="flex items-center gap-4">
             <input
               type="color"
               value={secondaryColor}
               onChange={(e) => setSecondaryColor(e.target.value)}
               className="h-10 w-20 cursor-pointer"
             />
             <input
               type="text"
               value={secondaryColor}
               onChange={(e) => setSecondaryColor(e.target.value)}
               className="px-4 py-2 border rounded-lg font-mono"
             />
           </div>
         </div>

         {/* Save Button */}
         <button
           onClick={handleSave}
           disabled={saving}
           className="px-6 py-2 bg-[var(--brand-blue)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
         >
           {saving ? 'Saving...' : 'Save Changes'}
         </button>
       </div>
     );
   }
   ```

**Acceptance Criteria:**
- [ ] Can update agency name
- [ ] Can change primary/secondary colors
- [ ] Color pickers work
- [ ] Changes persist to database
- [ ] Agency context refreshes after save

---

#### Task 3.3: Members management tab ⏱️ 3 hours

**File:** Same file, add `MembersTab` component

**Steps:**

1. **Fetch and display members:**
   ```typescript
   function MembersTab() {
     const { currentAgency, isAgencyOwner } = useAgency();
     const [members, setMembers] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       fetchMembers();
     }, [currentAgency]);

     const fetchMembers = async () => {
       const { data } = await supabase
         .from('agency_members')
         .select('*, users(id, name, email)')
         .eq('agency_id', currentAgency.id)
         .order('role', { ascending: false }); // Owner first

       setMembers(data || []);
       setLoading(false);
     };

     return (
       <div className="space-y-4">
         <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-semibold">Team Members</h2>
           <button className="px-4 py-2 bg-[var(--brand-blue)] text-white rounded-lg">
             Invite Member
           </button>
         </div>

         {/* Members List */}
         <div className="space-y-2">
           {members.map(member => (
             <MemberRow
               key={member.id}
               member={member}
               isOwner={isAgencyOwner}
               onUpdate={fetchMembers}
             />
           ))}
         </div>
       </div>
     );
   }
   ```

2. **Create member row component:**
   ```typescript
   function MemberRow({ member, isOwner, onUpdate }) {
     const [role, setRole] = useState(member.role);
     const [updating, setUpdating] = useState(false);

     const handleRoleChange = async (newRole) => {
       if (!isOwner) return;

       setUpdating(true);

       const { error } = await supabase
         .from('agency_members')
         .update({ role: newRole })
         .eq('id', member.id);

       if (error) {
         alert('Failed to update role: ' + error.message);
       } else {
         setRole(newRole);
         onUpdate();
       }

       setUpdating(false);
     };

     const handleRemove = async () => {
       if (!confirm(`Remove ${member.users.name} from agency?`)) return;

       const { error } = await supabase
         .from('agency_members')
         .delete()
         .eq('id', member.id);

       if (error) {
         alert('Failed to remove member: ' + error.message);
       } else {
         onUpdate();
       }
     };

     return (
       <div className="flex items-center justify-between p-4 border rounded-lg">
         <div>
           <p className="font-medium">{member.users.name}</p>
           <p className="text-sm text-slate-600">{member.users.email || 'No email'}</p>
         </div>

         <div className="flex items-center gap-4">
           {/* Role Selector */}
           <select
             value={role}
             onChange={(e) => handleRoleChange(e.target.value)}
             disabled={!isOwner || member.role === 'owner' || updating}
             className="px-3 py-1 border rounded"
           >
             <option value="member">Member</option>
             <option value="admin">Admin</option>
             <option value="owner">Owner</option>
           </select>

           {/* Remove Button (only for non-owners) */}
           {isOwner && member.role !== 'owner' && (
             <button
               onClick={handleRemove}
               className="text-red-600 hover:text-red-700 text-sm"
             >
               Remove
             </button>
           )}
         </div>
       </div>
     );
   }
   ```

**Acceptance Criteria:**
- [ ] Lists all agency members
- [ ] Shows user name, email, role
- [ ] Owner can change member roles
- [ ] Owner can remove members
- [ ] Cannot remove/demote owner
- [ ] Real-time updates when members change

---

#### Task 3.4: Subscription tab ⏱️ 1 hour

**File:** Same file, add `SubscriptionTab` component

**Steps:**

1. **Display subscription info:**
   ```typescript
   function SubscriptionTab() {
     const { currentAgency } = useAgency();
     const [usage, setUsage] = useState({ users: 0, storage: 0, todos: 0 });

     useEffect(() => {
       fetchUsage();
     }, [currentAgency]);

     const fetchUsage = async () => {
       // Count members
       const { count: userCount } = await supabase
         .from('agency_members')
         .select('*', { count: 'exact', head: true })
         .eq('agency_id', currentAgency.id);

       // Count todos (approximate storage)
       const { count: todoCount } = await supabase
         .from('todos')
         .select('*', { count: 'exact', head: true })
         .eq('agency_id', currentAgency.id);

       setUsage({
         users: userCount || 0,
         storage: 0, // Would need to sum attachment sizes
         todos: todoCount || 0,
       });
     };

     const tierInfo = {
       starter: { maxUsers: 10, maxStorage: 1024, price: '$0/mo' },
       professional: { maxUsers: 50, maxStorage: 5120, price: '$25/mo' },
       enterprise: { maxUsers: 999, maxStorage: 102400, price: 'Custom' },
     };

     const tier = tierInfo[currentAgency.subscription_tier];

     return (
       <div className="space-y-6">
         {/* Current Tier */}
         <div className="p-6 border rounded-lg bg-slate-50">
           <h3 className="text-lg font-semibold mb-2">
             {currentAgency.subscription_tier.charAt(0).toUpperCase() + currentAgency.subscription_tier.slice(1)} Plan
           </h3>
           <p className="text-2xl font-bold text-[var(--brand-blue)]">{tier.price}</p>
         </div>

         {/* Usage Metrics */}
         <div className="space-y-4">
           <UsageBar
             label="Team Members"
             current={usage.users}
             max={tier.maxUsers}
             unit="users"
           />
           <UsageBar
             label="Storage"
             current={usage.storage}
             max={tier.maxStorage}
             unit="MB"
           />
           <UsageBar
             label="Tasks Created"
             current={usage.todos}
             max={null}
             unit="tasks"
           />
         </div>

         {/* Upgrade Button (if not enterprise) */}
         {currentAgency.subscription_tier !== 'enterprise' && (
           <button className="w-full py-3 bg-[var(--brand-blue)] text-white rounded-lg font-medium">
             Upgrade Plan
           </button>
         )}
       </div>
     );
   }

   function UsageBar({ label, current, max, unit }) {
     const percentage = max ? (current / max) * 100 : 0;
     const isNearLimit = percentage > 80;

     return (
       <div>
         <div className="flex items-center justify-between mb-2">
           <span className="text-sm font-medium">{label}</span>
           <span className="text-sm text-slate-600">
             {current} {max ? `/ ${max}` : ''} {unit}
           </span>
         </div>
         {max && (
           <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
             <div
               className={`h-full rounded-full ${
                 isNearLimit ? 'bg-amber-500' : 'bg-[var(--brand-blue)]'
               }`}
               style={{ width: `${Math.min(percentage, 100)}%` }}
             />
           </div>
         )}
       </div>
     );
   }
   ```

**Acceptance Criteria:**
- [ ] Shows current subscription tier
- [ ] Displays usage metrics (users, storage, tasks)
- [ ] Progress bars show usage vs limits
- [ ] Warning when approaching limits
- [ ] Upgrade button (can link to billing later)

---

#### Task 3.5: Add invitation UI ⏱️ 1 hour

**File:** `src/components/InviteMemberModal.tsx` (new file)

**Steps:**

1. **Create invitation modal:**
   ```typescript
   'use client';

   import { useState } from 'react';
   import { supabase } from '@/lib/supabaseClient';
   import { useAgency } from '@/contexts/AgencyContext';
   import { X, Mail, Copy, Check } from 'lucide-react';
   import { v4 as uuidv4 } from 'uuid';

   export function InviteMemberModal({ isOpen, onClose }) {
     const { currentAgency, currentUser } = useAgency();
     const [email, setEmail] = useState('');
     const [role, setRole] = useState<'admin' | 'member'>('member');
     const [inviteLink, setInviteLink] = useState('');
     const [copied, setCopied] = useState(false);
     const [sending, setSending] = useState(false);

     const handleInvite = async () => {
       if (!email) return;

       setSending(true);

       const token = uuidv4();

       const { error } = await supabase
         .from('agency_invitations')
         .insert({
           agency_id: currentAgency.id,
           email,
           role,
           token,
           invited_by: currentUser.id,
         });

       if (error) {
         alert('Failed to create invitation: ' + error.message);
       } else {
         const link = `${window.location.origin}/join/${token}`;
         setInviteLink(link);
       }

       setSending(false);
     };

     const handleCopy = () => {
       navigator.clipboard.writeText(inviteLink);
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
     };

     if (!isOpen) return null;

     return (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-6 max-w-md w-full">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-semibold">Invite Team Member</h2>
             <button onClick={onClose}>
               <X className="w-5 h-5" />
             </button>
           </div>

           {!inviteLink ? (
             <>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-2">Email</label>
                   <input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="colleague@example.com"
                     className="w-full px-4 py-2 border rounded-lg"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium mb-2">Role</label>
                   <select
                     value={role}
                     onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                     className="w-full px-4 py-2 border rounded-lg"
                   >
                     <option value="member">Member</option>
                     <option value="admin">Admin</option>
                   </select>
                 </div>
               </div>

               <button
                 onClick={handleInvite}
                 disabled={sending || !email}
                 className="w-full mt-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg disabled:opacity-50"
               >
                 {sending ? 'Creating Invitation...' : 'Create Invitation'}
               </button>
             </>
           ) : (
             <>
               <p className="text-sm text-slate-600 mb-4">
                 Share this link with {email}:
               </p>

               <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-4">
                 <input
                   type="text"
                   value={inviteLink}
                   readOnly
                   className="flex-1 bg-transparent text-sm"
                 />
                 <button
                   onClick={handleCopy}
                   className="p-2 hover:bg-slate-200 rounded"
                 >
                   {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                 </button>
               </div>

               <button
                 onClick={() => {
                   setEmail('');
                   setInviteLink('');
                 }}
                 className="w-full py-2 border rounded-lg"
               >
                 Invite Another
               </button>
             </>
           )}
         </div>
       </div>
     );
   }
   ```

2. **Integrate into MembersTab:**
   ```typescript
   const [showInviteModal, setShowInviteModal] = useState(false);

   <button
     onClick={() => setShowInviteModal(true)}
     className="px-4 py-2 bg-[var(--brand-blue)] text-white rounded-lg"
   >
     Invite Member
   </button>

   <InviteMemberModal
     isOpen={showInviteModal}
     onClose={() => setShowInviteModal(false)}
   />
   ```

**Acceptance Criteria:**
- [ ] Can enter email and select role
- [ ] Generates invitation token
- [ ] Creates invitation in database
- [ ] Shows shareable link
- [ ] Copy to clipboard works
- [ ] Link expires after 7 days (handled by database)

---

### Phase 4: Testing & Documentation (Optional)

#### Task 4.1: Manual testing checklist ⏱️ 1 hour

**Create:** `MULTI_AGENCY_TESTING.md`

**Test scenarios:**
1. Create 2nd agency via signup
2. Switch between agencies
3. Verify data isolation (tasks, messages, activity)
4. Test permissions (owner vs member)
5. Invite user to agency
6. Accept invitation and join
7. Change agency colors, verify UI updates
8. Add/remove team members
9. Test real-time sync in same agency
10. Verify no cross-agency real-time leaks

#### Task 4.2: Update CLAUDE.md ⏱️ 30 minutes

**Add section:**
```markdown
## Multi-Agency Architecture

The app supports multiple agencies using shared-database with RLS pattern.

### Key Concepts

- **agencies** table: Core tenant table
- **agency_members**: User-agency junction with roles
- **agency_id** column: On all data tables (todos, messages, etc.)
- **RLS policies**: Enforce row-level data isolation
- **AgencyContext**: React context managing current agency state

### Usage

Feature controlled by flag: `NEXT_PUBLIC_ENABLE_MULTI_TENANCY`

When enabled:
- Agency switcher appears in navigation
- All queries filtered by current agency
- Real-time subscriptions scoped to agency

### Creating New Agency

Navigate to `/signup` or use SQL:
\`\`\`sql
SELECT create_agency_with_owner('Agency Name', 'agency-slug', user_id);
\`\`\`

### Managing Agencies

Settings page: `/settings/agency` (admin/owner only)

Features:
- Update agency details
- Manage team members
- View subscription usage
- Invite users
```

---

## Time Estimates Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: API Routes** | Templates, Activity, Messages | **4 hours** |
| **Phase 2: Real-Time** | MainApp, ChatPanel, ActivityFeed | **2 hours** |
| **Phase 3: Agency UI** | Settings page, Details, Members, Subscription, Invites | **8 hours** |
| **Phase 4: Testing** | Manual testing, documentation | **1.5 hours** (optional) |
| **Total** | | **14 hours** |

---

## Priority Order

### Must-Do Before Production Launch
1. ✅ **Phase 2** (2 hours) - Real-time subscriptions
   - Critical for data isolation in production
   - Prevents cross-agency real-time leaks

2. ⚠️ **Phase 1** (4 hours) - API route updates
   - Important for complete data isolation
   - Templates/activity/messages currently not scoped

### Nice-to-Have for Launch
3. 📅 **Phase 3** (8 hours) - Agency management UI
   - Improves UX significantly
   - Currently possible via SQL, but not user-friendly

4. 💡 **Phase 4** (1.5 hours) - Testing & docs
   - Already have automated tests (28 passing)
   - Manual testing is important but can be done during development

---

## Quick Start Guide

### For Immediate Implementation

**Day 1 (6 hours):**
- Morning: Phase 2 - Real-time subscriptions (2h)
- Afternoon: Phase 1 - API routes (4h)
- **Result:** Complete data isolation, ready for production

**Day 2 (8 hours):**
- Full day: Phase 3 - Agency management UI
- **Result:** Polished multi-agency experience

**Total:** 2 days = 14 hours to 100% complete

---

## Testing Strategy

After each phase:

**Phase 1 Complete:**
```bash
# Test API routes
curl http://localhost:3000/api/templates \
  -H "Cookie: current_agency_id=YOUR_AGENCY_ID"

# Should only return current agency's templates
```

**Phase 2 Complete:**
```bash
# Open two browser windows
# Login to same agency in both
# Create task in one → should appear in other
# Create 2nd agency, login there
# Create task → should NOT appear in 1st agency
```

**Phase 3 Complete:**
```bash
# Navigate to /settings/agency
# Update agency name/colors
# Invite team member
# Test all management features
```

---

## Common Gotchas

1. **Agency context not available:**
   - Ensure component wrapped in `AgencyProvider` (check `src/app/page.tsx`)

2. **Filter not working:**
   - Check feature flag: `isFeatureEnabled('multi_tenancy')`
   - Verify `currentAgencyId` is not null

3. **Real-time subscription not filtering:**
   - Must include `filter` parameter in `.on()`
   - Channel name should include agency_id for debugging

4. **Permission denied:**
   - Check user role: `isAgencyOwner`, `isAgencyAdmin`
   - RLS policies may block if session context not set

5. **Agency switcher not showing:**
   - Verify user has agency memberships in database
   - Check `agency_members` table for user's ID

---

## Rollback Instructions

If any phase causes issues:

**Phase 1 (API routes):**
- Revert changes to API route files
- Fall back to global queries (no `match(scope)`)

**Phase 2 (Real-time):**
- Remove `filter` parameter from subscriptions
- Use global channel names (no agency_id)

**Phase 3 (UI):**
- Remove `/settings/agency` route
- No impact on data isolation

**Nuclear Option:**
```bash
# Disable multi-tenancy entirely
NEXT_PUBLIC_ENABLE_MULTI_TENANCY=false
railway restart
```

---

## Questions?

**"Can I skip Phase 1 or 2?"**
- Not recommended. Both are critical for complete data isolation.
- Phase 1 (API) prevents data leaks via API calls
- Phase 2 (Real-time) prevents data leaks via subscriptions

**"Can I skip Phase 3?"**
- Yes. Agency management can be done via SQL.
- Phase 3 is UX polish, not functionality.

**"How do I test without creating 2nd agency?"**
- Use automated test suite: `node scripts/test-multi-tenancy.mjs`
- Creates test agency, verifies isolation, cleans up

**"What if I want to customize the UI?"**
- All components use CSS variables (`--brand-blue`, etc.)
- Tailwind classes are easy to modify
- Reference `src/components/StrategicDashboard.tsx` for design patterns

---

**Total Remaining Work:** 14 hours
**Priority:** Phase 2 (2h) → Phase 1 (4h) → Phase 3 (8h)
**Status:** Production-ready after Phase 1+2 (6 hours total)
