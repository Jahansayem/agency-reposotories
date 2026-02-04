# Modal & Dropdown UX Audit
**Date:** February 2, 2026
**Status:** 🔄 In Progress
**Purpose:** Systematic review of all modals and dropdowns for UX consistency, accessibility, and Playwright test coverage

---

## Audit Checklist

For each component, verify:
- [ ] **Positioning**: Dropdown doesn't go off-screen (left/right/top/bottom)
- [ ] **Button Sizing**: All interactive elements meet 44px minimum touch target (WCAG 2.5.5)
- [ ] **Keyboard Navigation**: Tab, Escape, Enter work correctly
- [ ] **Focus Management**: Focus trap in modals, proper focus restoration
- [ ] **Mobile Responsive**: Works on small screens (375px width)
- [ ] **Dark Mode**: Proper theming with CSS variables
- [ ] **Loading States**: Spinners/disabled states during async operations
- [ ] **Error Handling**: Clear error messages, retry options
- [ ] **Playwright Tests**: E2E test coverage exists and passes

---

## Components Audit Status

### ✅ Already Fixed (Today)
1. **AddTaskModal.tsx**
   - ✅ Width increased from max-w-2xl to max-w-4xl
   - ✅ AI Features dropdown: Changed from right-0 to left-0
   - ✅ Reminder button: Increased to min-h-[44px]
   - ⚠️ **Playwright tests written but failing (need to fix selectors)**

2. **TemplatePicker.tsx**
   - ✅ Already uses left-0 positioning
   - ⚠️ **Needs Playwright tests**

3. **ReminderPicker.tsx**
   - ✅ Button sizing fixed (min-h-44px, py-2)
   - ✅ Dropdown uses portal with smart positioning
   - ⚠️ **Needs Playwright tests**

---

### 🔍 Needs Review

4. **SmartParseModal.tsx**
   - **Purpose**: AI parsing results with main task + subtasks
   - **Used In**: AddTodo component (Cmd+P shortcut)
   - **Checklist**:
     - [ ] Modal width appropriate
     - [ ] Button sizing (Accept/Edit/Cancel)
     - [ ] Loading spinner during AI processing
     - [ ] Error state if AI fails
     - [ ] Keyboard shortcuts work
     - [ ] Playwright test exists

5. **CustomerEmailModal.tsx**
   - **Purpose**: Generate customer email from task(s)
   - **Used In**: TodoItem dropdown menu
   - **Checklist**:
     - [ ] Modal width sufficient for email preview
     - [ ] Copy button is 44px min height
     - [ ] Tone dropdown positioning
     - [ ] Warning badges visible
     - [ ] Playwright test exists

6. **DuplicateDetectionModal.tsx**
   - **Purpose**: Show potential duplicate tasks
   - **Used In**: AddTodo (when creating similar task)
   - **Checklist**:
     - [ ] Modal width shows comparison clearly
     - [ ] Button sizing (Create Anyway/Cancel/Merge)
     - [ ] Task comparison cards visible
     - [ ] Playwright test exists

7. **SaveTemplateModal.tsx**
   - **Purpose**: Save task as reusable template
   - **Used In**: TodoItem dropdown menu
   - **Checklist**:
     - [ ] Form inputs properly sized
     - [ ] Checkbox (isShared) is 44px touch target
     - [ ] Save/Cancel buttons sized correctly
     - [ ] Playwright test exists

8. **TaskDetailModal.tsx**
   - **Purpose**: Full task details view (read/edit)
   - **Used In**: Click on task card
   - **Checklist**:
     - [ ] Modal width appropriate (sidebar layout)
     - [ ] All interactive elements 44px min
     - [ ] Subtask checkboxes accessible
     - [ ] Attachment preview works
     - [ ] Chat panel in sidebar functions
     - [ ] Playwright test exists

9. **KeyboardShortcutsModal.tsx**
   - **Purpose**: Show all keyboard shortcuts
   - **Used In**: Help menu (Cmd+/)
   - **Checklist**:
     - [ ] Modal readable on small screens
     - [ ] Close button 44px
     - [ ] Escape key closes modal
     - [ ] Playwright test exists

10. **NotificationModal.tsx**
    - **Purpose**: Show activity notifications
    - **Used In**: Bell icon in header
    - **Checklist**:
      - [ ] Dropdown positioning (doesn't go off-screen)
      - [ ] Notification items clickable
      - [ ] Mark all read button sized correctly
      - [ ] Playwright test exists

11. **DashboardModal.tsx**
    - **Purpose**: Expanded dashboard/stats view
    - **Used In**: Dashboard component
    - **Checklist**:
      - [ ] Modal width appropriate for charts
      - [ ] Close button accessible
      - [ ] Charts render correctly
      - [ ] Playwright test exists

12. **ArchivedTaskModal.tsx**
    - **Purpose**: View archived/completed task details
    - **Used In**: Archive view
    - **Checklist**:
      - [ ] Modal width sufficient
      - [ ] Restore button 44px
      - [ ] Delete permanently button has confirmation
      - [ ] Playwright test exists

13. **VersionHistoryModal.tsx**
    - **Purpose**: Show task edit history
    - **Used In**: TodoItem menu
    - **Checklist**:
      - [ ] Modal width for timeline view
      - [ ] Diff view readable
      - [ ] Restore version button sized correctly
      - [ ] Playwright test exists

14. **CreateAgencyModal.tsx**
    - **Purpose**: Multi-tenancy agency creation
    - **Used In**: Agency switcher (if enabled)
    - **Checklist**:
      - [ ] Form fields accessible
      - [ ] Create button 44px
      - [ ] Validation errors clear
      - [ ] Playwright test exists

15. **RegisterModal.tsx**
    - **Purpose**: New user registration
    - **Used In**: Login screen
    - **Checklist**:
      - [ ] PIN input fields accessible
      - [ ] Color picker buttons 44px
      - [ ] Register button sized correctly
      - [ ] Playwright test exists

16. **AgencyMembersModal.tsx**
    - **Purpose**: View/manage agency members
    - **Used In**: Agency settings
    - **Checklist**:
      - [ ] Member list readable
      - [ ] Action buttons 44px
      - [ ] Invite form accessible
      - [ ] Playwright test exists

17. **TodoModals.tsx** (Wrapper)
    - **Purpose**: Manages multiple modal states
    - **Note**: This is a container component, test individual modals

18. **ui/Modal.tsx** (Base Component)
    - **Purpose**: Reusable modal base
    - **Note**: Used by other modals, verify consistent styling

---

## Task Generation Flows to Test

### Flow 1: AI Smart Parse (Cmd+P)
1. Open Add Task modal
2. Enter complex text with subtasks
3. Press Cmd+P or click AI button → Smart Parse
4. **SmartParseModal** appears
5. Verify: Parsed main task + subtasks shown
6. Accept or Edit results
7. Task created with subtasks

**Playwright Test**: `tests/ai-smart-parse.spec.ts` (needs creation)

---

### Flow 2: Template Quick-Apply (Cmd+T)
1. Open Add Task modal
2. Press Cmd+T or click template icon
3. **TemplatePicker** dropdown appears
4. Select template
5. Verify: Form pre-filled with template data
6. Submit task

**Playwright Test**: `tests/template-quick-apply.spec.ts` (needs creation)

---

### Flow 3: Voice Input (Cmd+V)
1. Open Add Task modal
2. Press Cmd+V or click mic icon
3. Voice recording indicator appears
4. Speak task description
5. Stop recording
6. AI transcription fills text field
7. Optionally parse to tasks

**Playwright Test**: `tests/voice-input.spec.ts` (needs creation)

---

### Flow 4: File Upload
1. Open Add Task modal
2. Click upload icon
3. **FileImporter** appears
4. Upload PDF/image/audio
5. AI extracts text/tasks
6. Task(s) created with attachments

**Playwright Test**: `tests/file-import.spec.ts` (needs creation)

---

### Flow 5: Generate Customer Email
1. Select completed task
2. Click "Generate Email" from menu
3. **CustomerEmailModal** appears
4. Verify: Email content, warnings visible
5. Select tone (dropdown)
6. Copy email

**Playwright Test**: `tests/customer-email.spec.ts` (needs creation)

---

## Dropdown Components (Non-Modal)

### Priority Dropdown
- **Location**: AddTodo form, TodoItem edit
- **Check**: Options visible, doesn't overflow

### Assignee Dropdown
- **Location**: AddTodo form, TodoItem edit
- **Check**: User list visible, doesn't overflow

### Status Dropdown (Kanban)
- **Location**: KanbanCard
- **Check**: Status options visible

### Recurrence Dropdown
- **Location**: AddTodo "More Options"
- **Check**: Daily/Weekly/Monthly options visible

---

## Screen Size Testing Matrix

| Component | 375px (Mobile) | 768px (Tablet) | 1920px (Desktop) |
|-----------|----------------|----------------|------------------|
| AddTaskModal | ⚠️ Test | ⚠️ Test | ✅ Fixed |
| SmartParseModal | ⚠️ Test | ⚠️ Test | ⚠️ Test |
| CustomerEmailModal | ⚠️ Test | ⚠️ Test | ⚠️ Test |
| TaskDetailModal | ⚠️ Test | ⚠️ Test | ⚠️ Test |
| TemplatePicker | ⚠️ Test | ⚠️ Test | ✅ Fixed |
| ReminderPicker | ⚠️ Test | ⚠️ Test | ✅ Fixed |

---

## Next Steps

### Immediate (This Session)
1. ✅ Fix AddTaskModal AI dropdown positioning
2. ✅ Fix ReminderPicker button sizing
3. ✅ Increase AddTaskModal width
4. ⚠️ **Fix Playwright test selectors** (tests are failing)
5. ⚠️ **Audit remaining 14 modal components**

### Short Term (Next Session)
1. Create missing Playwright tests for each modal
2. Test all task generation flows end-to-end
3. Verify mobile responsiveness (375px)
4. Dark mode verification

### Long Term (Post-Audit)
1. Standardize modal widths (sm, md, lg, xl, 2xl, 4xl)
2. Create modal design system documentation
3. Automated visual regression tests
4. Performance audit (modal open/close latency)

---

## Playwright Test Files Needed

### Existing Tests (53 total)
- `tests/phase2-smart-defaults.spec.ts` (9 tests)
- `tests/phase2-template-picker.spec.ts` (12 tests)
- `tests/phase2-batch-operations.spec.ts` (8 tests)
- `tests/phase2-touch-targets.spec.ts` (24 tests)
- `tests/add-task-ui-fixes.spec.ts` (5 tests - currently failing)

### Missing Tests (High Priority)
- [ ] `tests/smart-parse-modal.spec.ts` - AI parsing flow
- [ ] `tests/customer-email-modal.spec.ts` - Email generation
- [ ] `tests/task-detail-modal.spec.ts` - Task editing/viewing
- [ ] `tests/duplicate-detection-modal.spec.ts` - Duplicate warnings
- [ ] `tests/save-template-modal.spec.ts` - Template creation
- [ ] `tests/voice-input-flow.spec.ts` - Voice recording
- [ ] `tests/file-import-flow.spec.ts` - File uploads
- [ ] `tests/keyboard-shortcuts.spec.ts` - Cmd+K, Cmd+P, Cmd+T, etc.

---

## Success Criteria

✅ **Phase Complete When:**
1. All 17 modals audited and UX issues documented
2. All Playwright tests pass (target: 75+ tests total)
3. All dropdowns verified to stay on-screen
4. All buttons meet 44px minimum touch target
5. All task generation flows tested end-to-end
6. Mobile (375px) and desktop (1920px) verified
7. Dark mode works in all modals

---

**Last Updated:** February 2, 2026
**Next Review:** After completing remaining audits
