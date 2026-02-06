# User Guide: Sprint 3 New Features

**Last Updated:** February 2026
**For:** Bealer Agency Team Members

Welcome to the Sprint 3 update! This guide will walk you through all the new features we've added to make your workflow even better.

---

## What's New in Sprint 3

Sprint 3 brings powerful collaboration and productivity features:

1. **Real-time Editing Indicators** - See who's editing tasks
2. **Version History** - View and restore previous versions of tasks
3. **Chat Image Attachments** - Share screenshots and files in chat
4. **Push Notifications** - Get notified about important updates
5. **Enhanced Animations** - Smoother, more responsive interface
6. **Performance Dashboard** - Monitor app performance

---

## 👥 Real-Time Editing Indicators

### What It Does
When you and a teammate are both editing the same task, you'll see who's editing it to avoid conflicts.

### How to Use It
1. Open a task to edit it
2. If someone else is also editing, you'll see their avatar and name
3. The indicator shows while they're actively editing
4. When they're done, the indicator disappears

### Visual Example
```
┌──────────────────────────────────────┐
│ 📝 Task: Call John about renewal    │
│                                       │
│ 👤 Sefra is editing...               │
│ ↑ Editing indicator                  │
└──────────────────────────────────────┘
```

### Tips
- Wait for your teammate to finish if you see their indicator
- The indicator updates in real-time
- It automatically disappears when they navigate away

---

## 🔄 Version History

### What It Does
Every task automatically saves its history. You can view all past changes and restore previous versions if needed.

### How to Use It
1. Open any task
2. Click the **"History"** button (clock icon)
3. View the timeline of all changes
4. Click on a version to see what changed
5. Click **"Restore"** to revert to that version

### What's Tracked
- Task description changes
- Priority changes
- Status changes
- Assignee changes
- Due date changes
- Notes updates
- Subtask changes
- Attachment changes

### Visual Example
```
Version History Timeline
────────────────────────────
2026-02-01 2:30 PM  [Restored]  Derrick
  Restored to version 3

2026-02-01 2:00 PM  [Updated]   Sefra
  Changed: Priority (medium → high)
           Due date (Feb 5 → Feb 3)

2026-02-01 10:00 AM [Updated]   Derrick
  Changed: Added 2 subtasks
           Updated notes

2026-02-01 9:00 AM  [Created]   Derrick
  Initial version
```

### When to Use It
- **Accidentally changed something:** Restore the previous version
- **Review changes:** See what was modified and by whom
- **Audit trail:** Track task evolution over time
- **Learn from history:** See patterns in how tasks are completed

### Tips
- Versions are created automatically - you don't need to do anything
- You can restore as many times as needed
- Restoring creates a new version (doesn't delete newer versions)
- Each version shows field-by-field what changed

---

## 📷 Chat Image Attachments

### What It Does
Attach images directly to chat messages. Perfect for sharing screenshots, photos, or documents.

### How to Use It

#### Sending an Image
1. In the chat input, click the **📎 paperclip** icon
2. Select an image from your computer (or take a photo on mobile)
3. Preview appears above the input
4. Optionally add text to your message
5. Click **Send** (or press Enter)

#### Viewing Images
- Images appear in the message as thumbnails
- Click any image to view full-screen
- Use arrow keys or swipe to view next/previous
- Click **Download** to save to your device

### Supported Formats
- JPEG/JPG
- PNG
- GIF (including animated)
- WebP
- SVG

### File Size Limit
- Maximum: 10 MB per image
- Most phone photos are 2-5 MB (well within limit)

### Visual Example
```
Chat Message
────────────────────────────────
Sefra  2:30 PM
Here's the quote I mentioned:

[Image Thumbnail]  [Image Thumbnail]
  quote_page1.png    quote_page2.png

Click any image to view full-screen
────────────────────────────────
```

### Tips
- You can send multiple images in one message
- Images are automatically compressed for faster loading
- Full-size image is always available for download
- Works great for sharing:
  - Policy documents (screenshot)
  - Customer emails
  - Handwritten notes (photo)
  - Error messages (screenshot)

### Troubleshooting
- **Upload failed:** Check file size (must be under 10MB)
- **Wrong file type:** Only images are supported (no PDFs or Word docs in chat)
- **Slow upload:** Large images take longer - consider reducing size first

---

## 🔔 Push Notifications

### What It Does
Get browser notifications for important updates even when the app isn't open.

### Enabling Notifications

1. Go to your **Settings** or **Profile**
2. Find the **"Push Notifications"** section
3. Click the toggle switch to **Enable**
4. Your browser will ask for permission - click **Allow**
5. You're all set!

### What You'll Be Notified About
- **Task Reminders:** Tasks due soon or overdue
- **Mentions:** Someone mentions you with @yourname
- **Task Assignments:** New tasks assigned to you
- **Daily Briefing:** Morning summary of your day (optional)

### Visual Example
```
Browser Notification
────────────────────────────────
🔔 Bealer Agency Todo List

Task Reminder
Your task "Call John about renewal"
is due in 1 hour

[View Task]  [Dismiss]
────────────────────────────────
```

### Notification Actions
- **View:** Opens the app to the relevant task/chat
- **Dismiss:** Closes the notification

### Managing Notifications

#### Turn Off Notifications
1. Go to Settings
2. Toggle **Push Notifications** to **Off**
3. Your subscription is removed

#### Turn Off Specific Types (Future Feature)
- Currently all notification types are enabled
- Granular controls coming soon

#### Browser Settings
You can also manage notifications in your browser:
- **Chrome:** Settings → Privacy → Notifications
- **Firefox:** Settings → Privacy → Permissions → Notifications
- **Safari:** Safari → Settings → Websites → Notifications

### Troubleshooting

**"Push notifications not supported"**
- Update your browser to the latest version
- Use Chrome, Firefox, or Safari 16+
- Ensure you're on HTTPS (not HTTP)

**"Notifications blocked"**
- You previously denied permission
- Fix: Go to browser settings → Site permissions → Allow notifications for this site

**Not receiving notifications**
- Check browser notification settings (not blocked)
- Verify notifications are enabled in app settings
- Test with a task due soon
- Check notification permission in browser

---

## ✨ Enhanced Animations

### What's New
We've added smooth micro-interactions and optimized performance for a more polished experience.

### New Animation Features

#### Success Feedback
- **Confetti effect** when completing important tasks
- **Pulse animation** when saving changes
- **Haptic feedback** on mobile devices (subtle vibration)
- **Sound effects** for success/error (optional)

#### Error Feedback
- **Shake animation** for invalid inputs
- **Warning glow** for attention-needed items
- **Error sounds** to alert you (optional)

#### Performance Optimizations
- **Reduced motion mode:** Respects your system preference
- **Battery saver mode:** Reduces animations on low battery
- **GPU acceleration:** Smoother animations on all devices
- **Adaptive duration:** Adjusts speed for device performance

### Visual Examples

**Success Animation:**
```
[✓ Task Completed]
   ↓ (pulse + confetti)
[✓ Task Completed ✨]
```

**Error Shake:**
```
[Save]  →  [wobble]  ← Invalid input
```

### Accessibility

**Reduced Motion**
If you have motion sensitivity, the app automatically respects your system preference:
- **Windows:** Settings → Ease of Access → Display → Show animations
- **macOS:** System Preferences → Accessibility → Display → Reduce motion
- **iOS/Android:** Accessibility settings → Reduce motion

When reduced motion is on:
- Animations are instant (no transitions)
- Confetti/effects are disabled
- Haptics are reduced

### Tips
- Most animations are subtle - you'll notice smoother interactions
- If animations feel slow, check your device's battery saver mode
- Reduced motion mode doesn't remove functionality, just effects

---

## 📊 Performance Dashboard (Admin Only)

### What It Does
Real-time monitoring of app performance metrics. Helps identify slowdowns and optimize experience.

**Note:** Currently only available to Derrick (owner). Team view coming soon.

### Metrics Tracked
- **FPS (Frames Per Second):** Animation smoothness (target: 60fps)
- **Memory Usage:** JavaScript memory consumption
- **API Latency:** Server response times
- **Render Performance:** Component load times
- **Connection Status:** Real-time sync health

### How to Use It
1. Go to **Admin Dashboard**
2. Find **Performance Monitor** section
3. Click **Start Monitoring** (auto-starts by default)
4. View live metrics and charts

### Understanding Metrics

#### FPS (Frames Per Second)
- **Good:** 55-60 fps (smooth animations)
- **Fair:** 30-55 fps (some jank)
- **Poor:** <30 fps (noticeable lag)

**What affects FPS:**
- Too many browser tabs open
- Other apps running
- Old computer/phone
- Heavy animations

#### API Latency
- **Good:** <100ms (instant)
- **Fair:** 100-300ms (acceptable)
- **Poor:** >300ms (slow)

**What affects latency:**
- Internet connection speed
- Server load
- Distance to server

#### Memory Usage
- **Good:** <50% (plenty of headroom)
- **Fair:** 50-80% (monitor closely)
- **Critical:** >80% (may cause crashes)

**What affects memory:**
- Long browser session (refresh helps)
- Many tasks/messages loaded
- Browser extensions

### When to Check Performance
- App feels slow or laggy
- Animations are stuttering
- Investigating user reports
- After deploying new features
- Regular health checks (weekly)

### Actions to Take

**If FPS is low:**
- Close other browser tabs
- Refresh the app
- Update browser to latest version
- Check for background apps

**If latency is high:**
- Check internet connection
- Try different time of day
- Contact support if persistent

**If memory is high:**
- Refresh the app (clears memory)
- Close unused tabs
- Update browser

---

## Tips for Getting the Most Out of Sprint 3

### Best Practices

1. **Enable Push Notifications**
   - Stay on top of tasks without constantly checking the app
   - Never miss important mentions

2. **Use Version History**
   - Don't be afraid to make changes - you can always revert
   - Review task evolution to improve future tasks

3. **Leverage Chat Images**
   - Share screenshots instead of describing problems
   - Photo of handwritten notes > typing them out

4. **Watch for Editing Indicators**
   - Prevents duplicate work and conflicts
   - Better coordination with teammates

5. **Check Performance Metrics (Owners)**
   - Monitor app health weekly
   - Act on warnings before they become problems

### Keyboard Shortcuts (Existing)
- **Ctrl/Cmd + K:** Quick task search
- **Ctrl/Cmd + /:** Keyboard shortcuts list
- **Esc:** Close modals/dialogs
- **Arrow keys:** Navigate lists

### Mobile Experience
All Sprint 3 features work great on mobile:
- ✅ Editing indicators
- ✅ Version history
- ✅ Chat image attachments
- ✅ Push notifications
- ✅ Enhanced animations

---

## FAQ (Frequently Asked Questions)

### General

**Q: Do I need to do anything to get Sprint 3 features?**
A: No! Sprint 3 features are automatically available. Just enable push notifications if you want them.

**Q: Are my old tasks and messages affected?**
A: No. All existing data remains unchanged. New features are additive.

**Q: Can I turn off features I don't want?**
A: Yes. Push notifications can be disabled in Settings. Other features are always-on but unobtrusive.

### Version History

**Q: How far back does version history go?**
A: Forever! All versions are kept indefinitely (unless manually deleted by admin).

**Q: Does restoring a version delete newer versions?**
A: No. Restoring creates a new version marked as "restored". All history is preserved.

**Q: Can I see who made each change?**
A: Yes. Every version shows who made the change and when.

### Chat Attachments

**Q: Can I attach files other than images?**
A: Not yet. Currently only images (JPEG, PNG, GIF, WebP, SVG). Document support coming soon.

**Q: What happens to images in old messages?**
A: They remain accessible forever (unless manually deleted).

**Q: Can I download images?**
A: Yes! Click image → View full-screen → Download button.

### Push Notifications

**Q: Will I get spammed with notifications?**
A: No. Notifications are only for:
  - Tasks due soon/overdue
  - Direct mentions (@yourname)
  - Tasks assigned to you
  - Daily briefing (once per day, optional)

**Q: Can I disable notifications temporarily?**
A: Yes. Either:
  - Turn off in app Settings
  - Use browser's "Do Not Disturb" mode
  - Disable for specific time in browser settings

**Q: Do notifications work on mobile?**
A: Yes! On both iOS (Safari 16+) and Android (Chrome).

**Q: Will notifications drain my battery?**
A: No. Push notifications use minimal battery. Modern browsers are very efficient.

### Performance

**Q: Why does the app sometimes feel slow?**
A: Many factors:
  - Internet connection
  - Device performance
  - Browser extensions
  - Too many tabs open

Check the Performance Dashboard (if you're an admin) or try refreshing.

**Q: Is there an offline mode?**
A: Not yet. The app requires internet connection. Offline mode planned for future sprint.

---

## 📈 Customer Segmentation (NEW - February 2026)

### What It Does
The Customer Segmentation Dashboard helps you understand your customer book of business by grouping customers into value tiers based on their lifetime value (LTV).

### How to Access
1. Navigate to **Analytics** page
2. Select **Customer Segmentation** tab
3. View your live customer data automatically segmented

### Understanding the Segments

#### 🏆 Elite Tier (Gold)
- **Who:** High-value customers with 4+ policies or $15K+ annual premium
- **Average LTV:** $18,000 per customer
- **Characteristics:** Multiple products, high retention (97%), referral source
- **Strategy:** White-glove service, proactive outreach, personalized communication
- **Marketing:** Allocate 15% of budget to acquire similar customers

#### ⭐ Premium Tier (Purple)
- **Who:** Bundled customers with 2-3 policies and $7K+ premium
- **Average LTV:** $9,000 per customer
- **Characteristics:** Auto + Home bundled, solid retention (91%)
- **Strategy:** Focus on adding a third product (life, umbrella)
- **Marketing:** Allocate 35% of budget here (highest ROI segment)

#### 🛡️ Standard Tier (Blue)
- **Who:** Growing customers with 1-2 policies and $3K+ premium
- **Average LTV:** $4,500 per customer
- **Characteristics:** Mid-tenure, single or dual product, cross-sell potential
- **Strategy:** Cross-sell to increase retention and move to Premium tier
- **Marketing:** Allocate 40% of budget for volume growth

#### 👤 Entry Tier (Sky Blue)
- **Who:** New or single-policy customers under $3K premium
- **Average LTV:** $1,800 per customer
- **Characteristics:** Single policy, newer relationship, conversion target
- **Strategy:** Automated service, efficient onboarding, bundle opportunities
- **Marketing:** Allocate 10% of budget (focus on efficiency)

### Live Data vs Demo Data

**Understanding the Badge:**
- **● Live Data** (sky blue badge): Dashboard is showing real customer data from your book of business
- **○ Demo Data** (amber badge): Dashboard is showing example data because:
  - No customer data has been uploaded yet
  - Customer data failed to load
  - You're viewing the dashboard before uploading your first file

**Why does it matter?**
- **Live Data:** Use these insights to make actual business decisions
- **Demo Data:** Learn how the dashboard works, but don't base decisions on it

### How to Get Live Data

1. **Upload Customer Data:**
   - Go to **Analytics** → **Upload Data**
   - Upload your Book of Business export from Allstate Gateway
   - Supported formats: CSV, Excel (.xls, .xlsx)

2. **Wait for Processing:**
   - Upload takes 5-30 seconds depending on file size
   - AI automatically detects customer names, premiums, and policy counts

3. **View Segmentation:**
   - Return to **Customer Segmentation** tab
   - Dashboard now shows **● Live Data**
   - See your actual customer distribution across tiers

### Key Metrics Explained

#### Total Portfolio LTV
The combined lifetime value of all customers in your book. This estimates how much commission revenue your customer base will generate over their lifetime with you.

**Example:** If you have 876 customers with a Total Portfolio LTV of $7.2M, that's the estimated total commission value of your entire book.

#### Avg LTV/Customer
Average lifetime value per customer across all tiers. Industry benchmark is $4,500-$6,000.

**What's good:** Higher is better. If your average is above $5,000, you have a strong book.

#### High-Value Customers
Count and percentage of Elite + Premium customers combined. These are your most profitable relationships.

**Industry insight:** Top 20% of customers typically generate 80% of profit. Elite + Premium should be 15-25% of your book.

#### LTV:CAC Ratio
Lifetime Value divided by Customer Acquisition Cost. Shows return on marketing spend.

**Example:** 15:1 ratio means you earn $15 for every $1 spent acquiring that customer.

**Benchmarks:**
- **Elite:** 15:1 (spend up to $1,200 to acquire)
- **Premium:** 13:1 (spend up to $700)
- **Standard:** 11:1 (spend up to $400)
- **Entry:** 9:1 (spend up to $200 max)

### Marketing Allocation

The dashboard recommends how to split your marketing budget based on your customer mix:

**Example Budget: $50,000/month**
- **Elite (15%):** $7,500 - Target high-value prospects similar to your Elite customers
- **Premium (35%):** $17,500 - Best ROI segment, focus acquisition here
- **Standard (40%):** $20,000 - Volume play, cross-sell to Premium
- **Entry (10%):** $5,000 - Efficiency focus, automated marketing

**Strategy Insight:**
- **Acquisition:** Focus 75% of spending on Premium + Standard (volume segments)
- **Retention:** Protect Elite + Premium with proactive service (prevent churn)

### How Segmentation Works (Technical)

The segmentation algorithm evaluates two dimensions:

1. **Annual Premium:** Total premium across all policies
2. **Policy Count:** Number of products/policies held

**Qualification Logic:**
- **Elite:** (Premium ≥$15K AND 3+ policies) OR Premium ≥$20K OR 5+ policies
- **Premium:** (Premium ≥$7K AND 2+ policies) OR Premium ≥$10K OR 4+ policies
- **Standard:** Premium ≥$3K OR 2+ policies
- **Entry:** Everything else

**Why both dimensions?**
- A customer with $25K in a single policy is Elite (high premium alone)
- A customer with $4K across 5 policies is also Elite (high policy count)
- This captures value from both revenue AND relationship depth

### Using Segmentation Data

#### For Business Planning
1. **Identify Growth Opportunities:** Standard tier customers are ripe for cross-selling
2. **Protect Your Base:** Elite/Premium need proactive service to prevent churn
3. **Marketing ROI:** Focus acquisition budget on Premium-tier prospects

#### For Customer Service
1. **White-Glove Elite Customers:** Assign your best agents, respond within 2 hours
2. **Standard Service for Premium/Standard:** Normal response times, quality service
3. **Automated for Entry:** Self-service tools, chatbots, batch processing

#### For Cross-Selling
1. **Entry → Standard:** Bundle auto + home
2. **Standard → Premium:** Add third product (life, umbrella)
3. **Premium → Elite:** Add commercial, specialty coverage

### Refreshing Data

**When to Refresh:**
- After uploading new customer data
- Weekly to see portfolio changes
- Before quarterly business reviews

**How to Refresh:**
1. Click the **Refresh** button (circular arrow icon)
2. Wait 2-5 seconds for recalculation
3. Dashboard updates with latest segmentation

**What refreshing does:**
- Re-fetches customer data from database
- Recalculates segment tiers for all customers
- Updates portfolio analysis and marketing allocation
- Checks for new cross-sell opportunities

### Tips for Success

1. **Upload Fresh Data Monthly:** Keep segmentation accurate by uploading current Book of Business exports
2. **Monitor Segment Movement:** Watch customers move between tiers over time
3. **Set Goals by Segment:**
   - Goal: Grow Elite segment by 10% this year
   - Goal: Move 30% of Standard customers to Premium
4. **Compare to Benchmarks:** Elite+Premium should be 15-25% of your book
5. **Review Marketing Allocation Quarterly:** Adjust spend based on results

### Troubleshooting

**"Dashboard shows Demo Data"**
- **Cause:** No customer data uploaded or data failed to load
- **Fix:** Upload your Book of Business from Analytics → Upload Data

**"Segmentation seems wrong"**
- **Cause:** Uploaded data missing premium or policy count columns
- **Fix:** Re-upload with all required fields (Name, Premium, Policy Count)

**"Refresh button spinning forever"**
- **Cause:** Network issue or database timeout
- **Fix:** Wait 30 seconds, then refresh the page (browser refresh)

**"Customer counts don't match my records"**
- **Cause:** Duplicate customers in uploaded data or missing entries
- **Fix:** Verify uploaded file has one row per customer with unique names

**"Portfolio LTV seems too high/low"**
- **Cause:** Algorithm uses industry averages for retention and servicing costs
- **Note:** LTV is an estimate, not exact. Use for directional insights, not precise forecasting

---

## Support

### Getting Help

**Need assistance?**
1. Check this guide first
2. Ask your team members
3. Contact Derrick (admin)
4. Email: support@bealeragency.com

### Reporting Issues

**Found a bug?**
1. Note what you were doing when it happened
2. Take a screenshot if possible
3. Report to Derrick or email support
4. Include:
   - What happened
   - What you expected
   - Steps to reproduce

### Feature Requests

**Have an idea for improvement?**
We'd love to hear it! Reach out to Derrick or email support with:
- What feature you want
- Why it would be helpful
- How you'd use it

---

## What's Next?

**Upcoming Features (Sprint 4 - TBD):**
- Document attachments in chat (PDFs, Word docs)
- Granular notification controls
- Offline mode
- Advanced task filtering
- Custom dashboards for each user
- Voice message transcription

Stay tuned for updates!

---

**Last Updated:** February 2026
**Questions?** Contact your team admin or support@bealeragency.com
