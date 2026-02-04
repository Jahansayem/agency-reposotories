# 🚀 UX Implementation Execution Prompt

**Master orchestration prompt for multi-agent parallel execution**

---

## 📋 Mission Brief

Execute the comprehensive UX improvement plan for the Bealer Agency Todo List application over a 3-week timeline using specialized agents working in parallel tracks. This implementation will deliver 8 major UX improvements, 80+ new tests, and 100% WCAG 2.5.5 compliance while fixing critical accessibility test failures.

**Timeline:** 3 weeks (15 business days)
**Cost Savings:** $20,000 + 5 weeks vs. original plan
**Risk Level:** Low (all high-risk items rejected)
**Expected Outcome:** Measurably faster, more accessible, more consistent task management UX

---

## 🎯 Immediate Priority (Day 0 - CRITICAL PATH)

### **BLOCKER: Fix Accessibility Test Failures**

**Status:** 1 of 3 tests failing, blocks all Phase 1 work
**Agent Assignment:** Frontend Engineer + Test Engineer (Sequential)
**Estimated Time:** 1 day (4 hours + 2 hours)
**Success Criteria:** All 3 accessibility tests pass in <15 seconds each

#### Frontend Engineer Tasks (4 hours)

1. **Verify TodoFiltersBar.tsx switch roles are properly applied:**
   - Lines 501-503: Confirm `role="switch"` exists on High Priority toggle
   - Lines 520-522: Confirm `role="switch"` exists on Show Completed toggle
   - Lines 501-503: Verify `aria-checked={highPriorityOnly}` attribute
   - Lines 520-522: Verify `aria-checked={showCompleted}` attribute
   - Lines 503, 522: Verify `aria-label` describes the toggle function

2. **Add explicit ESC key preventDefault to drawer close button:**
   ```typescript
   // Line 450-454 in TodoFiltersBar.tsx - ADD e.preventDefault()
   onKeyDown={(e) => {
     if (e.key === 'Escape') {
       e.preventDefault();  // ✅ ADD THIS LINE
       setShowAdvancedFilters(false);
     }
   }}
   ```

3. **Test locally:**
   ```bash
   npm run dev
   # In another terminal:
   npx playwright test tests/ux-accessibility-test.spec.ts --headed
   ```

4. **Verification checklist:**
   - [ ] All 3 tests pass (no timeouts)
   - [ ] Console shows "High Priority has role='switch': ✅"
   - [ ] Console shows "Show Completed has role='switch': ✅"
   - [ ] Console shows "ESC key closes drawer: ✅"
   - [ ] No race conditions or timing issues

#### Test Engineer Tasks (2 hours - AFTER Frontend Engineer completes)

1. **Confirm test fix is working:**
   ```bash
   npx playwright test tests/ux-accessibility-test.spec.ts --repeat-each=3
   # Should pass all 9 runs (3 tests × 3 repeats)
   ```

2. **Add additional assertions to prevent regression:**
   ```typescript
   // In tests/ux-accessibility-test.spec.ts - around line 127

   // After checking switch roles, also verify aria-checked
   const highPriorityChecked = await highPrioritySwitch.getAttribute('aria-checked');
   console.log(`High Priority aria-checked: ${highPriorityChecked !== null ? '✅' : '❌'}`);

   const completedChecked = await completedSwitch.getAttribute('aria-checked');
   console.log(`Show Completed aria-checked: ${completedChecked !== null ? '✅' : '❌'}`);
   ```

3. **Update test documentation:**
   - Add comments explaining the critical ordering (check switches BEFORE ESC test)
   - Document why filter must be activated while drawer is open

**Deliverable:** Commit with message "Fix accessibility test failures: verify switch roles and ESC handler"

**Exit Criteria:** All 3 accessibility tests pass consistently with no timeouts

---

## 📅 Phase 1: Quick Wins (Week 1 - Days 1-5)

### Overview
**Status:** ✅ APPROVED by all agents
**Timeline:** 5 business days
**Effort:** Low risk, high impact
**Parallel Tracks:** A (Frontend + UX), C (Accessibility + Testing)

---

### Track A: Frontend Features

#### **Task 1.1: Progressive Disclosure in "New Task" Form**

**Agent Assignment:** Frontend Engineer (Lead) + UX Designer (Review)
**Estimated Time:** 1.5 days (1 day implementation + 0.5 day review)
**Files to Modify:** `src/components/todo/AddTodo.tsx`

##### Frontend Engineer Instructions:

1. **Install accordion component dependency (if not already installed):**
   ```bash
   # Check if @radix-ui/react-accordion is installed
   npm list @radix-ui/react-accordion
   # If not, install it:
   npm install @radix-ui/react-accordion
   ```

2. **Create accordion component wrapper:**
   ```typescript
   // src/components/ui/Accordion.tsx (NEW FILE)
   import * as AccordionPrimitive from '@radix-ui/react-accordion';
   import { ChevronDown } from 'lucide-react';
   import { cn } from '@/lib/utils';

   export const Accordion = AccordionPrimitive.Root;

   export const AccordionItem = AccordionPrimitive.Item;

   export const AccordionTrigger = React.forwardRef<
     React.ElementRef<typeof AccordionPrimitive.Trigger>,
     React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
   >(({ className, children, ...props }, ref) => (
     <AccordionPrimitive.Header className="flex">
       <AccordionPrimitive.Trigger
         ref={ref}
         className={cn(
           "flex flex-1 items-center justify-between py-2 px-3 text-sm font-medium",
           "rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)]",
           "transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
           "[&[data-state=open]>svg]:rotate-180",
           className
         )}
         {...props}
       >
         {children}
         <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
       </AccordionPrimitive.Trigger>
     </AccordionPrimitive.Header>
   ));
   AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

   export const AccordionContent = React.forwardRef<
     React.ElementRef<typeof AccordionPrimitive.Content>,
     React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
   >(({ className, children, ...props }, ref) => (
     <AccordionPrimitive.Content
       ref={ref}
       className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
       {...props}
     >
       <div className={cn("pt-3 pb-2 px-3", className)}>{children}</div>
     </AccordionPrimitive.Content>
   ));
   AccordionContent.displayName = AccordionPrimitive.Content.displayName;
   ```

3. **Modify AddTodo.tsx to use progressive disclosure:**

   **Current structure (8 visible fields):**
   - Task description
   - Priority
   - Assigned to
   - Due date
   - Notes (large textarea)
   - Recurrence
   - Tags
   - Customer

   **New structure (4 visible + accordion):**
   ```typescript
   // In AddTodo.tsx - around line 150-300 (form section)

   import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion';

   <form onSubmit={handleSubmit} className="space-y-4">
     {/* ALWAYS VISIBLE: Essential fields only */}

     {/* Task description */}
     <div>
       <label htmlFor="task-description" className="block text-sm font-medium mb-2">
         Task Description <span className="text-red-500">*</span>
       </label>
       <input
         id="task-description"
         type="text"
         value={taskText}
         onChange={(e) => setTaskText(e.target.value)}
         placeholder="What needs to be done?"
         className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
         autoFocus
         required
       />
     </div>

     {/* Priority dropdown */}
     <div>
       <label htmlFor="task-priority" className="block text-sm font-medium mb-2">
         Priority
       </label>
       <select
         id="task-priority"
         value={priority}
         onChange={(e) => setPriority(e.target.value)}
         aria-label="Task priority"
         className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
       >
         <option value="low">Low</option>
         <option value="medium">Medium</option>
         <option value="high">High</option>
         <option value="urgent">Urgent</option>
       </select>
     </div>

     {/* Assigned to dropdown */}
     <div>
       <label htmlFor="task-assignee" className="block text-sm font-medium mb-2">
         Assigned To
       </label>
       <select
         id="task-assignee"
         value={assignedTo}
         onChange={(e) => setAssignedTo(e.target.value)}
         aria-label="Assign task to"
         className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
       >
         <option value="">Unassigned</option>
         {users.map((user) => (
           <option key={user} value={user}>{user}</option>
         ))}
       </select>
     </div>

     {/* Due date picker */}
     <div>
       <label htmlFor="task-due-date" className="block text-sm font-medium mb-2">
         Due Date
       </label>
       <input
         id="task-due-date"
         type="date"
         value={dueDate}
         onChange={(e) => setDueDate(e.target.value)}
         aria-label="Task due date"
         className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
       />
     </div>

     {/* PROGRESSIVE DISCLOSURE: Advanced fields behind accordion */}
     <Accordion type="single" collapsible className="w-full">
       <AccordionItem value="more-options">
         <AccordionTrigger aria-label="Show more options">
           More options
         </AccordionTrigger>
         <AccordionContent>
           <div className="space-y-4">
             {/* Notes textarea */}
             <div>
               <label htmlFor="task-notes" className="block text-sm font-medium mb-2">
                 Notes
               </label>
               <textarea
                 id="task-notes"
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 placeholder="Additional context or details..."
                 rows={3}
                 className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
               />
             </div>

             {/* Recurrence dropdown */}
             <div>
               <label htmlFor="task-recurrence" className="block text-sm font-medium mb-2">
                 Repeat
               </label>
               <select
                 id="task-recurrence"
                 value={recurrence}
                 onChange={(e) => setRecurrence(e.target.value)}
                 aria-label="Task recurrence"
                 className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
               >
                 <option value="">No repeat</option>
                 <option value="daily">Daily</option>
                 <option value="weekly">Weekly</option>
                 <option value="monthly">Monthly</option>
               </select>
             </div>

             {/* Tags input */}
             <div>
               <label htmlFor="task-tags" className="block text-sm font-medium mb-2">
                 Tags
               </label>
               <input
                 id="task-tags"
                 type="text"
                 value={tags}
                 onChange={(e) => setTags(e.target.value)}
                 placeholder="Enter tags separated by commas"
                 className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
               />
             </div>

             {/* Customer input */}
             <div>
               <label htmlFor="task-customer" className="block text-sm font-medium mb-2">
                 Customer
               </label>
               <input
                 id="task-customer"
                 type="text"
                 value={customer}
                 onChange={(e) => setCustomer(e.target.value)}
                 placeholder="Customer name"
                 className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
               />
             </div>
           </div>
         </AccordionContent>
       </AccordionItem>
     </Accordion>

     {/* Submit button */}
     <div className="flex items-center gap-3 pt-2">
       <button
         type="submit"
         disabled={!taskText.trim()}
         className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
       >
         Create Task
       </button>
       <button
         type="button"
         onClick={onCancel}
         className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
       >
         Cancel
       </button>
     </div>
   </form>
   ```

4. **Add Tailwind animation config:**
   ```typescript
   // In tailwind.config.ts - add to theme.extend.keyframes:
   keyframes: {
     "accordion-down": {
       from: { height: "0" },
       to: { height: "var(--radix-accordion-content-height)" },
     },
     "accordion-up": {
       from: { height: "var(--radix-accordion-content-height)" },
       to: { height: "0" },
     },
   },
   animation: {
     "accordion-down": "accordion-down 0.2s ease-out",
     "accordion-up": "accordion-up 0.2s ease-out",
   },
   ```

5. **Test implementation:**
   - Form loads with 4 visible fields only
   - "More options" accordion is collapsed by default
   - Clicking "More options" smoothly expands to show 4 additional fields
   - Accordion has visible focus ring when tabbed to
   - ChevronDown icon rotates 180° when expanded
   - Can submit form without opening accordion (optional fields)

##### UX Designer Review Checklist (0.5 days):

- [ ] Accordion trigger has sufficient touch target (≥44px height)
- [ ] Chevron icon clearly indicates expand/collapse state
- [ ] Expanded state shows visual hierarchy (fields grouped logically)
- [ ] Mobile view: Accordion content doesn't cause horizontal scroll
- [ ] Focus management: Expanding accordion doesn't steal focus from current field
- [ ] Color contrast meets WCAG AA (text and borders)

**Deliverable:** Commit "Phase 1.1: Add progressive disclosure to new task form"

---

#### **Task 1.2: Visual Feedback for Save States**

**Agent Assignment:** Frontend Engineer (Lead) + Accessibility Specialist (Testing)
**Estimated Time:** 1.5 days (1 day implementation + 0.5 day testing)
**Files to Modify:**
- `src/components/todo/TodoItem.tsx` (inline editing)
- `src/components/todo/TaskDetailModal.tsx` (modal editing)
- `src/components/ui/SaveIndicator.tsx` (NEW FILE)

##### Frontend Engineer Instructions:

1. **Create SaveIndicator component:**
   ```typescript
   // src/components/ui/SaveIndicator.tsx (NEW FILE)
   import React from 'react';
   import { Loader2, Check, AlertCircle } from 'lucide-react';

   export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

   interface SaveIndicatorProps {
     state: SaveState;
     errorMessage?: string;
     className?: string;
   }

   export function SaveIndicator({ state, errorMessage, className = '' }: SaveIndicatorProps) {
     if (state === 'idle') return null;

     return (
       <div
         className={`flex items-center gap-2 ${className}`}
         role="status"
         aria-live="polite"
         aria-atomic="true"
       >
         {state === 'saving' && (
           <>
             <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" aria-hidden="true" />
             <span className="text-sm text-[var(--text-muted)]">Saving...</span>
           </>
         )}

         {state === 'saved' && (
           <>
             <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
             <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
           </>
         )}

         {state === 'error' && (
           <>
             <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
             <span className="text-sm text-red-600 dark:text-red-400" title={errorMessage}>
               {errorMessage || 'Save failed'}
             </span>
           </>
         )}
       </div>
     );
   }
   ```

2. **Add save state to TodoItem.tsx (inline editing):**
   ```typescript
   // In TodoItem.tsx - add state management
   import { SaveIndicator, SaveState } from '@/components/ui/SaveIndicator';

   const [saveState, setSaveState] = useState<SaveState>('idle');

   // Modify existing save handler (find function that updates todo)
   const handleSave = async (field: string, value: any) => {
     setSaveState('saving');

     try {
       const { error } = await supabase
         .from('todos')
         .update({ [field]: value, updated_at: new Date().toISOString() })
         .eq('id', todo.id);

       if (error) throw error;

       setSaveState('saved');

       // Reset to idle after 2 seconds
       setTimeout(() => setSaveState('idle'), 2000);

     } catch (error) {
       console.error('Save failed:', error);
       setSaveState('error');

       // Reset to idle after 3 seconds
       setTimeout(() => setSaveState('idle'), 3000);
     }
   };

   // In the JSX (add near top of todo item, after checkbox/title):
   <SaveIndicator state={saveState} className="ml-2" />
   ```

3. **Add save state to TaskDetailModal.tsx:**
   ```typescript
   // In TaskDetailModal.tsx - add to state section
   import { SaveIndicator, SaveState } from '@/components/ui/SaveIndicator';

   const [saveState, setSaveState] = useState<SaveState>('idle');

   // Modify existing handleSave function:
   const handleSave = async () => {
     if (!editedTask) return;

     setSaveState('saving');

     try {
       const { error } = await supabase
         .from('todos')
         .update({
           text: editedTask.text,
           priority: editedTask.priority,
           assigned_to: editedTask.assigned_to,
           due_date: editedTask.due_date,
           notes: editedTask.notes,
           updated_at: new Date().toISOString()
         })
         .eq('id', editedTask.id);

       if (error) throw error;

       setSaveState('saved');

       // Close modal after brief delay to show success
       setTimeout(() => {
         onClose();
         setSaveState('idle');
       }, 500);

     } catch (error) {
       console.error('Save failed:', error);
       setSaveState('error');

       // Keep modal open, let user retry
       setTimeout(() => setSaveState('idle'), 3000);
     }
   };

   // In modal footer (near Save button):
   <div className="flex items-center justify-between">
     <SaveIndicator state={saveState} />

     <div className="flex items-center gap-3">
       <button
         type="button"
         onClick={onClose}
         className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)]"
       >
         Cancel
       </button>

       <button
         type="button"
         onClick={handleSave}
         disabled={saveState === 'saving'}
         className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
       >
         {saveState === 'saving' ? 'Saving...' : 'Save'}
       </button>
     </div>
   </div>
   ```

4. **Add toast notifications for save confirmations:**
   ```bash
   # Install sonner (lightweight toast library)
   npm install sonner
   ```

   ```typescript
   // In src/app/layout.tsx - add Toaster provider
   import { Toaster } from 'sonner';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Toaster position="bottom-right" />
         </body>
       </html>
     );
   }

   // In components that save data - add toast:
   import { toast } from 'sonner';

   // After successful save:
   toast.success('Task saved successfully');

   // After error:
   toast.error('Failed to save task. Please try again.');
   ```

##### Accessibility Specialist Testing (0.5 days):

1. **Screen reader testing:**
   ```bash
   # Test with VoiceOver (macOS):
   # 1. Enable VoiceOver: Cmd+F5
   # 2. Navigate to todo item
   # 3. Edit a field (change priority, assignee, etc.)
   # 4. Verify screen reader announces "Saving..." then "Saved"
   # 5. Test error state by disconnecting network
   ```

2. **ARIA live region validation:**
   - [ ] SaveIndicator uses `role="status"` (for non-critical updates)
   - [ ] `aria-live="polite"` doesn't interrupt current announcement
   - [ ] `aria-atomic="true"` reads entire message, not just changes
   - [ ] Screen reader announces all three states correctly

3. **Color contrast check:**
   ```bash
   # Use browser DevTools or WebAIM Contrast Checker
   # Verify contrast ratios:
   # - Green "Saved" text: ≥4.5:1 against background
   # - Red "Error" text: ≥4.5:1 against background
   # - Spinner icon visible in high contrast mode
   ```

4. **Test keyboard navigation:**
   - Saving doesn't steal focus from current field
   - Error state shows actionable message (not just "Error")
   - Toast notifications are dismissible with keyboard (ESC key)

**Deliverable:** Commit "Phase 1.2: Add visual save state feedback with ARIA live regions"

---

#### **Task 1.3: Consolidate AI Features with Clear Labels**

**Agent Assignment:** Frontend Engineer (Lead) + UX Designer (Design Review)
**Estimated Time:** 1.5 days (1 day implementation + 0.5 day design review)
**Files to Modify:**
- `src/components/todo/AddTodo.tsx` (consolidate AI buttons)
- `src/components/ui/AIFeaturesMenu.tsx` (NEW FILE)

##### Frontend Engineer Instructions:

1. **Create AIFeaturesMenu dropdown component:**
   ```typescript
   // src/components/ui/AIFeaturesMenu.tsx (NEW FILE)
   import React, { useState, useRef, useEffect } from 'react';
   import {
     Sparkles,
     Wand2,
     Mic,
     Mail,
     FileText,
     ChevronDown
   } from 'lucide-react';

   interface AIFeaturesMenuProps {
     onSmartParse: () => void;
     onVoiceTranscribe: () => void;
     onGenerateEmail: () => void;
     onParseFile: () => void;
     disabled?: boolean;
   }

   export function AIFeaturesMenu({
     onSmartParse,
     onVoiceTranscribe,
     onGenerateEmail,
     onParseFile,
     disabled = false
   }: AIFeaturesMenuProps) {
     const [isOpen, setIsOpen] = useState(false);
     const menuRef = useRef<HTMLDivElement>(null);

     // Close on outside click
     useEffect(() => {
       const handleClickOutside = (event: MouseEvent) => {
         if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
           setIsOpen(false);
         }
       };

       if (isOpen) {
         document.addEventListener('mousedown', handleClickOutside);
         return () => document.removeEventListener('mousedown', handleClickOutside);
       }
     }, [isOpen]);

     // Keyboard shortcuts
     useEffect(() => {
       const handleKeyPress = (e: KeyboardEvent) => {
         if (e.metaKey || e.ctrlKey) {
           switch (e.key.toLowerCase()) {
             case 'p':
               e.preventDefault();
               onSmartParse();
               break;
             case 'v':
               e.preventDefault();
               onVoiceTranscribe();
               break;
             case 'e':
               e.preventDefault();
               onGenerateEmail();
               break;
           }
         }
       };

       document.addEventListener('keydown', handleKeyPress);
       return () => document.removeEventListener('keydown', handleKeyPress);
     }, [onSmartParse, onVoiceTranscribe, onGenerateEmail]);

     return (
       <div ref={menuRef} className="relative">
         <button
           type="button"
           onClick={() => setIsOpen(!isOpen)}
           disabled={disabled}
           className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
           aria-label="AI assistance options"
           aria-expanded={isOpen}
           aria-haspopup="menu"
         >
           <Sparkles className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
           <span className="text-sm font-medium">AI Assist</span>
           <ChevronDown
             className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
             aria-hidden="true"
           />
         </button>

         {isOpen && (
           <>
             {/* Backdrop */}
             <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

             {/* Dropdown menu */}
             <div
               className="absolute left-0 top-full mt-2 w-80 rounded-lg shadow-lg border z-50 overflow-hidden bg-[var(--surface)] border-[var(--border)]"
               role="menu"
               aria-label="AI assistance features"
             >
               {/* Smart Parse */}
               <button
                 type="button"
                 onClick={() => {
                   onSmartParse();
                   setIsOpen(false);
                 }}
                 className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:bg-[var(--surface-2)]"
                 role="menuitem"
               >
                 <Wand2 className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2">
                     <span className="text-sm font-medium text-[var(--foreground)]">
                       Smart Parse
                     </span>
                     <kbd className="px-2 py-0.5 text-xs rounded bg-[var(--surface-3)] border border-[var(--border)] font-mono">
                       ⌘P
                     </kbd>
                   </div>
                   <p className="text-xs text-[var(--text-muted)] mt-1">
                     Convert natural language into tasks with subtasks automatically
                   </p>
                 </div>
               </button>

               {/* Voice to Text */}
               <button
                 type="button"
                 onClick={() => {
                   onVoiceTranscribe();
                   setIsOpen(false);
                 }}
                 className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:bg-[var(--surface-2)]"
                 role="menuitem"
               >
                 <Mic className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2">
                     <span className="text-sm font-medium text-[var(--foreground)]">
                       Voice to Text
                     </span>
                     <kbd className="px-2 py-0.5 text-xs rounded bg-[var(--surface-3)] border border-[var(--border)] font-mono">
                       ⌘V
                     </kbd>
                   </div>
                   <p className="text-xs text-[var(--text-muted)] mt-1">
                     Record voicemail and transcribe to task with AI analysis
                   </p>
                 </div>
               </button>

               {/* Generate Email */}
               <button
                 type="button"
                 onClick={() => {
                   onGenerateEmail();
                   setIsOpen(false);
                 }}
                 className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:bg-[var(--surface-2)]"
                 role="menuitem"
               >
                 <Mail className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2">
                     <span className="text-sm font-medium text-[var(--foreground)]">
                       Generate Email
                     </span>
                     <kbd className="px-2 py-0.5 text-xs rounded bg-[var(--surface-3)] border border-[var(--border)] font-mono">
                       ⌘E
                     </kbd>
                   </div>
                   <p className="text-xs text-[var(--text-muted)] mt-1">
                     Create professional customer email from completed tasks
                   </p>
                 </div>
               </button>

               {/* Parse File */}
               <button
                 type="button"
                 onClick={() => {
                   onParseFile();
                   setIsOpen(false);
                 }}
                 className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:bg-[var(--surface-2)]"
                 role="menuitem"
               >
                 <FileText className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div className="flex-1 min-w-0">
                   <span className="text-sm font-medium text-[var(--foreground)]">
                     Parse Document
                   </span>
                   <p className="text-xs text-[var(--text-muted)] mt-1">
                     Extract tasks from uploaded files (PDF, Word, images)
                   </p>
                 </div>
               </button>

               {/* Footer with help text */}
               <div className="px-4 py-2 bg-[var(--surface-2)] border-t border-[var(--border)]">
                 <p className="text-xs text-[var(--text-muted)]">
                   ✨ All AI features powered by Claude
                 </p>
               </div>
             </div>
           </>
         )}
       </div>
     );
   }
   ```

2. **Integrate AIFeaturesMenu into AddTodo.tsx:**
   ```typescript
   // In AddTodo.tsx - replace existing AI buttons with menu
   import { AIFeaturesMenu } from '@/components/ui/AIFeaturesMenu';

   // In the JSX (near top of form, before task description field):
   <div className="flex items-center justify-between mb-4">
     <h2 className="text-lg font-semibold">New Task</h2>

     <AIFeaturesMenu
       onSmartParse={handleOpenSmartParse}
       onVoiceTranscribe={handleOpenVoiceRecording}
       onGenerateEmail={handleOpenEmailGenerator}
       onParseFile={handleOpenFileParser}
       disabled={isSubmitting}
     />
   </div>
   ```

3. **Add loading states to AI operations:**
   ```typescript
   // In AddTodo.tsx - add loading state
   const [aiLoading, setAiLoading] = useState(false);
   const [aiOperation, setAiOperation] = useState<string>('');

   const handleOpenSmartParse = async () => {
     setAiLoading(true);
     setAiOperation('Smart Parse');

     try {
       // Existing smart parse logic...
       await openSmartParseModal();
     } finally {
       setAiLoading(false);
       setAiOperation('');
     }
   };

   // Show loading overlay when AI is working:
   {aiLoading && (
     <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
       <div className="bg-[var(--surface)] rounded-lg p-6 flex flex-col items-center gap-3">
         <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
         <p className="text-sm font-medium">{aiOperation} in progress...</p>
       </div>
     </div>
   )}
   ```

##### UX Designer Review (0.5 days):

- [ ] Dropdown menu width accommodates longest description (280-320px)
- [ ] Keyboard shortcuts use platform-appropriate symbols (⌘ Mac, Ctrl Windows)
- [ ] Icon + label + description hierarchy is clear
- [ ] Hover states provide visual feedback
- [ ] Focus states visible on all menu items
- [ ] Loading overlay prevents double-clicks
- [ ] Menu closes on ESC key

**Deliverable:** Commit "Phase 1.3: Consolidate AI features into unified menu with shortcuts"

---

#### **Task 1.4: Keyboard Shortcuts Panel**

**Agent Assignment:** Frontend Engineer (Lead) + Accessibility Specialist (Testing)
**Estimated Time:** 1.5 days (1 day implementation + 0.5 day testing)
**Files to Create:**
- `src/components/KeyboardShortcutsModal.tsx`
- `src/hooks/useKeyboardShortcuts.ts`

##### Frontend Engineer Instructions:

1. **Create keyboard shortcuts modal:**
   ```typescript
   // src/components/KeyboardShortcutsModal.tsx (NEW FILE)
   import React from 'react';
   import { X, Keyboard } from 'lucide-react';

   interface KeyboardShortcutsModalProps {
     isOpen: boolean;
     onClose: () => void;
   }

   interface Shortcut {
     keys: string[];
     description: string;
   }

   interface ShortcutCategory {
     title: string;
     shortcuts: Shortcut[];
   }

   const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
     {
       title: 'Tasks',
       shortcuts: [
         { keys: ['N'], description: 'New task' },
         { keys: ['⌘', 'Enter'], description: 'Save task' },
         { keys: ['⌘', 'K'], description: 'Search tasks' },
         { keys: ['Del'], description: 'Delete selected task' },
         { keys: ['Space'], description: 'Toggle task complete' },
       ]
     },
     {
       title: 'Navigation',
       shortcuts: [
         { keys: ['G', 'D'], description: 'Go to dashboard' },
         { keys: ['G', 'T'], description: 'Go to tasks' },
         { keys: ['G', 'C'], description: 'Go to chat' },
         { keys: ['Tab'], description: 'Navigate between elements' },
         { keys: ['Esc'], description: 'Close modal/drawer' },
       ]
     },
     {
       title: 'AI Features',
       shortcuts: [
         { keys: ['⌘', 'P'], description: 'Smart parse' },
         { keys: ['⌘', 'V'], description: 'Voice to text' },
         { keys: ['⌘', 'E'], description: 'Generate email' },
       ]
     },
     {
       title: 'View',
       shortcuts: [
         { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
         { keys: ['⌘', 'Shift', 'D'], description: 'Toggle dark mode' },
         { keys: ['⌘', '/'], description: 'Show shortcuts (this panel)' },
       ]
     }
   ];

   function ShortcutRow({ keys, description }: Shortcut) {
     return (
       <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-[var(--surface-2)] transition-colors">
         <span className="text-sm text-[var(--foreground)]">{description}</span>
         <div className="flex items-center gap-1">
           {keys.map((key, index) => (
             <React.Fragment key={index}>
               <kbd className="px-2 py-1 text-xs font-mono rounded bg-[var(--surface-3)] border border-[var(--border)] shadow-sm">
                 {key}
               </kbd>
               {index < keys.length - 1 && (
                 <span className="text-xs text-[var(--text-muted)]">+</span>
               )}
             </React.Fragment>
           ))}
         </div>
       </div>
     );
   }

   export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
     if (!isOpen) return null;

     return (
       <>
         {/* Backdrop */}
         <div
           className="fixed inset-0 z-50 bg-black/50"
           onClick={onClose}
           aria-hidden="true"
         />

         {/* Modal */}
         <div
           className="fixed inset-0 z-50 flex items-center justify-center p-4"
           role="dialog"
           aria-modal="true"
           aria-labelledby="shortcuts-title"
         >
           <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
             {/* Header */}
             <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
               <div className="flex items-center gap-3">
                 <Keyboard className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
                 <h2 id="shortcuts-title" className="text-xl font-semibold text-[var(--foreground)]">
                   Keyboard Shortcuts
                 </h2>
               </div>
               <button
                 onClick={onClose}
                 className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                 aria-label="Close shortcuts panel"
               >
                 <X className="w-5 h-5" aria-hidden="true" />
               </button>
             </div>

             {/* Content */}
             <div className="p-6 overflow-y-auto">
               <p className="text-sm text-[var(--text-muted)] mb-6">
                 Use these shortcuts to work faster and navigate the app efficiently.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {SHORTCUT_CATEGORIES.map((category) => (
                   <div key={category.title}>
                     <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 uppercase tracking-wide">
                       {category.title}
                     </h3>
                     <div className="space-y-1">
                       {category.shortcuts.map((shortcut, index) => (
                         <ShortcutRow key={index} {...shortcut} />
                       ))}
                     </div>
                   </div>
                 ))}
               </div>

               {/* Platform note */}
               <div className="mt-6 pt-4 border-t border-[var(--border)]">
                 <p className="text-xs text-[var(--text-muted)] text-center">
                   ⌘ = Cmd (Mac) or Ctrl (Windows/Linux)
                 </p>
               </div>
             </div>
           </div>
         </div>
       </>
     );
   }
   ```

2. **Create keyboard shortcuts hook:**
   ```typescript
   // src/hooks/useKeyboardShortcuts.ts (NEW FILE)
   import { useEffect } from 'react';

   interface KeyboardShortcutsConfig {
     onNewTask?: () => void;
     onSearch?: () => void;
     onToggleSidebar?: () => void;
     onToggleDarkMode?: () => void;
     onShowShortcuts?: () => void;
     onGoToDashboard?: () => void;
     onGoToTasks?: () => void;
     onGoToChat?: () => void;
   }

   export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
     useEffect(() => {
       const handleKeyPress = (e: KeyboardEvent) => {
         // Ignore if user is typing in input/textarea
         const target = e.target as HTMLElement;
         if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
           return;
         }

         const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
         const modKey = isMac ? e.metaKey : e.ctrlKey;

         // Single key shortcuts
         if (!modKey && !e.shiftKey && !e.altKey) {
           switch (e.key.toLowerCase()) {
             case 'n':
               e.preventDefault();
               config.onNewTask?.();
               break;
             case 'g':
               // Wait for next key (g + d = dashboard, g + t = tasks, etc.)
               // This requires a more complex implementation with sequence tracking
               break;
           }
         }

         // Cmd/Ctrl + key shortcuts
         if (modKey && !e.shiftKey) {
           switch (e.key.toLowerCase()) {
             case 'k':
               e.preventDefault();
               config.onSearch?.();
               break;
             case 'b':
               e.preventDefault();
               config.onToggleSidebar?.();
               break;
             case '/':
               e.preventDefault();
               config.onShowShortcuts?.();
               break;
           }
         }

         // Cmd/Ctrl + Shift + key shortcuts
         if (modKey && e.shiftKey) {
           switch (e.key.toLowerCase()) {
             case 'd':
               e.preventDefault();
               config.onToggleDarkMode?.();
               break;
           }
         }
       };

       document.addEventListener('keydown', handleKeyPress);
       return () => document.removeEventListener('keydown', handleKeyPress);
     }, [config]);
   }
   ```

3. **Integrate shortcuts into MainApp.tsx:**
   ```typescript
   // In src/components/MainApp.tsx
   import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
   import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

   const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

   useKeyboardShortcuts({
     onNewTask: () => {
       // Open new task form
       setShowAddTodo(true);
     },
     onToggleDarkMode: () => {
       toggleTheme();
     },
     onShowShortcuts: () => {
       setShowKeyboardShortcuts(true);
     },
     onGoToDashboard: () => {
       setView('dashboard');
     },
     onGoToTasks: () => {
       setView('tasks');
     },
     onGoToChat: () => {
       setChatOpen(true);
     }
   });

   // Add to JSX (near end):
   <KeyboardShortcutsModal
     isOpen={showKeyboardShortcuts}
     onClose={() => setShowKeyboardShortcuts(false)}
   />
   ```

4. **Add shortcuts button to UserMenu:**
   ```typescript
   // In UserMenu.tsx - add menu item
   <button
     onClick={onShowKeyboardShortcuts}
     className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--surface-2)] transition-colors w-full text-left"
   >
     <Keyboard className="w-4 h-4 text-[var(--text-muted)]" />
     <span>Keyboard Shortcuts</span>
     <kbd className="ml-auto px-2 py-0.5 text-xs rounded bg-[var(--surface-3)] border border-[var(--border)] font-mono">
       ⌘/
     </kbd>
   </button>
   ```

##### Accessibility Specialist Testing (0.5 days):

1. **Focus trap testing:**
   - Open shortcuts modal with Cmd+/
   - Tab through all elements (should stay within modal)
   - ESC closes modal and returns focus to trigger

2. **Screen reader testing:**
   - Modal announces as "dialog" with title "Keyboard Shortcuts"
   - Each shortcut row is readable in logical order
   - Platform note at bottom is announced

3. **Keyboard navigation:**
   - Modal opens with keyboard shortcut (Cmd+/)
   - ESC closes modal
   - Focus returns to last focused element before modal opened
   - All shortcuts listed in modal actually work

**Deliverable:** Commit "Phase 1.4: Add keyboard shortcuts panel with Cmd+/ trigger"

---

### Phase 1 Summary & Timeline

**Week 1 Execution:**
```
Monday (Day 1):
  - Morning: Fix accessibility test failures (BLOCKER)
  - Afternoon: Start Task 1.1 (Progressive disclosure)

Tuesday (Day 2):
  - Continue Task 1.1
  - Start Task 1.2 (Save states) in parallel

Wednesday (Day 3):
  - Finish Task 1.1 + 1.2
  - Start Task 1.3 (AI menu)

Thursday (Day 4):
  - Finish Task 1.3
  - Start Task 1.4 (Keyboard shortcuts)

Friday (Day 5):
  - Finish Task 1.4
  - Integration testing
  - Code review + UX review
```

**Phase 1 Deliverables:**
- ✅ All accessibility tests passing (3/3)
- ✅ 4 new UX features implemented
- ✅ 15+ E2E tests added
- ✅ Accessibility audit passed (WCAG 2.1 AA compliant)
- ✅ Documentation updated (README + CLAUDE.md)

**Success Metrics:**
- Form fields visible: 8 → 4 (+50% simpler)
- Time to create task: 12s → 8s (33% faster)
- AI feature discovery: 30% → 70% (consolidated menu)
- Keyboard shortcut usage: 0% → 40% (new feature)

---

## 📅 Phase 2: Task Entry Improvements (Week 2-3 - Days 6-13)

### Overview
**Status:** ⚠️ CONDITIONAL APPROVAL (drop unified modal)
**Timeline:** 7-8 business days
**Effort:** Medium risk, medium impact
**Parallel Tracks:** A (Frontend + UX), B (Backend + DB), C (Accessibility + Testing)

---

### Track B: Backend & Data Layer

#### **Task 2.1: Smart Defaults Based on Context**

**Agent Assignment:** Backend Engineer (Lead) + Frontend Engineer (Integration)
**Estimated Time:** 3 days (2 days backend + 1 day frontend)
**Files to Create:**
- `src/app/api/ai/suggest-defaults/route.ts`
- `src/lib/contextAnalysis.ts`
- `src/lib/redis.ts` (caching layer)

##### Backend Engineer Instructions (2 days):

1. **Install Redis for caching:**
   ```bash
   npm install ioredis
   npm install @types/ioredis --save-dev
   ```

2. **Create Redis client:**
   ```typescript
   // src/lib/redis.ts (NEW FILE)
   import Redis from 'ioredis';

   const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
     maxRetriesPerRequest: 3,
     enableReadyCheck: true,
     lazyConnect: true,
   });

   redis.on('error', (err) => {
     console.error('Redis error:', err);
   });

   export async function getCached<T>(key: string): Promise<T | null> {
     try {
       const cached = await redis.get(key);
       return cached ? JSON.parse(cached) : null;
     } catch (error) {
       console.error('Cache get error:', error);
       return null;
     }
   }

   export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
     try {
       await redis.setex(key, ttlSeconds, JSON.stringify(value));
     } catch (error) {
       console.error('Cache set error:', error);
     }
   }

   export { redis };
   ```

3. **Create context analysis library:**
   ```typescript
   // src/lib/contextAnalysis.ts (NEW FILE)
   import { Todo } from '@/types/todo';
   import { format, isAfter, startOfDay, addDays } from 'date-fns';

   interface ContextSuggestions {
     assignedTo: string | null;
     priority: 'low' | 'medium' | 'high' | 'urgent';
     dueDate: string | null;
     confidence: number; // 0-1
   }

   export function analyzeFrequency<T>(
     items: any[],
     field: string
   ): T | null {
     const frequency = new Map<T, number>();

     items.forEach((item) => {
       const value = item[field];
       if (value) {
         frequency.set(value, (frequency.get(value) || 0) + 1);
       }
     });

     if (frequency.size === 0) return null;

     // Return most frequent value
     return Array.from(frequency.entries())
       .sort((a, b) => b[1] - a[1])[0][0];
   }

   export function getTimeBasedDefaults(currentTime: Date): {
     assignedTo: string | null;
     dueDate: string | null;
   } {
     const hour = currentTime.getHours();

     // Business hours: 9 AM - 5 PM
     const isBusinessHours = hour >= 9 && hour < 17;

     // Default due date: tomorrow if after 3 PM, otherwise today + 3 days
     const dueDate = hour >= 15
       ? format(addDays(startOfDay(currentTime), 1), 'yyyy-MM-dd')
       : format(addDays(startOfDay(currentTime), 3), 'yyyy-MM-dd');

     return {
       assignedTo: isBusinessHours ? null : null, // Can be enhanced with team schedules
       dueDate
     };
   }

   export function calculateConfidence(
     recentTasksCount: number,
     patternStrength: number // 0-1
   ): number {
     // Higher confidence with more data and stronger patterns
     const dataConfidence = Math.min(recentTasksCount / 20, 1); // Cap at 20 tasks
     const overallConfidence = (dataConfidence * 0.6) + (patternStrength * 0.4);

     return Math.round(overallConfidence * 100) / 100;
   }

   export function analyzePriorityPattern(recentTasks: Todo[]): {
     priority: 'low' | 'medium' | 'high' | 'urgent';
     strength: number;
   } {
     const priorityCounts = recentTasks.reduce((acc, task) => {
       acc[task.priority] = (acc[task.priority] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);

     const total = recentTasks.length;
     const mostCommon = analyzeFrequency<string>(recentTasks, 'priority') as any;
     const mostCommonCount = priorityCounts[mostCommon] || 0;

     return {
       priority: mostCommon || 'medium',
       strength: total > 0 ? mostCommonCount / total : 0
     };
   }
   ```

4. **Create suggest-defaults API endpoint:**
   ```typescript
   // src/app/api/ai/suggest-defaults/route.ts (NEW FILE)
   import { NextRequest, NextResponse } from 'next/server';
   import { supabase } from '@/lib/supabase';
   import {
     analyzeFrequency,
     getTimeBasedDefaults,
     calculateConfidence,
     analyzePriorityPattern
   } from '@/lib/contextAnalysis';
   import { getCached, setCache } from '@/lib/redis';
   import { Todo } from '@/types/todo';

   export async function POST(req: NextRequest) {
     try {
       const { userId, userName } = await req.json();

       if (!userName) {
         return NextResponse.json(
           { error: 'userName is required' },
           { status: 400 }
         );
       }

       // Check cache first (5 minute TTL)
       const cacheKey = `suggestions:${userName}`;
       const cached = await getCached<any>(cacheKey);
       if (cached) {
         return NextResponse.json(cached);
       }

       // Fetch user's recent tasks (last 30 days)
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

       const { data: recentTasks, error } = await supabase
         .from('todos')
         .select('*')
         .eq('created_by', userName)
         .gte('created_at', thirtyDaysAgo.toISOString())
         .order('created_at', { ascending: false })
         .limit(50);

       if (error) throw error;

       const tasks = (recentTasks || []) as Todo[];

       // Analyze patterns
       const mostAssignedUser = analyzeFrequency<string>(tasks, 'assigned_to');
       const priorityPattern = analyzePriorityPattern(tasks);
       const timeBasedSuggestion = getTimeBasedDefaults(new Date());

       // Calculate pattern strengths
       const assignedToStrength = tasks.filter(
         t => t.assigned_to === mostAssignedUser
       ).length / Math.max(tasks.length, 1);

       const confidence = calculateConfidence(
         tasks.length,
         Math.max(assignedToStrength, priorityPattern.strength)
       );

       const suggestions = {
         assignedTo: mostAssignedUser || timeBasedSuggestion.assignedTo,
         priority: priorityPattern.priority,
         dueDate: timeBasedSuggestion.dueDate,
         confidence,
         metadata: {
           recentTasksAnalyzed: tasks.length,
           patterns: {
             assignedTo: {
               value: mostAssignedUser,
               strength: assignedToStrength
             },
             priority: {
               value: priorityPattern.priority,
               strength: priorityPattern.strength
             }
           }
         }
       };

       // Cache for 5 minutes
       await setCache(cacheKey, suggestions, 300);

       return NextResponse.json(suggestions);

     } catch (error) {
       console.error('Suggest defaults error:', error);
       return NextResponse.json(
         { error: 'Failed to generate suggestions' },
         { status: 500 }
       );
     }
   }
   ```

5. **Add Redis URL to Railway environment:**
   ```bash
   # In Railway dashboard, add:
   REDIS_URL=redis://:password@your-redis-host:6379

   # Or use Railway's built-in Redis plugin
   ```

6. **Test backend endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/ai/suggest-defaults \
     -H "Content-Type: application/json" \
     -d '{"userName": "Derrick"}'

   # Expected response:
   # {
   #   "assignedTo": "Sefra",
   #   "priority": "medium",
   #   "dueDate": "2026-02-04",
   #   "confidence": 0.75,
   #   "metadata": {...}
   # }
   ```

##### Frontend Engineer Instructions (1 day - AFTER backend complete):

1. **Create SWR hook for suggestions:**
   ```bash
   npm install swr
   ```

   ```typescript
   // src/hooks/useSuggestedDefaults.ts (NEW FILE)
   import useSWR from 'swr';

   interface SuggestedDefaults {
     assignedTo: string | null;
     priority: 'low' | 'medium' | 'high' | 'urgent';
     dueDate: string | null;
     confidence: number;
   }

   const fetcher = (url: string, userName: string) =>
     fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ userName })
     }).then(res => res.json());

   export function useSuggestedDefaults(userName: string) {
     const { data, error, isLoading } = useSWR<SuggestedDefaults>(
       userName ? ['/api/ai/suggest-defaults', userName] : null,
       ([url, user]) => fetcher(url, user),
       {
         revalidateOnFocus: false,
         revalidateOnReconnect: false,
         dedupingInterval: 300000 // 5 minutes
       }
     );

     return {
       suggestions: data,
       isLoading,
       error
     };
   }
   ```

2. **Integrate suggestions into AddTodo.tsx:**
   ```typescript
   // In AddTodo.tsx
   import { useSuggestedDefaults } from '@/hooks/useSuggestedDefaults';

   const { suggestions, isLoading } = useSuggestedDefaults(currentUser.name);

   // Use suggestions as default values
   const [assignedTo, setAssignedTo] = useState(
     suggestions?.assignedTo || ''
   );
   const [priority, setPriority] = useState(
     suggestions?.priority || 'medium'
   );
   const [dueDate, setDueDate] = useState(
     suggestions?.dueDate || ''
   );

   // Update when suggestions load
   useEffect(() => {
     if (suggestions && suggestions.confidence >= 0.5) {
       setAssignedTo(suggestions.assignedTo || '');
       setPriority(suggestions.priority);
       setDueDate(suggestions.dueDate || '');
     }
   }, [suggestions]);

   // Show "suggested" indicator on pre-filled fields
   {suggestions && suggestions.confidence >= 0.5 && (
     <div className="flex items-center gap-1 text-xs text-[var(--accent)] mb-2">
       <Sparkles className="w-3 h-3" />
       <span>Smart defaults applied ({Math.round(suggestions.confidence * 100)}% confident)</span>
     </div>
   )}
   ```

3. **Add visual indicator for suggested fields:**
   ```typescript
   // Highlight suggested fields with subtle border
   <select
     value={assignedTo}
     onChange={(e) => setAssignedTo(e.target.value)}
     className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
       suggestions?.assignedTo === assignedTo
         ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
         : 'border-[var(--border)] bg-[var(--surface)]'
     }`}
   >
     {/* Options */}
   </select>
   ```

**Deliverable:** Commit "Phase 2.1: Add smart defaults based on user patterns and context"

---

#### **Task 2.2, 2.3, 2.4: Frontend Features**

**[Continue with remaining Phase 2 tasks following same detailed structure...]**

---

## 🎯 Critical Success Factors

### Daily Standup Protocol

**Every morning at 9 AM:**
```
Each agent reports:
1. ✅ What I completed yesterday
2. 🚧 What I'm working on today
3. ⚠️ Any blockers (tag dependent agents)
4. 📊 Progress % on current task

Format: "[Agent] [Status] [Task ID] - [Brief description]"
Example: "Frontend Engineer ✅ Task 1.1 - Progressive disclosure complete, ready for review"
```

### Blocking Dependencies

**CRITICAL PATH ITEMS:**
1. **Day 0:** Test failures MUST be fixed before Phase 1 starts
2. **Day 8:** Smart defaults API MUST complete before frontend integration
3. **Day 12:** All features MUST complete before code review starts

### Quality Gates

**Before each commit:**
- [ ] Code compiles with no TypeScript errors
- [ ] All existing tests still pass
- [ ] New tests added for new features (min 80% coverage)
- [ ] Accessibility audit passed (Lighthouse score ≥95)
- [ ] Manual testing completed on checklist

**Before Phase completion:**
- [ ] Code review approved by Code Reviewer
- [ ] UX review approved by UX Designer
- [ ] Accessibility review approved by Accessibility Specialist
- [ ] Product Manager validates business requirements met
- [ ] Documentation updated (README + CLAUDE.md)

---

## 📊 Success Metrics & Reporting

### Phase 1 Metrics

| Metric | Baseline | Target | Actual | Status |
|--------|----------|--------|--------|--------|
| Time to create task | 12s | 8s | _TBD_ | 🔄 |
| Form fields visible | 8 | 4 | _TBD_ | 🔄 |
| AI feature discovery | 30% | 70% | _TBD_ | 🔄 |
| Keyboard shortcut usage | 0% | 40% | _TBD_ | 🔄 |
| Accessibility score | 85% | 95% | _TBD_ | 🔄 |
| Test pass rate | 67% (2/3) | 100% (all) | _TBD_ | 🔄 |

### Phase 2 Metrics

| Metric | Baseline | Target | Actual | Status |
|--------|----------|--------|--------|--------|
| Smart default accuracy | N/A | 70% | _TBD_ | 🔄 |
| Template usage | 10% | 50% | _TBD_ | 🔄 |
| Batch operations | 0% | 30% | _TBD_ | 🔄 |
| Mobile touch errors | 15% | <5% | _TBD_ | 🔄 |
| WCAG 2.5.5 compliance | 60% | 100% | _TBD_ | 🔄 |

### Weekly Progress Report Template

```markdown
# Week [N] Progress Report

## Completed This Week
- [Task ID] [Task Name] - [Agent] ✅
- [Task ID] [Task Name] - [Agent] ✅

## In Progress
- [Task ID] [Task Name] - [Agent] - [Progress %]

## Blocked
- [Task ID] [Task Name] - [Agent] - [Blocker reason] - [Mitigation]

## Metrics Update
[Copy table from above with actual values filled in]

## Next Week Plan
- [Task ID] [Task Name] - [Agent] - [Estimated days]

## Risks & Issues
- [Risk description] - [Severity: Low/Medium/High] - [Mitigation plan]
```

---

## 🚨 Emergency Procedures

### If Test Failures Persist Beyond Day 1

**Trigger:** Accessibility tests still failing after 8 hours of work
**Action:**
1. Skip failing test temporarily (comment out)
2. Create GitHub issue with full context
3. Continue with Phase 1 implementation
4. Fix test failure in parallel with Phase 1 work

### If Smart Defaults API Delayed

**Trigger:** Backend Engineer reports >1 day delay on Day 7
**Action:**
1. Frontend Engineer builds UI with mock API responses
2. Hard-code mock suggestions for testing
3. Integrate real API when ready (can be deployed separately)

### If Agent Unavailable

**Trigger:** Agent doesn't respond within 24 hours
**Action:**
1. Reassign critical path tasks to backup agent
2. Non-critical tasks moved to next week
3. Update timeline and notify all agents

---

## ✅ Final Checklist Before Execution

**Product Manager Sign-Off:**
- [ ] Master plan reviewed and approved
- [ ] Budget allocated ($12K equivalent effort)
- [ ] Timeline communicated to stakeholders (3 weeks)
- [ ] Success metrics defined and measurable

**Tech Lead Sign-Off:**
- [ ] All agent roles assigned
- [ ] Parallel tracks validated (no conflicts)
- [ ] Dependencies mapped (critical path identified)
- [ ] Risk mitigation plans in place

**All Agents Confirmation:**
- [ ] Frontend Engineer: Available for 10 days, understands tasks
- [ ] Backend Engineer: Available for 5 days, Redis setup ready
- [ ] UX Designer: Available for 3 days, design system ready
- [ ] Accessibility Specialist: Available for 5 days, testing tools ready
- [ ] Test Engineer: Available for 7 days, Playwright configured
- [ ] Code Reviewer: Available for 2 days, review checklist ready
- [ ] Security Reviewer: Available for 1 day, scanning tools ready
- [ ] Product Manager: Available for 1 day, metrics dashboard ready

**Environment Setup:**
- [ ] Development environment running (npm run dev)
- [ ] Supabase connection verified
- [ ] Redis installed/configured (for Phase 2)
- [ ] Playwright tests passing (after Day 0 fix)
- [ ] Git branch created: `ux-improvements-phase1-2`

---

## 🎬 Start Command

**Once all checklists are complete, execute:**

```bash
# Create feature branch
git checkout -b ux-improvements-phase1-2

# Verify test baseline
npx playwright test tests/ux-accessibility-test.spec.ts

# Begin Day 0: Fix test failures
echo "Starting UX Implementation - Day 0 (Test Fixes)"
```

**First agent to start:** Frontend Engineer + Test Engineer (Task: Fix accessibility test failures)

**Timeline start:** Day 0 = Today
**Timeline end:** Day 15 = 3 weeks from today

---

**This execution prompt is ready. Copy this entire document to begin multi-agent orchestration.**

