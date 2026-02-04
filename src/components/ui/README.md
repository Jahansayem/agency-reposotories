# UI Component Library

Reusable, accessible UI primitives for the Bealer Agency Todo List. All components use CSS custom properties from the design system defined in `globals.css`.

---

## Table of Contents

- [Button](#button)
- [Card](#card)
- [Badge](#badge)
- [Skeleton](#skeleton)
- [Modal](#modal)
- [Toast](#toast)
- [Tooltip](#tooltip)
- [Design Tokens](#design-tokens)
- [Accessibility](#accessibility)

---

## Button

**File:** `Button.tsx`

A versatile button component with 4 core variants, 3 sizes, loading state, and icon support. Available in standard, icon-only, and motion-enhanced versions.

### Variants

| Variant | Use Case | Appearance |
|---------|----------|------------|
| `primary` | Main actions, CTAs | Brand blue gradient, white text |
| `secondary` | Cancel, back, secondary actions | Light fill with border |
| `danger` | Delete, remove, destructive actions | Red background, white text |
| `ghost` | Tertiary actions, minimal UI | Text-only, subtle hover |

### Props (ButtonProps)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size (36px / 44px / 52px min-height) |
| `loading` | `boolean` | `false` | Shows spinner, disables button |
| `leftIcon` | `ReactNode` | - | Icon before text |
| `rightIcon` | `ReactNode` | - | Icon after text |
| `fullWidth` | `boolean` | `false` | Stretches to fill container |
| `disabled` | `boolean` | `false` | Disables interaction |

### Standardized Interaction States

All variants share these interaction patterns:

```
Hover:    brightness-105, -translate-y-px, shadow-lg
Active:   scale-[0.98], translate-y-px, shadow-sm
Transition: all duration-150 ease-out
Focus:    ring-2 ring-accent ring-offset-2
```

### Usage Examples

```tsx
import { Button, IconButton, MotionButton } from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';

// Primary CTA
<Button variant="primary" onClick={handleSave}>
  Save Task
</Button>

// Secondary with icon
<Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>
  Add Item
</Button>

// Danger with loading
<Button variant="danger" loading={isDeleting} onClick={handleDelete}>
  Delete
</Button>

// Ghost (minimal)
<Button variant="ghost" size="sm">
  Cancel
</Button>

// Icon-only button
<IconButton
  icon={<Trash2 className="w-5 h-5" />}
  aria-label="Delete task"
  variant="danger"
/>

// Motion-enhanced (Framer Motion)
<MotionButton variant="primary" size="lg" fullWidth>
  Get Started
</MotionButton>
```

### Do's and Don'ts

- **Do** use `primary` for the single most important action on a page.
- **Do** use `danger` only for destructive/irreversible actions.
- **Do** always provide `aria-label` for `IconButton`.
- **Don't** use multiple `primary` buttons in the same section.
- **Don't** use `ghost` for important actions that users must notice.

---

## Card

**File:** `Card.tsx`

A container component with compound sub-components for structured layouts.

### Variants

| Variant | Description |
|---------|-------------|
| `default` | Standard card with subtle border |
| `elevated` | Raised with shadow, hover effect |
| `glass` | Frosted glass with backdrop blur |
| `glassPremium` | Enhanced glass with inner glow |

### Props (CardProps)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'glass' \| 'glassPremium'` | `'default'` | Visual style |
| `interactive` | `boolean` | `false` | Adds hover lift + cursor pointer |
| `selected` | `boolean` | `false` | Accent border + ring |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding |
| `radius` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'lg'` | Border radius |
| `as` | `'div' \| 'article' \| 'section' \| 'aside'` | `'div'` | Semantic HTML element |

### Compound Components

- `<CardHeader bordered?>` - Top section with optional bottom border
- `<CardBody>` - Main content area
- `<CardFooter bordered?>` - Bottom section with optional top border

Padding is inherited from the parent `<Card>` context.

### Usage Examples

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

// Simple card
<Card variant="elevated">
  <p>Card content here</p>
</Card>

// Structured card
<Card variant="glass" padding="lg">
  <CardHeader bordered>
    <h3>Task Details</h3>
  </CardHeader>
  <CardBody>
    <p>Main content</p>
  </CardBody>
  <CardFooter bordered>
    <Button>Save</Button>
  </CardFooter>
</Card>

// Interactive card
<Card variant="default" interactive onClick={handleClick}>
  Clickable card with hover lift
</Card>
```

### Accessibility Notes

- Interactive cards automatically get `role="button"` and `tabIndex={0}`.
- Use `as="article"` for content cards, `as="section"` for grouped sections.

---

## Badge

**File:** `Badge.tsx`

Status indicators, labels, and count badges with optional animations.

### Variants

| Variant | Color | Use Case |
|---------|-------|----------|
| `default` | Muted gray | Neutral labels |
| `primary` | Brand accent | Active/selected states |
| `success` | Green | Completed, online |
| `warning` | Amber | In progress, attention |
| `danger` | Red | Errors, overdue |
| `info` | Sky blue | Informational |
| `brand` | Brand gradient | Branding elements |

### Props (BadgeProps)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | See variants above | `'default'` | Color scheme |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Badge size |
| `pulse` | `boolean` | `false` | Pulsing animation for attention |
| `dot` | `boolean` | `false` | Show status dot before text |
| `dotColor` | `string` | - | Custom dot color |
| `icon` | `ReactNode` | - | Icon before text |
| `interactive` | `boolean` | `false` | Adds hover/active states |

### Specialized Variants

```tsx
// Animated entrance/exit
<AnimatedBadge show={isVisible} variant="success">New</AnimatedBadge>

// Notification count
<CountBadge count={5} max={99} variant="danger" />

// Status presets
<StatusBadge status="online" />      // Green dot + "Online"
<StatusBadge status="in_progress" />  // Amber dot + "In Progress"
<StatusBadge status="done" />         // Green dot + "Done"
```

### Usage Examples

```tsx
import { Badge, CountBadge, StatusBadge } from '@/components/ui/Badge';
import { Clock } from 'lucide-react';

<Badge variant="warning" dot pulse>Overdue</Badge>
<Badge variant="success" icon={<Clock className="w-3 h-3" />}>On Time</Badge>
<Badge variant="danger" size="sm">Urgent</Badge>
```

---

## Skeleton

**File:** `Skeleton.tsx`

Loading placeholders that match component layouts. Automatically respects `prefers-reduced-motion`.

### Base Skeleton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'text' \| 'circle' \| 'rectangle' \| 'card'` | `'rectangle'` | Shape preset |
| `width` | `string \| number` | Varies by variant | CSS width |
| `height` | `string \| number` | Varies by variant | CSS height |
| `borderRadius` | `string \| number` | Varies by variant | Corner radius |
| `animate` | `boolean` | `true` | Enable shimmer animation |

### Specialized Skeleton Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `SkeletonText` | Multi-line text placeholder | `lines`, `gap`, `lastLineWidth` |
| `SkeletonAvatar` | Circular avatar | `size: 'sm' \| 'md' \| 'lg' \| 'xl' \| number` |
| `SkeletonButton` | Button placeholder | `size`, `fullWidth` |
| `SkeletonCard` | Card with header/content/footer | `showHeader`, `showAvatar`, `contentLines`, `showFooter` |
| `SkeletonTodoItem` | TodoItem layout match | `showSubtasks`, `expanded`, `showActions` |
| `SkeletonList` | Multiple skeleton items | `count`, `variant: 'todo' \| 'card'` |
| `SkeletonInline` | Icon + text inline | `showIcon`, `iconSize`, `textWidth` |

### Usage Examples

```tsx
import { Skeleton, SkeletonTodoItem, SkeletonList } from '@/components/ui/Skeleton';

// Basic shapes
<Skeleton variant="text" width="60%" />
<Skeleton variant="circle" width={40} />

// Loading task list
<SkeletonList count={5} variant="todo" />

// Custom card skeleton
<SkeletonCard showHeader showFooter contentLines={2} />
```

### Accessibility Notes

- All skeletons have `aria-hidden="true"` and `role="presentation"`.
- Animation automatically disabled when `prefers-reduced-motion: reduce` is set.

---

## Modal

**File:** `Modal.tsx`

Accessible modal dialog with focus trapping, backdrop click, and keyboard support.

### Props (ModalProps)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close callback |
| `title` | `string` | - | Accessible title (aria-labelledby) |
| `description` | `string` | - | Accessible description |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Width preset |
| `showCloseButton` | `boolean` | `true` | Show X button |
| `closeOnBackdropClick` | `boolean` | `true` | Click outside to close |
| `closeOnEscape` | `boolean` | `true` | Press Escape to close |

### Usage Examples

```tsx
import { Modal } from '@/components/ui/Modal';

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm Delete">
  <p>Are you sure you want to delete this task?</p>
  <div className="flex gap-2 mt-4">
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
  </div>
</Modal>
```

### Accessibility Notes

- Focus is trapped within the modal when open.
- Focus returns to trigger element on close.
- Uses `role="dialog"` with `aria-labelledby` and `aria-describedby`.

---

## Toast

**File:** `Toast.tsx`

Non-blocking notification system with context provider.

### Toast Variants

| Variant | Icon | Use Case |
|---------|------|----------|
| `success` | CheckCircle | Confirmation of actions |
| `error` | AlertCircle | Error messages |
| `warning` | AlertTriangle | Warnings |
| `info` | Info | Informational notices |
| `loading` | Spinner | Async operation in progress |

### Context API

```tsx
import { useToast, ToastProvider } from '@/components/ui/Toast';

// Wrap app
<ToastProvider position="top-right">
  <App />
</ToastProvider>

// Use in components
const { addToast, dismissToast, updateToast } = useToast();

addToast({
  variant: 'success',
  title: 'Task created',
  description: 'Your task has been saved.',
  duration: 4000,
});
```

---

## Tooltip

**File:** `Tooltip.tsx`

Lightweight tooltip with portal rendering and automatic positioning.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `ReactNode` | required | Tooltip content |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Placement |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment |
| `delay` | `number` | `200` | Show delay in ms |

### Usage

```tsx
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content="Delete this task" position="top">
  <IconButton icon={<Trash2 />} aria-label="Delete" />
</Tooltip>
```

---

## Design Tokens

All components reference CSS custom properties rather than hardcoded values.

### Colors

```css
/* Semantic */
--accent          /* Brand primary */
--success         /* Green - positive */
--warning         /* Amber - caution */
--danger          /* Red - destructive */

/* Surfaces */
--surface         /* Card/panel background */
--surface-2       /* Slightly darker */
--surface-3       /* Hover state */
--border          /* Default borders */
--border-subtle   /* Subtle borders */
```

### Border Radius

```css
--radius-sm: 6px    /* Small elements (badges, checkboxes) */
--radius-md: 10px   /* Medium elements (inputs, small cards) */
--radius-lg: 14px   /* Large elements (cards, modals) */
--radius-xl: 20px   /* Extra large (dashboard cards) */
--radius-2xl: 28px  /* Hero elements */
```

### Shadows

```css
--shadow-sm   /* Subtle depth */
--shadow-md   /* Standard cards */
--shadow-lg   /* Elevated elements, hover states */
--shadow-xl   /* Modals, popovers */
```

### Spacing Scale

```css
--space-1: 4px   --space-2: 8px   --space-3: 12px
--space-4: 16px  --space-5: 20px  --space-6: 24px
--space-8: 32px  --space-10: 40px --space-12: 48px
```

---

## Accessibility

### Reduced Motion

All CSS animations (`@keyframes`) are disabled when `prefers-reduced-motion: reduce` is enabled. Framer Motion animations use `prefersReducedMotion()` from `@/lib/animations` to conditionally disable.

Affected animations:
- Shimmer/skeleton pulse
- Float (empty state illustrations)
- Pulse glow (priority badges, status dots)
- Spin (loading spinners)
- Shake/wiggle (form errors)
- Hover transforms (lift, scale)
- Gradient shifts
- Notification highlight

### Focus Management

- All interactive elements have visible focus rings via `focus-visible`.
- Buttons: `ring-2 ring-accent ring-offset-2`
- Inputs: `border-accent + box-shadow ring`
- Cards (interactive): `outline + inset shadow`

### Keyboard Support

- Buttons respond to `Enter` and `Space`.
- Modals trap focus and close on `Escape`.
- Interactive cards are focusable with `tabIndex={0}`.

### Color Contrast

- Text on surfaces meets WCAG 2.1 AA (4.5:1 minimum).
- `--text-muted` is calibrated for 5.5:1 contrast on white backgrounds.
- All semantic colors (success, warning, danger) have light background variants for badges.

---

## File Index

| File | Exports |
|------|---------|
| `Button.tsx` | `Button`, `IconButton`, `MotionButton`, `MotionIconButton`, `ButtonVariant` |
| `Card.tsx` | `Card`, `CardHeader`, `CardBody`, `CardFooter` |
| `Badge.tsx` | `Badge`, `AnimatedBadge`, `CountBadge`, `StatusBadge` |
| `Skeleton.tsx` | `Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonButton`, `SkeletonCard`, `SkeletonTodoItem`, `SkeletonList`, `SkeletonInline` |
| `Modal.tsx` | `Modal` |
| `Toast.tsx` | `ToastProvider`, `useToast`, `Toast` |
| `Tooltip.tsx` | `Tooltip` |
| `Avatar.tsx` | `Avatar` |
| `ProgressRing.tsx` | `ProgressRing` |
| `AnimatedList.tsx` | `AnimatedList` |
| `AnimatedCheckbox.tsx` | `AnimatedCheckbox` |
| `CountUp.tsx` | `CountUp` |
