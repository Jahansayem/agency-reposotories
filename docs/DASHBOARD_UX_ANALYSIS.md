# Bealer Agency Dashboard UX Analysis

**Prepared by:** Business Analyst
**Date:** January 2026
**Version:** 1.0

---

## Executive Summary

This document analyzes the manager (Derrick) and employee (Sefra, others) dashboards for the Bealer Agency task management application. The analysis covers user journeys, information needs by role, current state assessment, and prioritized recommendations for improvement.

**Key Findings:**
- The current dashboard architecture shows strong role differentiation but has gaps in insurance-specific workflow support
- Manager dashboard effectively surfaces team health metrics but lacks proactive delegation tools
- Employee dashboard provides good personal focus but underserves team context awareness
- Both dashboards would benefit from time-of-day contextual optimization

---

## 1. User Journey Mapping

### 1.1 Manager (Derrick) - User Journey

#### Morning Login (7:00 AM - 9:00 AM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **What happened overnight?** | Team Activity section in Daily Digest shows highlights | Missing: Specific overnight changes, new tasks assigned to team |
| **Who needs help today?** | "Needs Attention" section shows overdue/overloaded members | Good coverage |
| **What's urgent for ME?** | "Your Tasks" section with overdue alert | Good - personal overdue prominently displayed |
| **Team capacity check** | Team workload distribution bars | Missing: Available capacity indicator for delegation |

**Morning Priority Sequence (What Derrick Needs First):**
1. Team overdue count (RED ALERT) - Currently shown prominently
2. His personal overdue - Currently shown in "Your Tasks"
3. Team members who are struggling - "Needs Attention" section
4. Insurance-specific deadlines (policy renewals, claims) - Partially covered

**Current Flow:**
```
Header Stats (Overdue/Due Today/This Week)
    |
    v
Daily Digest Panel (AI Briefing)
    |
    v
Team Alert Banner (if team overdue > 0)
    |
    v
Two-Column Layout:
  - Left: Team Health + Insurance Tasks
  - Right: Your Tasks + Stalled Tasks + Bottlenecks
```

**Gap:** No "quick triage" action - Derrick sees problems but can't immediately reassign or escalate from dashboard.

---

#### Mid-Day Check-In (12:00 PM - 2:00 PM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **Progress check** | Weekly team completed count | Missing: Today's team progress vs. yesterday |
| **Blocking issues** | Bottlenecks section | Good - shows critical bottlenecks |
| **Quick status of delegated tasks** | Not explicitly tracked | **MISSING**: Delegation tracking view |
| **Client follow-up status** | Insurance Tasks section categorizes | Good - but lacks "next action" indicator |

**Mid-Day Behavior Pattern:**
- Quick glance: "Are we on track?"
- Spot-check: "Did [team member] finish [critical task]?"
- Decision: "Do I need to step in anywhere?"

**Current Support:** Partial - workload bars show status, but no "completed since morning" metric.

---

#### End-of-Day (5:00 PM - 7:00 PM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **Today's accomplishments** | Weekly completed count only | **MISSING**: Today-specific team wins |
| **Tomorrow's risks** | Due Today/This Week stats | Partial - no "tomorrow" specific view |
| **Who stayed late/extra effort?** | Not tracked | **MISSING**: Recognition signals |
| **What to escalate?** | Bottlenecks section | Good |

---

#### Ad-Hoc Access Triggers (Manager)

| Trigger | Current Response | Gap |
|---------|------------------|-----|
| "Is [task] done?" | Must navigate to task list | **MISSING**: Quick search from dashboard |
| "Who has bandwidth?" | Team workload bars (visual) | No numeric "available hours" |
| "Client called about [issue]" | Insurance Tasks categorization | No client-specific view |
| "Sefra seems overwhelmed" | Needs Attention section | Good - shows overloaded status |

---

### 1.2 Employee (Sefra/Others) - User Journey

#### Morning Login (8:00 AM - 9:00 AM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **What's my #1 priority today?** | AI "Today's Focus" suggestion | Excellent - prominent placement |
| **Am I behind on anything?** | Overdue alert banner | Good - red alert is clear |
| **What's due TODAY?** | "Due Today" task list | Good - shows up to 5 tasks |
| **Quick context on team** | None in DoerDashboard | **MISSING**: Team awareness snippet |

**Morning Priority Sequence (What Sefra Needs First):**
1. Overdue alert (if any) - Currently prominent
2. AI Focus suggestion - Currently shown
3. Today's task list - Currently shown
4. *(Missing)* Quick team context ("Derrick is out today" / "Heavy workload day")

**Current Flow:**
```
Header Stats (Overdue/Due Today/This Week)
    |
    v
Daily Digest Panel (AI Briefing)
    |
    v
Overdue Alert Banner (if overdue > 0)
    |
    v
Two-Column Layout:
  - Left: Your Day (Focus + Due Today + Upcoming)
  - Right: Progress + Quick Stats
```

**Strength:** Clean, personal focus. Employee isn't overwhelmed with team data.

---

#### Mid-Day Check-In (12:00 PM - 2:00 PM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **How am I doing?** | Weekly Progress bar + count | Good |
| **What's next after current task?** | "Coming Up" section | Good - shows next 4 tasks |
| **Quick win opportunity?** | AI insight suggests quick wins | Excellent |
| **Am I being asked about anything?** | None | **MISSING**: Notification/message indicator |

---

#### End-of-Day (4:00 PM - 6:00 PM)

| User Need | Current State | Gap Analysis |
|-----------|---------------|--------------|
| **Did I accomplish enough today?** | "X completed this week" | **MISSING**: Today-specific count |
| **What do I need to prep for tomorrow?** | "Coming Up" shows future tasks | Partial - no "tomorrow preview" |
| **Any recognition for good work?** | Milestone insights (if applicable) | Good when triggered |
| **Should I stay late?** | Overdue/Due Today counts | Implicit - no explicit guidance |

---

#### Ad-Hoc Access Triggers (Employee)

| Trigger | Current Response | Gap |
|---------|------------------|-----|
| "Did Derrick see my completed task?" | None | **MISSING**: Task visibility/acknowledgment |
| "Is this task still needed?" | Must check task details | No staleness indicator on dashboard |
| "Client called - quick look at their tasks" | Not supported | **MISSING**: Client context search |
| "Need to update Derrick on progress" | Navigate to chat | No quick status update from dashboard |

---

## 2. Information Needs by Role

### 2.1 Manager (Derrick) - Information Architecture

#### Primary Metrics (Must See Immediately)

| Metric | Current | Effectiveness | Action Available |
|--------|---------|---------------|------------------|
| **Team Overdue Count** | Yes - alert banner | HIGH | Click to filter |
| **Personal Overdue** | Yes - Your Tasks section | HIGH | Click to filter |
| **Team Members At Risk** | Yes - Needs Attention | MEDIUM | No direct action |
| **Team Completion Rate** | Yes - % in stats | LOW | Not actionable |

**Analysis:** Overdue metrics are well-surfaced. However, the metrics are "vanity" without immediate action paths. Derrick can SEE problems but must navigate away to FIX them.

#### Secondary Metrics (Important for Context)

| Metric | Current | Gap |
|--------|---------|-----|
| **Insurance Task Categories** | Yes - Claims, Follow-ups, etc. | Missing: Days until policy renewal deadlines |
| **Delegation Status** | Partial (modal only) | Missing: Quick delegation stats on main dashboard |
| **Team Velocity** | Weekly completed count | Missing: Trend indicator (up/down from last week) |
| **Capacity Planning** | Workload bars | Missing: "Hours available" vs "hours committed" |

#### Manager-Specific Actions Needed

| Action | Current State | Recommendation |
|--------|---------------|----------------|
| **Reassign Task** | Not available on dashboard | Add quick reassign dropdown |
| **Send Message to Team Member** | Navigate to chat | Add quick message button |
| **Escalate/Flag Task** | Not available | Add "escalate" quick action |
| **Set Team Priority** | Not available | Add "team focus" announcement |

---

### 2.2 Employee (Sefra) - Information Architecture

#### Primary Metrics

| Metric | Current | Effectiveness | Notes |
|--------|---------|---------------|-------|
| **Personal Overdue** | Yes - alert banner | HIGH | Clear red alert |
| **Due Today Count** | Yes - header + list | HIGH | Well-implemented |
| **Weekly Progress** | Yes - visual + count | MEDIUM | Motivating |
| **AI Focus Suggestion** | Yes - prominent | HIGH | Valuable guidance |

**Analysis:** Employee dashboard is focused and clean. The AI suggestions add genuine value.

#### Secondary Metrics

| Metric | Current | Gap |
|--------|---------|-----|
| **High Priority Count** | Yes - Quick Stats | Good |
| **Stalled Tasks** | Yes - "Needs Attention" | Good with AI suggestions |
| **Team Context** | None | **MISSING** - employee has no visibility into team workload |
| **Recognition/Streaks** | In modal only | Could be more prominent |

#### Motivational Elements Assessment

| Element | Current | Effectiveness |
|---------|---------|---------------|
| **Progress Bar (weekly)** | Visual + percentage | HIGH - tangible progress |
| **Milestone Achievements** | AI insights | MEDIUM - only triggers at milestones |
| **Streak Tracking** | In modal + AI insights | LOW - not prominent enough |
| **"No tasks due today" celebration** | Yes - green banner | HIGH - positive reinforcement |
| **Quick Win Suggestions** | AI insights | MEDIUM - buried in insights |

#### Employee Frustration Points (Predicted)

1. **"Did Derrick see my work?"** - No visibility into manager acknowledgment
2. **"Is this task still relevant?"** - Stalled tasks may be abandoned by requester
3. **"I don't know if team is struggling"** - Zero team context
4. **"Same motivational messages"** - Quotes rotate daily but insights may repeat

---

## 3. Current State Assessment

### 3.1 What's Working Well

#### Dashboard Page (Main Entry)

| Feature | Rating | Why It Works |
|---------|--------|--------------|
| **Role-based routing** (Manager vs Doer) | Excellent | Automatic, no user config needed |
| **Urgency hierarchy in header** | Excellent | Red/Amber/Neutral visual priority |
| **Daily Digest Panel** | Good | AI briefing is valuable, auto-loads |
| **Time-of-day greeting** | Good | Personal touch |

#### Manager Dashboard

| Feature | Rating | Why It Works |
|---------|--------|--------------|
| **Team Alert Banner** | Excellent | Immediate attention on team overdue |
| **Workload Distribution Bars** | Good | At-a-glance team capacity |
| **Insurance Task Categories** | Good | Industry-specific organization |
| **Bottlenecks Section** | Good | Proactive problem identification |

#### Employee Dashboard

| Feature | Rating | Why It Works |
|---------|--------|--------------|
| **AI Focus Suggestion** | Excellent | Reduces decision fatigue |
| **Overdue Alert** | Excellent | Can't miss it |
| **"Coming Up" Section** | Good | Forward-looking awareness |
| **Progress Bar with Animation** | Good | Satisfying visual feedback |

### 3.2 What's Missing (Critical Gaps)

#### Gap 1: No Quick Actions from Dashboard

**Impact:** HIGH
**Current:** Users must navigate away to perform any action
**Needed:** Inline task completion, quick reassign, quick message

**Example Scenario:**
Derrick sees Sefra is overloaded. Currently:
1. Note the problem
2. Navigate to tasks
3. Find a task to reassign
4. Reassign it
5. Navigate back to dashboard

**Should be:**
1. See Sefra overloaded
2. Click "Reassign" on a suggested task
3. Done

#### Gap 2: No "Today" Specific Metrics

**Impact:** MEDIUM
**Current:** Weekly aggregates only
**Needed:** "Today so far" progress

**Example:**
- Employee: "I completed 4 tasks today!" - No way to see this
- Manager: "Team completed 12 tasks today" - Not visible

#### Gap 3: No Team Context for Employees

**Impact:** MEDIUM
**Current:** Employee dashboard is entirely personal
**Needed:** Light team awareness

**Why It Matters:**
- "Is today a heavy day for everyone or just me?"
- "Is Derrick available if I need help?"
- "Did anyone else work on [related task]?"

**Recommendation:** Add optional "Team Pulse" widget - toggleable

#### Gap 4: No Client-Centric View

**Impact:** HIGH (Insurance Industry Specific)
**Current:** Tasks organized by category, not client
**Needed:** Quick client lookup

**Insurance Context:**
- Client calls: "What's the status of my policy?"
- Agent needs: Instant view of all tasks related to that client
- Current: Must search/filter task list

#### Gap 5: No Notification Integration

**Impact:** MEDIUM
**Current:** Dashboard is passive
**Needed:** Active notification indicators

**Missing:**
- Unread chat messages indicator
- New task assignments since last visit
- Completed tasks requiring review

### 3.3 Actionable vs Vanity Metrics

| Metric | Type | Actionability | Recommendation |
|--------|------|---------------|----------------|
| Team Overdue Count | Actionable | Click to filter | Keep + add quick reassign |
| Weekly Completion Rate % | Vanity | No action | Remove or make comparative |
| Team Size | Vanity | Static info | Remove from main view |
| Workload Bars | Semi-Actionable | Visual only | Add click to view member tasks |
| Insurance Category Counts | Actionable | Click to filter | Add - currently not clickable |
| Productivity Score | Vanity | Entertainment | Move to profile/settings |

---

## 4. Prioritized Recommendations

### Priority 1: Critical (Implement in Sprint 1)

#### R1.1: Add Quick Task Actions to Manager Dashboard

**User Story:**
> As Derrick (manager), I want to reassign a task directly from the dashboard bottleneck/needs attention sections, so I can resolve team workload issues without navigating away.

**Acceptance Criteria:**
- [ ] Each task in "Needs Attention" has a quick-reassign dropdown
- [ ] Reassignment updates in real-time
- [ ] Confirmation toast appears
- [ ] Activity logged automatically

**Implementation Notes:**
- Add `onReassignTask` prop already exists in DashboardModal
- Extend to ManagerDashboard component
- Use existing team member list for dropdown

---

#### R1.2: Add "Today's Progress" Counter

**User Story:**
> As any user, I want to see how many tasks I/my team completed TODAY, so I can gauge daily productivity and feel accomplished.

**Acceptance Criteria:**
- [ ] Manager sees: "Team: X tasks today"
- [ ] Employee sees: "You: X tasks today"
- [ ] Counter updates in real-time on completion
- [ ] Resets at midnight (user's timezone)

**Implementation Notes:**
- Filter `activity_log` for `task_completed` actions where `created_at` is today
- Add to header stats area

---

#### R1.3: Make Insurance Task Categories Clickable

**User Story:**
> As Derrick, I want to click on "Claims (3 overdue)" in the Insurance Tasks section and immediately see those specific tasks filtered.

**Acceptance Criteria:**
- [ ] Each category card is clickable
- [ ] Clicking navigates to task view with filter applied
- [ ] Filter shows: Category + Status (overdue/active)
- [ ] Clear "back to dashboard" navigation

---

### Priority 2: High (Implement in Sprint 2)

#### R2.1: Add Light Team Context for Employees

**User Story:**
> As Sefra (employee), I want to see a brief team status indicator, so I know if today is unusually busy for everyone.

**Acceptance Criteria:**
- [ ] Optional "Team Pulse" widget (collapsed by default)
- [ ] Shows: Team overdue count, Team active tasks count
- [ ] Visual indicator: "Normal day" / "Busy day" / "Heavy day"
- [ ] Does NOT show individual member details (privacy)

**Mockup:**
```
[Team Pulse]
Today: Normal day | 24 active team tasks | 2 overdue
```

---

#### R2.2: Add Notification Badges to Dashboard

**User Story:**
> As any user, I want to see if I have unread messages or new task assignments since my last visit.

**Acceptance Criteria:**
- [ ] Chat icon shows unread count badge
- [ ] "New tasks assigned" notification in Daily Digest
- [ ] Badge clears when viewed
- [ ] Persists across sessions (stored in DB)

---

#### R2.3: Add "Tomorrow Preview" Section

**User Story:**
> As any user, at end of day, I want to see what's due tomorrow so I can mentally prepare.

**Acceptance Criteria:**
- [ ] Appears after 4 PM user's timezone
- [ ] Shows: Tasks due tomorrow count + top 3 tasks
- [ ] Priority sorting (urgent first)
- [ ] "Plan tomorrow" action link

---

### Priority 3: Medium (Implement in Sprint 3)

#### R3.1: Add Client Quick-Search to Dashboard

**User Story:**
> As an insurance agent, when a client calls, I want to quickly search their name from the dashboard and see all related tasks.

**Acceptance Criteria:**
- [ ] Search bar in dashboard header
- [ ] Searches: Task text, notes, client names
- [ ] Results show task + status + assignee
- [ ] Click result to open task detail

---

#### R3.2: Add "Recognition" Feature for Managers

**User Story:**
> As Derrick, I want to quickly recognize a team member's good work from the dashboard, so they feel appreciated.

**Acceptance Criteria:**
- [ ] "Send kudos" button on Recent Team Wins section
- [ ] Creates a special chat message with emoji
- [ ] Recipient sees notification
- [ ] Optional: Track kudos in team stats

---

#### R3.3: Time-of-Day Dashboard Optimization

**User Story:**
> As any user, I want the dashboard to prioritize different information based on time of day.

**Acceptance Criteria:**

**Morning (before 10 AM):**
- Overdue tasks most prominent
- "Plan your day" AI focus
- Yesterday's carryover tasks

**Mid-day (10 AM - 4 PM):**
- Progress tracking prominent
- "Coming up" tasks
- Quick wins suggested

**End of day (after 4 PM):**
- Today's accomplishments summary
- Tomorrow preview
- Wrap-up checklist

---

### Priority 4: Nice-to-Have (Backlog)

| Feature | User Story | Notes |
|---------|------------|-------|
| **Delegation Tracking Widget** | Track tasks I delegated | Shows status of tasks Derrick assigned to others |
| **Weekly Email Digest Option** | Receive dashboard summary via email | For when users can't log in |
| **Goal Setting Integration** | Link daily tasks to strategic goals | Connect to StrategicDashboard |
| **Custom Dashboard Layout** | Rearrange widgets | Power user feature |
| **Policy Renewal Calendar** | Industry-specific calendar view | Major feature - separate epic |

---

## 5. User Stories Summary

### Epic: Dashboard Quick Actions

| ID | Story | Points | Priority |
|----|-------|--------|----------|
| US-001 | Quick reassign from manager dashboard | 5 | P1 |
| US-002 | Quick complete task from dashboard | 3 | P2 |
| US-003 | Quick message team member | 3 | P2 |
| US-004 | Escalate/flag task action | 3 | P3 |

### Epic: Enhanced Metrics

| ID | Story | Points | Priority |
|----|-------|--------|----------|
| US-010 | Today's completion counter | 2 | P1 |
| US-011 | Trend indicators (up/down) | 3 | P3 |
| US-012 | Team velocity comparison | 5 | P3 |
| US-013 | Remove vanity metrics | 1 | P2 |

### Epic: Time-Aware Dashboard

| ID | Story | Points | Priority |
|----|-------|--------|----------|
| US-020 | Morning optimization | 3 | P3 |
| US-021 | Mid-day optimization | 3 | P3 |
| US-022 | End-of-day optimization | 3 | P3 |
| US-023 | Tomorrow preview section | 3 | P2 |

### Epic: Team Awareness (Employee)

| ID | Story | Points | Priority |
|----|-------|--------|----------|
| US-030 | Team pulse widget | 3 | P2 |
| US-031 | Notification badges | 5 | P2 |
| US-032 | Manager availability indicator | 2 | P3 |

### Epic: Insurance Industry Features

| ID | Story | Points | Priority |
|----|-------|--------|----------|
| US-040 | Clickable insurance categories | 2 | P1 |
| US-041 | Client quick-search | 5 | P3 |
| US-042 | Policy renewal alerts | 8 | Backlog |

---

## 6. Success Metrics

### Dashboard Effectiveness KPIs

| Metric | Current Baseline | Target | Measurement |
|--------|------------------|--------|-------------|
| **Time to first action** | Unknown | < 5 seconds | Track click time from load |
| **Dashboard bounce rate** | Unknown | < 20% | Users who leave without action |
| **Overdue resolution time** | Unknown | -25% | Time from overdue to completed |
| **Daily active dashboard users** | Unknown | 80%+ | % of users who view dashboard daily |

### Qualitative Success Indicators

- [ ] Manager reports faster triage of team issues
- [ ] Employees report clearer daily priorities
- [ ] Reduced "where do I find X?" support questions
- [ ] Positive feedback on AI suggestions

---

## 7. Technical Considerations

### Component Refactoring Needed

| Component | Current Lines | Recommendation |
|-----------|---------------|----------------|
| ManagerDashboard.tsx | 704 | Split: TeamHealth, InsuranceTasks, PersonalTasks |
| DoerDashboard.tsx | 555 | Split: DayView, ProgressPanel, StalledTasks |
| DashboardModal.tsx | 1285 | Consider deprecating in favor of full-page dashboard |

### State Management

**Current:** Props drilling from DashboardPage
**Recommendation:** Consider Zustand store for dashboard state to enable:
- Quick actions without full re-render
- Real-time updates without subscription juggling
- Persistent user preferences (collapsed sections, etc.)

### Performance Considerations

- Insurance workload calculation runs on every render - consider memoization
- AI insights generation should be debounced
- Consider skeleton loading states for slow-loading sections

---

## 8. Appendices

### A. Component File Reference

| File | Purpose | Lines |
|------|---------|-------|
| `/src/components/views/DashboardPage.tsx` | Main routing/layout | 213 |
| `/src/components/DashboardModal.tsx` | Legacy modal dashboard | 1285 |
| `/src/components/dashboard/DailyDigestPanel.tsx` | AI briefing panel | 399 |
| `/src/components/dashboard/ManagerDashboard.tsx` | Manager-specific view | 704 |
| `/src/components/dashboard/DoerDashboard.tsx` | Employee-specific view | 555 |
| `/src/components/dashboard/QuickActions.tsx` | Action buttons | 130 |
| `/src/components/ProgressSummary.tsx` | Progress modal | 346 |
| `/src/lib/aiDashboardInsights.ts` | AI insight generation | 691 |

### B. User Personas

**Derrick (Owner/Manager)**
- Age: 45-55
- Tech comfort: Medium
- Primary concerns: Team productivity, client satisfaction, compliance
- Dashboard frequency: 5-10x per day
- Key question: "Is my team on track?"

**Sefra (Employee)**
- Age: 25-35
- Tech comfort: High
- Primary concerns: Personal productivity, clear priorities, recognition
- Dashboard frequency: 3-5x per day
- Key question: "What should I do next?"

### C. Competitive Analysis Notes

| Competitor | Strength We Should Adopt |
|------------|--------------------------|
| Monday.com | Quick inline editing |
| Asana | "My Tasks" vs "Team Tasks" toggle |
| ClickUp | Time-in-status tracking |
| Notion | Clean, uncluttered design |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Business Analyst | Initial analysis |

---

*This document should be reviewed with stakeholders (Derrick, Sefra) for validation before implementation begins.*
