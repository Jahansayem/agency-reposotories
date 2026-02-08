/**
 * Customer Components
 *
 * Components for customer lookup and display from book of business.
 */

// Badge components
export { CustomerBadge, SegmentIndicator } from './CustomerBadge';

// Search
export { CustomerSearchInput } from './CustomerSearchInput';

// Cards
export { CustomerCard, CustomerMiniCard } from './CustomerCard';

// Detail panel
export { CustomerDetailPanel } from './CustomerDetailPanel';

// Re-export types
export type {
  Customer,
  CustomerDetail,
  CustomerSegment,
  CustomerOpportunity,
  CustomerTask,
  LinkedCustomer,
  SegmentConfig,
  SEGMENT_CONFIG,
} from '@/types/customer';
