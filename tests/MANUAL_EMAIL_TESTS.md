# Manual Email Generation Feature Testing Guide

This guide provides step-by-step instructions for manually testing the email generation feature in both List and Kanban views.

## Prerequisites
- Application running on localhost:3000
- Test account logged in
- ANTHROPIC_API_KEY configured in .env.local

---

## Test Suite 1: Basic Email Generation (List View)

### Test 1.1: Single Task Email
**Steps:**
1. Create a task: "Review auto insurance policy for John Smith"
2. Mark task as completed
3. Click the task checkbox to select it
4. Click "Email Customer" button in bulk actions
5. Fill in customer details:
   - Name: John Smith
   - Email: john@example.com
   - Phone: (optional)
6. Select tone: "Friendly"
7. Check "Include next steps"
8. Click "Generate Email"

**Expected Results:**
- ✅ Email generates within 3-5 seconds
- ✅ Subject line is professional and specific
- ✅ Body uses insurance agent language
- ✅ Customer name (John) appears in email
- ✅ Task completion is mentioned
- ✅ No placeholder text like [NAME] or [DATE]
- ✅ Email is 2-4 paragraphs

---

### Test 1.2: Single Task Email (Board View)
**Steps:**
1. Switch to Board view
2. Create a task in "Done" column: "Submit claim for Sarah Johnson"
3. Click task card to open it, add note: "Auto claim #12345"
4. Close detail modal
5. Enable bulk actions (checkbox icon in top right)
6. Select the task using checkbox on card
7. Click "Email Customer"
8. Fill in: Name: Sarah Johnson
9. Select tone: "Formal"
10. Click "Generate Email"

**Expected Results:**
- ✅ Same quality as list view
- ✅ Formal tone is more professional
- ✅ Email references the completed claim

---

## Test Suite 2: Voicemail Transcription

### Test 2.1: Email with Transcription
**Steps:**
1. Create task: "Follow up on renewal quote"
2. Set status to "In Progress"
3. Click task to open detail modal
4. Add transcription:
   ```
   Hi this is Mike Johnson. I got your quote for my homeowners renewal
   but the premium went up $200 from last year. Can you explain why?
   Also I wanted to add an umbrella policy. Please call me at 555-1234.
   ```
5. Save and close
6. Select task and click "Email Customer"
7. Name: Mike Johnson, Phone: 555-1234
8. Tone: Friendly
9. Generate email

**Expected Results:**
- ✅ Email acknowledges receiving the voicemail
- ✅ Email addresses the premium increase concern
- ✅ Email mentions the umbrella policy interest
- ✅ Email references specific details from transcription
- ✅ Tone is empathetic and helpful

---

### Test 2.2: Sensitive Info Warning
**Steps:**
1. Create task: "Process claim payment"
2. Add transcription:
   ```
   My SSN is 123-45-6789 and I need the claim check sent to
   account number 987654321. Thanks!
   ```
3. Select and generate email for "Customer Test"

**Expected Results:**
- ✅ Yellow warning box appears
- ✅ Warning has Shield icon
- ✅ Warning type: "sensitive_info"
- ✅ Warning message mentions SSN or account numbers
- ✅ Location indicates "body"

---

## Test Suite 3: Attachments

### Test 3.1: Email with Attachments
**Steps:**
1. Create task: "Review submitted documents"
2. Open task detail modal
3. Upload test files:
   - drivers_license.pdf
   - vehicle_registration.jpg
   - insurance_card.png
4. Mark task as "Done"
5. Select and email to "Robert Davis"
6. Tone: Friendly
7. Generate

**Expected Results:**
- ✅ Email mentions reviewing documents
- ✅ Email may reference specific document types
- ✅ Professional acknowledgment of receipt
- ✅ No specific file names exposed (just "documents")

---

## Test Suite 4: Subtasks Progress

### Test 4.1: Partial Progress
**Steps:**
1. Create task: "Commercial policy setup"
2. Add 5 subtasks:
   - Get business info
   - Request COI from previous carrier
   - Get quotes from 3 carriers
   - Compare coverage options
   - Send recommendation to client
3. Complete first 3 subtasks (3/5 done)
4. Set main task to "In Progress"
5. Add note: "Waiting on COI from State Farm"
6. Select and email to "Tom Wilson"
7. Include next steps
8. Generate

**Expected Results:**
- ✅ Email shows active work in progress
- ✅ Email demonstrates thoroughness (mentions multiple steps)
- ✅ Email is reassuring about progress
- ✅ Next steps mention what's remaining

---

### Test 4.2: Fully Completed Subtasks
**Steps:**
1. Create task: "Annual policy review"
2. Add 4 subtasks, mark all completed
3. Mark main task "Done"
4. Email to "Emma Brown"
5. Generate

**Expected Results:**
- ✅ Email celebrates completion
- ✅ Positive, accomplished tone
- ✅ Shows comprehensive review was done

---

## Test Suite 5: Multiple Tasks

### Test 5.1: Mixed Status Tasks
**Steps:**
1. Create and select 3 tasks:
   - "Auto policy renewal" - Done (3/3 subtasks)
   - "Add new driver to policy" - In Progress (1/2 subtasks)
   - "Review homeowners coverage" - To Do
2. Select all three
3. Email to "David Thompson"
4. Email: david@example.com
5. Friendly tone, include next steps
6. Generate

**Expected Results:**
- ✅ Email organized logically (completed first, then in-progress, then pending)
- ✅ Clear about what's done vs. what's next
- ✅ Professional summary of overall status
- ✅ Subject mentions "update" or "progress"

---

## Test Suite 6: Warning Flags

### Test 6.1: Date Promise Warning
**Steps:**
1. Create task: "Process claim payment"
2. Set due date: 3 days from today
3. Add note: "Customer needs check by [due date]. Promised payment by end of week."
4. Mark "In Progress"
5. Generate email to "Susan Miller"

**Expected Results:**
- ✅ Warning appears with Calendar icon
- ✅ Warning type: "date_promise"
- ✅ Warning mentions timeline/date commitment
- ✅ Agent can review before sending

---

### Test 6.2: Pricing Warning
**Steps:**
1. Create task: "Update coverage limits"
2. Mark "Done"
3. Add note: "Increased liability to $500K. New premium: $1,200/year"
4. Generate email to "George Harris"

**Expected Results:**
- ✅ Warning with DollarSign icon
- ✅ Warning type: "pricing" or "coverage_detail"
- ✅ Flags the premium amount for verification

---

### Test 6.3: Negative News Warning
**Steps:**
1. Create task: "Process claim denial"
2. Mark "Done"
3. Add note: "Claim denied - damage occurred before policy start date"
4. Generate email to "Patricia Moore"
5. Formal tone

**Expected Results:**
- ✅ Warning appears (type: "negative_news")
- ✅ Suggests softer delivery needed
- ✅ Email body handles bad news professionally

---

## Test Suite 7: Tone Variations

### Test 7.1: Compare All Three Tones
**Setup:**
- Same task: "Policy review complete"
- Same customer: "Test Customer"
- Task marked "Done"

**Test A - Formal:**
- Generate with "Formal" tone
- Note length and style

**Test B - Friendly:**
- Regenerate with "Friendly" tone
- Compare warmth and personality

**Test C - Brief:**
- Regenerate with "Brief" tone
- Should be 2-3 sentences max

**Expected Results:**
- ✅ Formal: Professional, structured, "Dear [Name]"
- ✅ Friendly: Warm, personal, conversational
- ✅ Brief: Concise, under 200 words, just essentials
- ✅ All maintain insurance agent professionalism

---

## Test Suite 8: UI/UX Features

### Test 8.1: Customer Detection
**Steps:**
1. Create task: "Call John Smith about renewal - john.smith@email.com - 555-1234"
2. Select task
3. Click "Email Customer"

**Expected Results:**
- ✅ Customer name auto-detected: "John Smith"
- ✅ Email auto-detected: "john.smith@email.com"
- ✅ Phone auto-detected: "555-1234"

---

### Test 8.2: Edit Generated Email
**Steps:**
1. Generate any email
2. Click "Edit" on subject line
3. Modify subject
4. Click checkmark to save
5. Click "Edit" on body
6. Add a sentence
7. Save

**Expected Results:**
- ✅ Subject editing works smoothly
- ✅ Body editing preserves line breaks
- ✅ Changes are saved in preview

---

### Test 8.3: Copy to Clipboard
**Steps:**
1. Generate email
2. Click "Copy" button on subject
3. Click "Copy" button on body
4. Paste both into a text editor

**Expected Results:**
- ✅ Subject copies correctly
- ✅ Body copies with proper formatting
- ✅ No HTML or extra characters

---

### Test 8.4: Gmail Integration
**Steps:**
1. Generate email with customer email address
2. Click "Send via Gmail" button
3. Check Gmail compose window

**Expected Results:**
- ✅ Gmail opens in new tab
- ✅ To: field has customer email
- ✅ Subject line is populated
- ✅ Body is populated with proper line breaks

---

### Test 8.5: Regenerate Email
**Steps:**
1. Generate email
2. Click "Regenerate" button
3. Wait for new email

**Expected Results:**
- ✅ New email is different from first
- ✅ Still maintains quality and relevance
- ✅ Loading spinner shows during generation

---

## Test Suite 9: Edge Cases

### Test 9.1: Very Long Task Name
**Steps:**
1. Create task with 300+ character name
2. Generate email

**Expected Results:**
- ✅ Email handles gracefully
- ✅ No truncation issues in modal

---

### Test 9.2: Special Characters in Names
**Steps:**
1. Generate email for: "O'Brien-McDonald & Associates, LLC"
2. Sender: "Mary O'Connor-Smith"

**Expected Results:**
- ✅ Apostrophes handled correctly
- ✅ Hyphens preserved
- ✅ Ampersands work

---

### Test 9.3: Empty Notes/Transcription
**Steps:**
1. Create task with no notes, no transcription
2. Generate email

**Expected Results:**
- ✅ Email still generates well
- ✅ No "undefined" or "null" text
- ✅ Focuses on task status

---

### Test 9.4: 10+ Tasks Selected
**Steps:**
1. Create and select 10 different tasks
2. Generate email

**Expected Results:**
- ✅ Email summarizes intelligently
- ✅ Doesn't list all 10 individually
- ✅ Groups by status or theme

---

## Test Suite 10: Error Handling

### Test 10.1: No Customer Name
**Steps:**
1. Select task
2. Click "Email Customer"
3. Leave name blank
4. Try to generate

**Expected Results:**
- ✅ Error message appears
- ✅ "Customer name required" or similar
- ✅ Generate button disabled or shows error

---

### Test 10.2: API Key Missing
**Steps:**
1. Remove ANTHROPIC_API_KEY from .env.local
2. Restart server
3. Try to generate email

**Expected Results:**
- ✅ Error shown to user
- ✅ Not a cryptic error
- ✅ Doesn't crash the app

---

### Test 10.3: Network Error
**Steps:**
1. Start email generation
2. Disconnect network mid-request
3. Wait for timeout

**Expected Results:**
- ✅ Error message displays
- ✅ Can retry
- ✅ Modal doesn't get stuck

---

## Test Suite 11: Dark Mode

### Test 11.1: Dark Mode UI
**Steps:**
1. Toggle dark mode
2. Open email modal
3. Generate email
4. Check warnings display

**Expected Results:**
- ✅ All text readable
- ✅ Warning box has good contrast
- ✅ Icons visible
- ✅ Input fields styled correctly

---

## Test Suite 12: Insurance Language Quality

### Test 12.1: Industry Terminology
**Steps:**
1. Create tasks using insurance terms:
   - "Review policy coverage and deductible"
   - "Submit claim to carrier"
   - "Process renewal quote"
2. Generate email

**Expected Results:**
- ✅ Uses terms: policy, coverage, premium, claim, carrier, quote, deductible
- ✅ Doesn't use: "ticket", "request", "item", "task"
- ✅ Sounds like a real insurance agent

---

### Test 12.2: Avoid Generic AI Phrases
**Review generated emails should NOT contain:**
- ❌ "I hope this email finds you well"
- ❌ "Please let me know if you have any questions"
- ❌ "I'm here to help"
- ❌ "[DATE]" or "[NAME]" placeholders
- ❌ Bullet points
- ❌ "Task management system"

**Should contain:**
- ✅ "I wanted to reach out"
- ✅ "I've reviewed your policy"
- ✅ "You're all set"
- ✅ "Everything is in order"
- ✅ Specific actions taken

---

## Success Criteria Summary

For the email generation feature to pass comprehensive testing:

1. **Functionality** (30 points)
   - ✅ Basic generation works
   - ✅ Transcriptions incorporated
   - ✅ Attachments acknowledged
   - ✅ Subtasks shown
   - ✅ Multiple tasks handled

2. **Warning System** (20 points)
   - ✅ Sensitive info flagged
   - ✅ Date promises flagged
   - ✅ Pricing flagged
   - ✅ Coverage details flagged
   - ✅ Negative news flagged

3. **UI/UX** (20 points)
   - ✅ Customer detection works
   - ✅ Editing works
   - ✅ Copy buttons work
   - ✅ Gmail integration works
   - ✅ Regenerate works

4. **Quality** (20 points)
   - ✅ Insurance agent tone
   - ✅ No generic AI phrases
   - ✅ Professional and concise
   - ✅ Proper formatting

5. **Error Handling** (10 points)
   - ✅ Validation errors shown
   - ✅ Network errors handled
   - ✅ API errors handled

**Total: 100 points**
**Pass threshold: 85+ points**

---

## Regression Testing Checklist

After any changes to email generation:

- [ ] Test basic single task email
- [ ] Test with transcription
- [ ] Test with attachments
- [ ] Test warning flags appear
- [ ] Test all three tones
- [ ] Test in both List and Board view
- [ ] Test dark mode
- [ ] Test error handling
- [ ] Verify no console errors
- [ ] Check insurance language quality

---

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected vs actual result
3. Screenshots (especially for UI issues)
4. Browser and OS
5. Console errors (if any)
6. Generated email sample (sanitized)

---

**Created:** 2026-01-05
**Last Updated:** 2026-01-05
**Version:** 1.0
