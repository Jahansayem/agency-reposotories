'use client';

/**
 * Customer Lookup View
 *
 * Standalone view for browsing and searching customers from book of business.
 * Provides customer search, filtering by segment, and access to customer details.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Users,
  Crown,
  Star,
  Shield,
  X,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCustomerSearch, useCustomerList } from '@/hooks/useCustomers';
import { CustomerCard } from '../customer/CustomerCard';
import { CustomerDetailPanel } from '../customer/CustomerDetailPanel';
import type { Customer, CustomerSegment } from '@/types/customer';

interface CustomerLookupViewProps {
  agencyId?: string;
  currentUser: string;
  onClose?: () => void;
}

const SEGMENT_FILTERS: { value: CustomerSegment | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Customers', icon: <Users className="w-4 h-4" /> },
  { value: 'elite', label: 'Elite', icon: <Crown className="w-4 h-4 text-amber-500" /> },
  { value: 'premium', label: 'Premium', icon: <Star className="w-4 h-4 text-purple-500" /> },
  { value: 'standard', label: 'Standard', icon: <Shield className="w-4 h-4 text-blue-500" /> },
  { value: 'entry', label: 'Entry', icon: <Users className="w-4 h-4 text-sky-500" /> },
];

export function CustomerLookupView({
  agencyId,
  currentUser,
  onClose,
}: CustomerLookupViewProps) {
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | 'all'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    loading: listLoading,
  } = useCustomerList({
    agencyId,
    segment: selectedSegment === 'all' ? undefined : selectedSegment,
    limit: 50,
  });

  // Determine which customers to show
  const displayCustomers = query.length >= 2 ? searchResults : allCustomers;
  const isLoading = query.length >= 2 ? searchLoading : listLoading;

  // Handle customer selection
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
  }, []);

  // Handle closing detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedCustomerId(null);
  }, []);

  // Stats summary
  const stats = {
    total: allCustomers.length,
    elite: allCustomers.filter(c => c.segment === 'elite').length,
    premium: allCustomers.filter(c => c.segment === 'premium').length,
    withOpportunities: allCustomers.filter(c => c.hasOpportunity).length,
  };

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
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers by name, phone, or email..."
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

        {/* Segment filter chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
              showFilters
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>

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
      </div>

      {/* Stats bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-[var(--surface-2)]/50 border-b border-[var(--border)]">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--foreground)]">{stats.total}</span> customers
          </span>
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-[var(--foreground)]">{stats.elite}</span> elite
          </span>
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-[var(--foreground)]">{stats.withOpportunities}</span> opportunities
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        {/* Customer list */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${selectedCustomerId ? 'hidden lg:block lg:w-1/2' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="ml-2 text-[var(--text-muted)]">Loading customers...</span>
            </div>
          ) : displayCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-50 mb-3" />
              <p className="text-[var(--text-muted)]">
                {query.length >= 2
                  ? `No customers found for "${query}"`
                  : 'No customers in this segment'}
              </p>
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
              className="w-full lg:w-1/2 border-l border-[var(--border)] bg-[var(--surface)] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
                <h2 className="font-semibold text-[var(--foreground)]">Customer Details</h2>
                <button
                  onClick={handleCloseDetail}
                  className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <CustomerDetailPanel
                  customerId={selectedCustomerId}
                  currentUser={currentUser}
                  onViewTask={(taskId) => {
                    // Could navigate to task detail
                    console.log('View task:', taskId);
                  }}
                  onCreateTask={(taskId) => {
                    // Could navigate to newly created task
                    console.log('Created task:', taskId);
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
