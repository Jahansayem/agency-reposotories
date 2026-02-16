'use client';

/**
 * Customer Search Input
 *
 * Autocomplete search input for finding customers from the book of business.
 * Shows customer name, segment, and premium in dropdown results.
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, User, Phone, DollarSign } from 'lucide-react';
import { useCustomerSearch } from '@/hooks/useCustomers';
import type { Customer, LinkedCustomer } from '@/types/customer';

interface CustomerSearchInputProps {
  value: LinkedCustomer | null;
  onChange: (customer: LinkedCustomer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  agencyId?: string;
  className?: string;
}

export function CustomerSearchInput({
  value,
  onChange,
  placeholder = 'Search customers...',
  disabled = false,
  agencyId,
  className = '',
}: CustomerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    customers,
    loading,
    clear,
  } = useCustomerSearch({ agencyId, limit: 8 });

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when typing
  useEffect(() => {
    if (query.length >= 2 && focused) {
      setIsOpen(true);
    }
  }, [query, focused]);

  const handleSelect = (customer: Customer) => {
    onChange({
      id: customer.id,
      name: customer.name,
      segment: customer.segment,
      phone: customer.phone || undefined,
      email: customer.email || undefined,
    });
    setIsOpen(false);
    clear();
  };

  const handleClear = () => {
    onChange(null);
    clear();
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (value) {
      // Clear selected customer when user starts typing
      onChange(null);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Customer Display */}
      {value && !focused ? (
        <div className="flex items-center gap-2 p-2 border border-[var(--border)] rounded-lg bg-[var(--surface-2)]">
          <User className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="flex-1 text-sm font-medium text-[var(--foreground)] truncate">
            {value.name}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-[var(--text-light)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className="
              w-full pl-10 pr-10 py-2 text-sm
              border border-[var(--border)] rounded-lg
              bg-[var(--surface)]
              text-[var(--foreground)]
              placeholder-[var(--text-light)]
              focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-light)] hover:text-[var(--foreground)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && customers.length > 0 && (
        <div className="
          absolute z-50 w-full mt-1
          bg-[var(--surface)]
          border border-[var(--border)]
          rounded-lg shadow-lg
          max-h-[300px] overflow-y-auto
        ">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelect(customer)}
              className="
                w-full px-3 py-2 text-left
                hover:bg-[var(--surface-2)]
                border-b border-[var(--border)] last:border-0
                transition-colors
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--foreground)] truncate">
                      {customer.name}
                    </span>
                    {customer.hasOpportunity && customer.priorityTier && (
                      <span className={`
                        px-1.5 py-0.5 text-xs font-medium rounded
                        ${customer.priorityTier === 'HOT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          customer.priorityTier === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}
                      `}>
                        {customer.priorityTier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${customer.totalPremium.toLocaleString()}/yr
                    </span>
                    <span>{customer.policyCount} {customer.policyCount === 1 ? 'policy' : 'policies'}</span>
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                  {customer.recommendedProduct && (
                    <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Opportunity: {customer.recommendedProduct}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && customers.length === 0 && !loading && (
        <div className="
          absolute z-50 w-full mt-1 p-4
          bg-[var(--surface)]
          border border-[var(--border)]
          rounded-lg shadow-lg text-center
        ">
          <User className="w-8 h-8 mx-auto text-[var(--text-light)] mb-2" />
          <p className="text-sm text-[var(--text-muted)]">
            No customers found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomerSearchInput;
