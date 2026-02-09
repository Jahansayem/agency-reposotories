'use client';

/**
 * Customer Lookup View
 *
 * Standalone view for browsing and searching customers from book of business.
 * Provides customer search, filtering by segment and opportunity type, sorting,
 * and access to customer details.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  X,
  TrendingUp,
  Loader2,
  Home,
  Car,
  Heart,
  Umbrella,
  Package,
  ChevronDown,
  ChevronLeft,
  Flame,
  DollarSign,
  ArrowUpDown,
  Target,
} from 'lucide-react';
import { useCustomerSearch, useCustomerList } from '@/hooks/useCustomers';
import { CustomerCard } from '../customer/CustomerCard';
import { CustomerDetailPanel } from '../customer/CustomerDetailPanel';
import type { Customer, CustomerSegment, OpportunityType, CustomerSortOption } from '@/types/customer';
import { SEGMENT_CONFIGS } from '@/constants/customerSegments';

interface CustomerLookupViewProps {
  agencyId?: string;
  currentUser: string;
  onClose?: () => void;
  initialSegment?: CustomerSegment | 'all'; // For navigation from segmentation dashboard
  initialSort?: CustomerSortOption; // For navigation from TodayOpportunitiesPanel
  onTaskClick?: (taskId: string) => void;  // Navigate to task in tasks view
  onNavigateBack?: () => void;  // Go back to previous view (analytics)
  onInitialSegmentApplied?: () => void;  // Called after initial segment filter is consumed
}

// Customer value tier filters - dynamically generated from SEGMENT_CONFIGS
const SEGMENT_FILTERS: { value: CustomerSegment | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Tiers', icon: <Users className="w-4 h-4" /> },
  ...Object.values(SEGMENT_CONFIGS).map(config => {
    const IconComponent = config.icon;
    return {
      value: config.segment,
      label: config.label,
      icon: <IconComponent className={`w-4 h-4 ${config.text}`} />
    };
  })
];

// Cross-sell opportunity type filters
const OPPORTUNITY_TYPE_FILTERS: { value: OpportunityType | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All Opps', icon: <TrendingUp className="w-4 h-4" />, color: '' },
  { value: 'auto_to_home', label: 'Need Home', icon: <Home className="w-4 h-4" />, color: 'text-emerald-500' },
  { value: 'home_to_auto', label: 'Need Auto', icon: <Car className="w-4 h-4" />, color: 'text-blue-500' },
  { value: 'add_life', label: 'Add Life', icon: <Heart className="w-4 h-4" />, color: 'text-pink-500' },
  { value: 'add_umbrella', label: 'Add Umbrella', icon: <Umbrella className="w-4 h-4" />, color: 'text-purple-500' },
  { value: 'mono_to_bundle', label: 'Bundle', icon: <Package className="w-4 h-4" />, color: 'text-orange-500' },
];

// Sort options
const SORT_OPTIONS: { value: CustomerSortOption; label: string }[] = [
  { value: 'priority', label: 'Priority (Hot First)' },
  { value: 'premium_high', label: 'Premium (High to Low)' },
  { value: 'premium_low', label: 'Premium (Low to High)' },
  { value: 'opportunity_value', label: 'Opportunity Value' },
  { value: 'renewal_date', label: 'Renewal Date (Soonest)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
];

// Format currency helper
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

export function CustomerLookupView({
  agencyId,
  currentUser,
  onClose,
  initialSegment = 'all',
  initialSort = 'priority',
  onTaskClick,
  onNavigateBack,
  onInitialSegmentApplied,
}: CustomerLookupViewProps) {
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>(initialSegment);
  const [selectedOpportunityType, setSelectedOpportunityType] = useState<OpportunityType | 'all'>('all');
  const [sortBy, setSortBy] = useState<CustomerSortOption>(initialSort);

  // Sync filter state when navigating from other views (props change on re-navigation)
  useEffect(() => {
    setSelectedSegment(initialSegment);
    if (onInitialSegmentApplied) {
      onInitialSegmentApplied();
    }
  }, [initialSegment, onInitialSegmentApplied]);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(false);

  // Search hook for search input
  const {
    query,
    setQuery,
    customers: searchResults,
    loading: searchLoading,
    clear: clearSearch,
  } = useCustomerSearch({ agencyId, limit: 20 });

  // List hook for browsing (when no search query)
  const {
    customers: allCustomers,
    stats,
    loading: listLoading,
    loadingMore,
    hasMore,
    loadMore,
  } = useCustomerList({
    agencyId,
    segment: selectedSegment === 'all' ? undefined : selectedSegment,
    opportunityType: selectedOpportunityType,
    sortBy,
    limit: 50,
  });

  // Determine which customers to show
  // Filter search results by segment and opportunity type
  let filteredSearchResults = searchResults;
  if (selectedSegment !== 'all') {
    filteredSearchResults = filteredSearchResults.filter(c => c.segment === selectedSegment);
  }
  if (selectedOpportunityType !== 'all') {
    filteredSearchResults = filteredSearchResults.filter(c => c.opportunityType === selectedOpportunityType);
  }
  // Apply "Due Today" filter if enabled
  if (showDueTodayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredSearchResults = filteredSearchResults.filter(c => {
      if (!c.upcomingRenewal) return false;
      const renewalDate = new Date(c.upcomingRenewal);
      renewalDate.setHours(0, 0, 0, 0);
      return renewalDate.getTime() === today.getTime();
    });
  }

  // Apply "Due Today" filter to browse results as well
  let displayBrowseCustomers = allCustomers;
  if (showDueTodayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    displayBrowseCustomers = displayBrowseCustomers.filter(c => {
      if (!c.upcomingRenewal) return false;
      const renewalDate = new Date(c.upcomingRenewal);
      renewalDate.setHours(0, 0, 0, 0);
      return renewalDate.getTime() === today.getTime();
    });
  }

  const displayCustomers = query.length >= 2 ? filteredSearchResults : displayBrowseCustomers;
  const isLoading = query.length >= 2 ? searchLoading : listLoading;

  // Handle customer selection
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
  }, []);

  // Handle closing detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedCustomerId(null);
  }, []);

  // Get sort option label
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort';

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Customer Lookup
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Browse your book of business
            </p>
          </div>
          {(onNavigateBack || onClose) && (
            <button
              onClick={onNavigateBack || onClose}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search input with sort dropdown */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers by name..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{currentSortLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showSortDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] transition-colors ${
                        sortBy === option.value ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium' : 'text-[var(--foreground)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer tier filter chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {SEGMENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedSegment(filter.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                selectedSegment === filter.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Opportunity type filter chips */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-xs text-[var(--text-muted)] font-medium flex-shrink-0">Cross-sell:</span>
          {OPPORTUNITY_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedOpportunityType(filter.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                selectedOpportunityType === filter.value
                  ? 'bg-[var(--accent)] text-white'
                  : `bg-[var(--surface-2)] ${filter.color || 'text-[var(--text-muted)]'} hover:text-[var(--foreground)]`
              }`}
            >
              <span className={selectedOpportunityType === filter.value ? '' : filter.color}>
                {filter.icon}
              </span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Due Today quick filter */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => {
              setShowDueTodayOnly(!showDueTodayOnly);
              // When enabling "Due Today", automatically sort by renewal date for best UX
              if (!showDueTodayOnly) {
                setSortBy('renewal_date');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              showDueTodayOnly
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/50 animate-pulse'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-rose-500/20 hover:text-rose-500 border border-transparent hover:border-rose-500/30'
            }`}
          >
            <Flame className="w-4 h-4" />
            {showDueTodayOnly ? '🔥 Due Today (Active)' : 'Due Today'}
          </button>
          {showDueTodayOnly && (
            <span className="text-xs text-rose-400 font-medium animate-pulse">
              Showing only opportunities renewing TODAY
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Stats bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Customers */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--surface-2)]">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--foreground)]">{stats?.total || 0}</div>
              <div className="text-xs text-[var(--text-muted)]">Customers</div>
            </div>
          </div>

          {/* Book Value */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats?.totalPremium || 0)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Book Value</div>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Flame className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--foreground)]">
                {stats?.hotCount || 0}
                {stats?.highCount ? <span className="text-sm font-normal text-[var(--text-muted)]"> + {stats.highCount}</span> : null}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Hot + High</div>
            </div>
          </div>

          {/* Potential Revenue */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                +{formatCurrency(stats?.potentialPremiumAdd || 0)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Potential Add</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        {/* Customer list */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 ${selectedCustomerId ? 'hidden lg:block lg:w-1/2' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="ml-2 text-[var(--text-muted)]">Loading customers...</span>
            </div>
          ) : displayCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-50 mb-3" />
              {query.length >= 2 ? (
                // Search with no results
                <>
                  <p className="text-[var(--foreground)] font-medium mb-1">
                    No customers found for &quot;{query}&quot;
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    {query.match(/^[a-zA-Z\s]+$/)
                      ? 'Try searching by phone number or email instead'
                      : 'Try a different search term'}
                  </p>
                  <button
                    onClick={clearSearch}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear search
                  </button>
                </>
              ) : selectedSegment !== 'all' || selectedOpportunityType !== 'all' ? (
                // Segment or opportunity filter with no results
                <>
                  <p className="text-[var(--foreground)] font-medium mb-1">
                    No customers match your filters
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Try different filter combinations or clear all filters
                  </p>
                  <button
                    onClick={() => {
                      setSelectedSegment('all');
                      setSelectedOpportunityType('all');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Clear all filters
                  </button>
                </>
              ) : (
                // General empty (no customers at all)
                <>
                  <p className="text-[var(--foreground)] font-medium mb-1">
                    No customers in your book of business yet
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Customers will appear here as you add them to your agency
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {displayCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <CustomerCard
                      customer={customer}
                      onClick={() => handleSelectCustomer(customer)}
                      showActions={false}
                      className={selectedCustomerId === customer.id ? 'ring-2 ring-[var(--accent)]' : ''}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Load More button - only show when browsing (not searching) and there are more results */}
              {query.length < 2 && hasMore && (
                <div className="flex justify-center pt-4 pb-2">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--surface-2)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Load More Customers
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer detail panel */}
        <AnimatePresence>
          {selectedCustomerId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) handleCloseDetail();
              }}
              className="w-full lg:w-1/2 border-l border-[var(--border)] bg-[var(--surface)] overflow-y-auto"
            >
              {/* Mobile drag handle */}
              <div className="lg:hidden flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
              </div>

              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
                {/* Mobile: Back button with count */}
                <button
                  onClick={handleCloseDetail}
                  className="lg:hidden flex items-center gap-1 text-[var(--accent)] font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back ({displayCustomers.length})</span>
                </button>

                {/* Desktop: Title */}
                <h2 className="hidden lg:block font-semibold text-[var(--foreground)]">Customer Details</h2>

                {/* Desktop: Close button */}
                <button
                  onClick={handleCloseDetail}
                  className="hidden lg:block p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
                  aria-label="Close customer details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <CustomerDetailPanel
                  customerId={selectedCustomerId}
                  currentUser={currentUser}
                  onViewTask={(taskId) => {
                    onTaskClick?.(taskId);
                  }}
                  onCreateTask={(taskId) => {
                    onTaskClick?.(taskId);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CustomerLookupView;
