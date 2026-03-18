# Customer Linking Enhancement — Design

## Problem

Completing a task without a customer linked means it doesn't appear in the eAgent export panel. The existing `CustomerSearchInput` in task creation is buried at the bottom and easy to skip. There's no way to create a new customer on the fly, and no prompt to link a customer at completion time.

## Approach: Enhance Existing Flow + Completion Prompt

Four changes, each independent and shippable:

### 1. Promote Customer Search in Task Creation

Move `CustomerSearchInput` from the bottom of AddTodo (line 831) to right below the task text input — before priority/due date/assignee. Change label from "Link to Customer (optional)" to "Customer" with subtle helper text. Field stays optional.

**Files:** `src/components/AddTodo.tsx`

### 2. Add "+ New Customer" to Search Dropdown

When `CustomerSearchInput` returns no results, show a "+ Add [query] as new customer" button below "No customers found". Clicking opens an inline form: name (pre-filled from query), phone, policy type (dropdown: auto/home/life/umbrella/commercial). On submit, insert into `customer_insights` table and select the new customer.

**Files:** `src/components/customer/CustomerSearchInput.tsx`, new `src/components/customer/QuickAddCustomerForm.tsx`, `src/app/api/customers/route.ts` (add POST handler)

### 3. Completion-Time Customer Linking Prompt

When a task is completed (`updateStatus` in `useTodoOperations.ts`) and has no `customer_name`/`customer_id`, show a lightweight prompt (toast-like or small modal): "Link a customer to log in eAgent?" with the `CustomerSearchInput` + "Skip" button. If the user links a customer, update the todo's customer fields and queue it to eAgent.

**Files:** New `src/components/customer/CustomerLinkPrompt.tsx`, `src/hooks/useTodoOperations.ts`, `src/store/eAgentQueueStore.ts` (minor)

### 4. New Customers to Import Section in eAgent Panel

Add a section to `EAgentExportPanel` that lists customers created via quick-add (not yet in eAgent CRM). Shows name, phone, policy type with a "Copy for eAgent Import" button and "Mark Imported" action. Track via a `source: 'quick-add'` field on `customer_insights` or a separate localStorage store.

**Files:** `src/components/eAgent/EAgentExportPanel.tsx`, new `src/store/newCustomerStore.ts` (or extend eAgentQueueStore)

## Data Model

- **Existing `customer_insights` table**: add new customers here with `source = 'quick-add'` to distinguish from CSV imports
- **Existing `Todo` fields**: `customer_id`, `customer_name`, `customer_segment` — already wired end-to-end
- **New customer store**: Track which quick-add customers have been imported into eAgent CRM (localStorage, same pattern as eAgent queue)

## Implementation Order

1. Promote customer search (smallest change, immediate visibility win)
2. Quick-add customer form + API
3. Completion prompt
4. New customers export section in eAgent panel
