# Analytics Integration User Guide

**Last Updated**: 2026-02-07
**Audience**: End Users, Agency Staff, Managers
**Purpose**: User-friendly guide to new analytics integration features

---

## What's New?

Your analytics experience just got a major upgrade! We've made it **10x easier** to go from high-level insights to individual customer actions with just one click. No more hunting through multiple pages to find what you need.

### Quick Summary: 5 New Features

1. **Click Segment Cards** → Instantly see all customers in that tier
2. **Click Customer Names** → See full profile without leaving the page
3. **"View All Opportunities"** → Jump from today's urgent list to complete browse
4. **"Due Today" Filter** → Quickly see only customers with renewals today
5. **Data Pipeline Visibility** → Know exactly where your data is and when it was updated

---

## Feature 1: Clickable Segment Cards

**What It Does**: Turn segment statistics into actionable customer lists with one click.

### Where to Find It

1. Navigate to **Analytics** (from side menu or bottom nav on mobile)
2. Click the **Customer Insights** tab (third tab)
3. You'll see 4 colorful cards: Elite, Premium, Standard, Entry

### How to Use It

**Before** (the old way):
```
See "142 Elite customers" → Think "where are they?" → Navigate to Customer Lookup
→ Click Elite filter → FINALLY see the list

Total: 5+ clicks, ~30 seconds
```

**Now** (the new way):
```
See "142 Elite customers [View Customers →]" → Click the card → Done!

Total: 1 click, ~3 seconds
```

### Visual Walkthrough

1. **Hover over a segment card** (e.g., Elite)
   - The card scales up slightly and gets a shadow
   - You'll see "Click to view customers →" hint text at the bottom
   - Cursor changes to a pointer (hand icon)

2. **Click anywhere on the card**
   - Instantly navigates to Customer Lookup view
   - Elite filter is already applied
   - You see all 142 Elite customers immediately

3. **Browse the customer list**
   - Sorted by priority (hottest opportunities first)
   - Each customer shows: Name, premium, products, cross-sell opportunity
   - Click any customer card for full details

### Tips & Tricks

- **Keyboard shortcut** (coming soon): Press `1` for Elite, `2` for Premium, `3` for Standard, `4` for Entry
- **Go back**: Use your browser's back button to return to Analytics
- **Clear filter**: Click the "✕" on the Elite chip to see all customers again
- **Works on mobile**: Tap the card — same experience, optimized for small screens

---

## Feature 2: Customer Detail Drill-Down

**What It Does**: Click any customer name to see their full profile in a sliding panel — no page navigation needed.

### Where to Find It

**Primary Location**: Analytics → Today's Opportunities tab

You'll see a list of customers with urgent cross-sell opportunities. Each customer's name is now **clickable** (blue underline on hover).

### How to Use It

**Scenario**: You see "John Smith - Add Life Insurance" in Today's Opportunities.

1. **Click "John Smith"** (the customer name)
   - A panel slides in from the right side of the screen
   - Shows John's complete profile while keeping the opportunities list visible

2. **What You'll See in the Panel**:
   - **Profile Section**:
     - Name: John Smith
     - Segment: Elite (with colored badge)
     - Phone: 555-123-4567 (clickable!)
     - Email: john.smith@example.com
     - Address: 123 Main St, Anytown, USA

   - **Quick Stats**:
     - Total Premium: $25,000/year
     - Policies: 5 (Auto, Home, Life, Umbrella, Business)
     - Customer Since: 2018 (6 years)
     - Lifetime Value: $150,000

   - **Opportunities** (expandable):
     - Add Motorcycle Insurance ($3,000 value)
     - Increase Umbrella Coverage ($1,500 value)
     - Each opportunity has "Create Task" and "Dismiss" buttons

   - **Linked Tasks** (expandable):
     - Shows any existing tasks for this customer
     - Click a task to open full task detail

3. **Take Action**:
   - **On Desktop**: Click phone number → Automatically copies to clipboard (checkmark appears for 2 seconds)
   - **On Mobile**: Click phone number → Opens your phone's dialer to call John
   - **Click email** → Opens your email app with John's address pre-filled
   - **Create Task** → Quick task creation from an opportunity
   - **Dismiss Opportunity** → Remove from list if not relevant

4. **Close the Panel**:
   - Click the "✕" button in top-right
   - OR click anywhere outside the panel (on the grayed-out background)
   - OR press `Escape` key on keyboard

### Why This is Useful

**Old Way**:
```
See John in opportunities → Need his phone number → Copy "John Smith"
→ Navigate to Customer Lookup → Search for "John Smith" → Click into card
→ Scroll to find phone → FINALLY copy the number

Total: ~45 seconds, 6+ clicks
```

**New Way**:
```
See John in opportunities → Click his name → Panel opens → Click phone
→ Number copied/dialed

Total: ~5 seconds, 2 clicks
```

### Tips & Tricks

- **Keep panel open**: You can interact with the opportunities list while the panel is open — great for comparing multiple customers
- **Desktop phone copying**: Instead of clicking to dial (which doesn't work on desktop), we auto-copy the number so you can paste it into your phone system
- **Mobile full-screen**: On small screens (<768px), the panel becomes a full-screen modal for better readability
- **Keyboard navigation**: Press `Escape` to close the panel quickly

---

## Feature 3: "View All Opportunities" Button

**What It Does**: Seamlessly switch from "Today's Urgent Opportunities" to "All Opportunities" with one click.

### Where to Find It

Navigate to **Analytics → Today's Opportunities** tab.

Scroll to the bottom of the opportunities list — you'll see a blue button:
```
[View All Opportunities →]
```

### How to Use It

**Scenario**: You've contacted all 10 of today's urgent opportunities. Now you want to see what's coming up later this week.

1. **Click "View All Opportunities"**
   - Instantly navigates to Customer Lookup view
   - Automatically sorted by **Renewal Date (Soonest)**
   - Shows ALL customers with cross-sell opportunities (not just today)

2. **Browse the Full List**:
   - See opportunities expiring tomorrow, next week, next month
   - Use filters to narrow down:
     - Segment filter (Elite, Premium, etc.)
     - Opportunity type (Add Life, Bundle Auto+Home, etc.)
   - Sort by opportunity value, premium, customer name, etc.

3. **Go Back to Today**:
   - Click the **🔥 Due Today** filter chip (see Feature 4 below)
   - OR use browser back button to return to Analytics

### Why This is Useful

You're working in **two modes**:

1. **Daily Focus Mode** (Today's Opportunities)
   - "What do I NEED to do today?"
   - Shows only renewals expiring TODAY
   - Urgent action items

2. **Planning Mode** (All Opportunities)
   - "What's on the horizon?"
   - Shows all upcoming renewals
   - Strategic planning

The "View All" button lets you **switch modes instantly** without losing context.

### Tips & Tricks

- The sort defaults to "Renewal Date" when you click "View All" — this is intentional so you see the timeline of opportunities
- You can change the sort to "Opportunity Value" to see the biggest potential wins first
- Use this at the end of each day to plan tomorrow's calls

---

## Feature 4: "Due Today" Quick Filter

**What It Does**: Show only customers with renewals happening TODAY — the opposite of "View All."

### Where to Find It

Navigate to **Customer Lookup** (from main navigation).

At the top of the page, you'll see filter chips. One of them is:
```
[🔥 Due Today]
```

### How to Use It

**Scenario**: You're browsing all customers. Suddenly you remember "I need to focus on today's urgent renewals only."

1. **Click the "🔥 Due Today" filter chip**
   - The chip turns orange (active state)
   - Customer list instantly filters to show only TODAY's renewals
   - Sort automatically changes to "Renewal Date" for convenience

2. **What Changes**:
   - **Before**: Showing 1,247 customers (all)
   - **After**: Showing 10 customers (only renewals expiring today)
   - Other filters still work (you can combine Due Today + Elite segment)

3. **Turn It Off**:
   - Click the "🔥 Due Today" chip again
   - Chip returns to normal color
   - All customers reappear

### Why This is Useful

**Reverse Flow** from Feature 3:

- Feature 3: Today's Opportunities → "View All" → Customer Lookup (all)
- Feature 4: Customer Lookup (all) → "Due Today" → Today's focus

You can **toggle between modes** without navigating between pages.

### Tips & Tricks

- **Combine filters**: "Due Today" + "Elite" = Only elite customers with renewals today (ultra-targeted)
- **Auto-sort**: When you enable "Due Today," the sort changes to "Renewal Date" automatically — this ensures the most urgent are at the top
- **Count indicator**: The chip shows how many customers match (e.g., "🔥 Due Today (10)")
- **Works with search**: You can search for a specific name AND enable "Due Today" to see if that customer has a renewal today

---

## Feature 5: Data Flow Visualization

**What It Does**: Shows exactly where your customer data lives and when it was last updated.

### Where to Find It

**Analytics page** (any of the 3 tabs: Portfolio Overview, Today's Opportunities, Customer Insights).

At the very top, you'll see a blue banner:

```
┌─────────────────────────────────────────────────────┐
│ 📊 Data Pipeline                                     │
│ Last import: 3 minutes ago                          │
│                                                      │
│ CSV Import → 1,247 Customers → 3 Dashboards        │
│                                                      │
│ [View Customers →] [View Segments →]                │
└─────────────────────────────────────────────────────┘
```

### What It Shows

1. **Import Status**:
   - "Last import: 3 minutes ago" — How fresh is the data?
   - Updates in real-time as you import new CSVs

2. **Data Flow**:
   - **CSV Import** → Where the data comes from (your Allstate Book of Business export)
   - **1,247 Customers** → How many customers are in the system right now
   - **3 Dashboards** → Where the data is being used (Portfolio, Opportunities, Insights)

3. **Quick Actions**:
   - **View Customers →** Click to jump to Customer Lookup
   - **View Segments →** Click to jump to Customer Insights tab

### How to Use It

**Scenario 1**: You just uploaded a new CSV file.

1. Wait a few seconds for processing
2. Check the Data Flow banner
3. Confirm: "Last import: Just now" and customer count increased
4. You know your data is fresh!

**Scenario 2**: You're showing analytics to your manager.

1. Manager asks: "How old is this data?"
2. Point to the banner: "Last import: 3 minutes ago"
3. Manager is confident the insights are current

**Scenario 3**: You're confused where your imported data went.

1. Look at the Data Flow banner
2. See: "CSV Import → 1,247 Customers → 3 Dashboards"
3. Understand: My CSV is now split across 3 dashboards
4. Click "View Customers" to see the raw customer list

### Why This is Useful

**Before**: "Where did my imported data go? Is it in Analytics? Customer Lookup? Both?"

**Now**: Clear visual flow shows exactly where data lives and when it was refreshed.

### Tips & Tricks

- If the "Last import" timestamp is old (e.g., "2 weeks ago"), it's time to upload a fresh CSV
- The customer count updates in real-time — if you see it increase, your import just finished
- The banner is **always visible** on the Analytics page — no scrolling required

---

## Common Workflows

### Workflow 1: Daily Morning Routine

**Goal**: Identify and contact today's high-priority customers.

1. **Open app → Navigate to Analytics**
2. **Click "Today's Opportunities" tab**
   - See 10 customers with renewals expiring today

3. **For each customer**:
   - Click customer name → Detail panel opens
   - Click phone number to call (mobile) or copy (desktop)
   - Have conversation
   - Log outcome using contact buttons

4. **If you finish early**:
   - Scroll to bottom → Click "View All Opportunities"
   - See what's coming tomorrow/next week
   - Plan ahead

**Time**: 5-10 minutes to review + call time

---

### Workflow 2: Elite Customer Outreach Campaign

**Goal**: Call all Elite customers with cross-sell opportunities.

1. **Navigate to Analytics → Customer Insights tab**
2. **Click the "Elite" segment card**
   - Customer Lookup opens with 142 Elite customers

3. **Scan the list**:
   - Look for customers with cross-sell opportunities (highlighted)
   - Use sort: "Opportunity Value" to prioritize biggest wins

4. **Click a customer → Detail panel opens**
   - See all their policies
   - See recommended cross-sell (e.g., Add Life)
   - Click phone to call

5. **Create task if needed**:
   - Click "Create Task" button in the opportunity section
   - Task pre-filled with customer details

**Time**: 15-20 minutes to review list, then outreach calls

---

### Workflow 3: Weekly Planning Session

**Goal**: Understand the distribution of your book and plan next week's focus.

1. **Navigate to Analytics → Customer Insights tab**
2. **Review the 4 segment cards**:
   - Elite: 142 customers (12.8% of book) — High value
   - Premium: 89 customers (8.0%) — Bundling opportunities
   - Standard: 210 customers (18.9%) — Mid-tier, growth potential
   - Entry: 764 customers (68.8%) — Volume, conversion targets

3. **Drill into a segment** (e.g., click Premium card):
   - See all 89 Premium customers
   - Sort by "Opportunity Value"
   - Identify top 10 for bundling campaigns

4. **Check data freshness**:
   - Look at Data Flow banner: "Last import: 3 hours ago"
   - Decide if you need to upload a fresh CSV

5. **Plan tasks for the week**:
   - Create bulk tasks from high-value opportunities
   - Assign to team members

**Time**: 30-45 minutes for full planning session

---

## Frequently Asked Questions

### Q1: Why are segment cards clickable now?

**A**: We heard from users that seeing "142 Elite customers" was frustrating without being able to see WHO they were. Now you can click the card to instantly see the full list. It's the #1 most requested feature!

---

### Q2: Does the CustomerDetailPanel work everywhere?

**A**: Currently, customer names are clickable in **Today's Opportunities panel** only. We're working on making them clickable everywhere (Customer Lookup browse mode, segment tooltips, etc.). Coming soon!

---

### Q3: What's the difference between "Due Today" and "Today's Opportunities"?

**A**:
- **Today's Opportunities** (Analytics tab): Dedicated view, shows only TODAY's renewals, focused for morning workflow
- **Due Today** (Customer Lookup filter): Quick filter you can toggle ON/OFF while browsing all customers

They show the same data, just in different contexts. Use whichever fits your current workflow.

---

### Q4: Why does clicking "View All Opportunities" sort by renewal date?

**A**: When you're viewing ALL opportunities (not just today), seeing them in chronological order makes the most sense. You can see "tomorrow's opportunities at the top, next week further down, next month at the bottom." Of course, you can change the sort to anything you want.

---

### Q5: Can I share a link to a specific segment?

**A**: Not yet, but it's coming! We're adding URL persistence so you can share links like `yourapp.com/customers?segment=elite` with your team. Stay tuned.

---

### Q6: The Data Flow banner says "Last import: 2 weeks ago." Is that bad?

**A**: It means your customer data is 2 weeks old. If you're running cross-sell campaigns, it's a good idea to upload a fresh CSV from Allstate Gateway weekly. The banner is there to remind you!

---

### Q7: Does this work on mobile?

**A**: Yes! All 5 features are fully optimized for mobile:
- Segment cards: Tap to navigate (same as desktop click)
- CustomerDetailPanel: Full-screen modal on small screens
- "View All" button: Touch-friendly, same functionality
- "Due Today" filter: Tap to toggle
- Data Flow banner: Responsive, no horizontal scroll

---

### Q8: What happens if I click a customer and their data isn't found?

**A**: You'll see an error message: "Customer not found. They may have been removed from the system." with a retry button. This is rare but can happen if a customer was deleted from the database.

---

### Q9: Can I keyboard navigate?

**A**: Yes! Press `Tab` to focus on segment cards, then `Enter` to activate. Press `Escape` to close the CustomerDetailPanel. More keyboard shortcuts coming soon (Ctrl+1/2/3/4 for segments, Ctrl+T for Due Today filter).

---

## Tips for Power Users

### 1. Combine Filters for Laser Focus

Example: "Elite customers with renewals due today who need Life insurance"

1. Navigate to Customer Lookup
2. Click "Elite" chip
3. Click "🔥 Due Today" chip
4. Click "Add Life" opportunity filter
5. Result: Ultra-targeted list (might be 0-2 customers, but they're VERY high priority)

---

### 2. Use Browser Back Button Liberally

All navigation is browser-history-aware. If you drill down into a segment, view a customer, then realize you want to go back to Analytics, just press the back button. Your state is preserved.

---

### 3. Keep CustomerDetailPanel Open While Browsing

When you click a customer name in Today's Opportunities, the panel opens but the opportunities list stays visible in the background. You can click a different customer name without closing the panel — it'll update to show the new customer. Great for comparing multiple customers side-by-side.

---

### 4. Desktop vs Mobile Phone Behavior

- **Mobile**: Clicking a phone number opens your phone's dialer (tel: link)
- **Desktop**: Clicking copies the number to clipboard (you can paste into your phone system)

The app auto-detects your device type and does the right thing.

---

### 5. Morning Routine Checklist

- [ ] Open app → Analytics → Today's Opportunities
- [ ] Review the count (e.g., "10 opportunities expiring today")
- [ ] For each: Click name → Click phone → Call customer
- [ ] Log outcome using contact buttons
- [ ] If you finish early: Click "View All Opportunities" → Plan tomorrow
- [ ] End of day: Check Data Flow banner → Upload fresh CSV if needed

---

## Troubleshooting

### Issue: Segment card doesn't navigate when I click it

**Solution**:
- Make sure you're clicking the CARD itself, not the background around it
- Try refreshing the page (Ctrl+R or Cmd+R)
- If it still doesn't work, check your browser (Chrome, Safari, Firefox, Edge all supported)

---

### Issue: CustomerDetailPanel shows "Customer not found"

**Solution**:
- The customer may have been deleted from the database
- Try searching for the customer in Customer Lookup manually
- If they don't exist there either, they were removed (possibly duplicate cleanup)

---

### Issue: "Due Today" filter shows 0 customers, but I know there are renewals today

**Solution**:
- Check the date on your computer — is it correct?
- The filter compares renewal dates to TODAY's date at midnight
- If you uploaded a CSV with dates in the future/past, they won't match
- Verify in Today's Opportunities panel — if that's also empty, there genuinely are no renewals today

---

### Issue: Data Flow banner says "Last import: unknown"

**Solution**:
- This happens if you've never uploaded a CSV yet
- Go to Analytics → Click "Import Book of Business" button
- Upload your Allstate CSV export
- After processing, the banner will update with a timestamp

---

### Issue: Feature X doesn't work on Safari

**Solution**:
- We recently fixed a major Safari bug (ThemeProvider issue)
- Make sure you're using Safari 16+ (check: Safari → About Safari)
- Try clearing your cache (Safari → Clear History)
- If still broken, report to your admin with browser version

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check the main documentation**: [ANALYTICS_INTEGRATION_COMPLETE.md](./ANALYTICS_INTEGRATION_COMPLETE.md) (technical details)
2. **Report a bug**: Email your admin or use the in-app feedback form
3. **Request a feature**: We're always improving — let us know what you need!

---

## What's Coming Next?

**Short-term** (next 2-4 weeks):
- Keyboard shortcuts (Ctrl+1/2/3/4 for segments)
- URL sharing (share links to specific segments with teammates)
- Breadcrumb navigation ("← Back to Analytics")
- Customer names clickable everywhere (not just Today's Opportunities)

**Medium-term** (1-2 months):
- Multi-select filters (Elite + Premium at the same time)
- Saved filter presets ("My daily focus" = Due Today + Elite + Add Life)
- Bulk actions from segments (Create tasks for all Elite customers)

**Long-term** (3+ months):
- AI-powered recommendations ("Suggested next action for each customer")
- Real-time collaboration (see who else is viewing the same customer)
- Native mobile apps (iOS + Android)

---

## Summary

**5 New Features = 10x Faster Workflows**

1. ✅ Click segment cards → See customers instantly
2. ✅ Click customer names → Full profile without page navigation
3. ✅ "View All Opportunities" → Switch from daily focus to planning mode
4. ✅ "🔥 Due Today" filter → Quick return to urgent items
5. ✅ Data Flow banner → Always know how fresh your data is

**Before**: 30 seconds and 5+ clicks to get from "142 Elite customers" to seeing the list
**Now**: 3 seconds and 1 click

**Questions?** Refer to the FAQ section or contact your admin.

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
**For Technical Documentation**: See [ANALYTICS_INTEGRATION_COMPLETE.md](./ANALYTICS_INTEGRATION_COMPLETE.md)
