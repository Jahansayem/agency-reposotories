'use client';

/**
 * Quick Add Customer Form
 *
 * Inline form that appears in the CustomerSearchInput dropdown when no
 * results are found. Allows agents to quickly create a new customer record
 * without leaving the current workflow.
 *
 * On submit, POSTs to /api/customers, adds the customer to the
 * newCustomerStore for eAgent import tracking, and auto-selects the
 * newly created customer in the search input.
 */

import { useState } from 'react';
import { UserPlus, Phone, Shield, Loader2 } from 'lucide-react';
import { useNewCustomerStore } from '@/store/newCustomerStore';
import type { LinkedCustomer } from '@/types/customer';

const POLICY_TYPES = [
  { value: '', label: 'Select policy type...' },
  { value: 'auto', label: 'Auto' },
  { value: 'home', label: 'Home' },
  { value: 'life', label: 'Life' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'commercial', label: 'Commercial' },
] as const;

interface QuickAddCustomerFormProps {
  initialName: string;
  onCustomerCreated: (customer: LinkedCustomer) => void;
  onCancel: () => void;
}

export function QuickAddCustomerForm({
  initialName,
  onCustomerCreated,
  onCancel,
}: QuickAddCustomerFormProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [policyType, setPolicyType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCustomer = useNewCustomerStore((state) => state.addCustomer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Customer name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: trimmedName,
          phone: phone.trim() || undefined,
          policy_type: policyType || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create customer');
      }

      const data = await response.json();
      const newCustomer = data.customer;

      // Track in localStorage store for eAgent import
      addCustomer({
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone || undefined,
        policyType: policyType || undefined,
      });

      // Auto-select the new customer in the search input
      onCustomerCreated({
        id: newCustomer.id,
        name: newCustomer.name,
        segment: newCustomer.segment || 'entry',
        phone: newCustomer.phone || undefined,
        email: newCustomer.email || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--foreground)]">
          New Customer
        </span>
      </div>

      {/* Name input */}
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          autoFocus
          className="
            w-full px-2.5 py-1.5 text-sm
            border border-[var(--border)] rounded-md
            bg-[var(--surface)]
            text-[var(--foreground)]
            placeholder-[var(--text-light)]
            focus:ring-1 focus:ring-[var(--accent)] focus:border-transparent
          "
        />
      </div>

      {/* Phone input */}
      <div className="relative">
        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-light)]" />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="
            w-full pl-8 pr-2.5 py-1.5 text-sm
            border border-[var(--border)] rounded-md
            bg-[var(--surface)]
            text-[var(--foreground)]
            placeholder-[var(--text-light)]
            focus:ring-1 focus:ring-[var(--accent)] focus:border-transparent
          "
        />
      </div>

      {/* Policy type select */}
      <div className="relative">
        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-light)]" />
        <select
          value={policyType}
          onChange={(e) => setPolicyType(e.target.value)}
          className="
            w-full pl-8 pr-2.5 py-1.5 text-sm appearance-none
            border border-[var(--border)] rounded-md
            bg-[var(--surface)]
            text-[var(--foreground)]
            focus:ring-1 focus:ring-[var(--accent)] focus:border-transparent
          "
        >
          {POLICY_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="
            flex-1 flex items-center justify-center gap-1.5
            px-3 py-1.5 text-xs font-medium
            bg-[var(--accent)] text-white
            rounded-md
            hover:opacity-90 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {submitting ? 'Adding...' : 'Add Customer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="
            px-3 py-1.5 text-xs font-medium
            text-[var(--text-muted)]
            border border-[var(--border)] rounded-md
            hover:bg-[var(--surface-2)] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default QuickAddCustomerForm;
