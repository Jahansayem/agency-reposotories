'use client';

/**
 * Customer Card
 *
 * Compact card showing customer info with quick actions.
 * Used in search results, lists, and task detail panels.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Check,
  Flame,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Customer, CustomerDetail } from '@/types/customer';

interface CustomerCardProps {
  customer: Customer | CustomerDetail;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function CustomerCard({
  customer,
  onClick,
  showActions = true,
  compact = false,
  className = '',
}: CustomerCardProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const toast = useToast();

  // Check if device has hover capability (desktop) vs touch-only (mobile)
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const handlePhoneClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>, phone: string) => {
    e.stopPropagation(); // Prevent card click when clicking phone

    // On desktop, copy to clipboard instead of opening tel: link
    if (isDesktop) {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(phone);
        setCopiedPhone(true);
        toast.success('Phone number copied!', { duration: 2000 });
        setTimeout(() => setCopiedPhone(false), 2000);
      } catch (err) {
        console.error('Failed to copy phone number:', err);
        toast.error('Failed to copy phone number');
      }
    }
    // On mobile, let the tel: link work normally
  }, [isDesktop, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Priority-based styling for visual hierarchy
  const getPriorityStyles = () => {
    if (!customer.hasOpportunity || !customer.priorityTier) return '';
    switch (customer.priorityTier) {
      case 'HOT':
        return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case 'HIGH':
        return 'border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-900/10';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-[var(--surface)]
        border border-[var(--border)]
        rounded-lg overflow-hidden
        ${getPriorityStyles()}
        ${onClick ? 'cursor-pointer hover:border-[var(--accent)] transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-[var(--foreground)] truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {customer.name}
              </h3>
              {customer.hasOpportunity && customer.priorityTier && (
                customer.priorityTier === 'HOT' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-md shadow-sm">
                    <Flame className="w-3 h-3" />
                    HOT
                  </span>
                ) : (
                  <span className={`
                    px-1.5 py-0.5 text-xs font-medium rounded
                    ${customer.priorityTier === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      customer.priorityTier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-[var(--surface-2)] text-[var(--foreground)]'}
                  `}>
                    {customer.priorityTier}
                  </span>
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--foreground)]">
                {formatCurrency(customer.totalPremium)}/yr
              </span>
              <span>{customer.policyCount} {customer.policyCount === 1 ? 'policy' : 'policies'}</span>
              {customer.tenureYears > 0 && (
                <span>{customer.tenureYears} {customer.tenureYears === 1 ? 'year' : 'years'}</span>
              )}
            </div>
          </div>

          {onClick && (
            <ChevronRight className="w-5 h-5 text-[var(--text-light)] flex-shrink-0" />
          )}
        </div>

        {/* Products */}
        {customer.products.length > 0 && !compact && (
          <div className="mt-2 flex flex-wrap gap-1">
            {customer.products.slice(0, 4).map((product, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-[var(--surface-2)] text-[var(--foreground)] rounded"
              >
                {product}
              </span>
            ))}
            {customer.products.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-[var(--text-light)]">
                +{customer.products.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Opportunity */}
        {customer.recommendedProduct && !compact && (
          <div className="mt-2 p-2 bg-[var(--accent)]/10 rounded-lg">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-medium">Opportunity:</span>
                <span>{customer.recommendedProduct}</span>
              </div>
              {customer.potentialPremiumAdd && customer.potentialPremiumAdd > 0 && (
                <span className="font-semibold text-green-600 dark:text-green-400">
                  +{formatCurrency(customer.potentialPremiumAdd)}/yr
                </span>
              )}
            </div>
          </div>
        )}

        {/* Renewal Warning */}
        {customer.upcomingRenewal && !compact && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Renewal: {formatDate(customer.upcomingRenewal)}</span>
          </div>
        )}

        {/* Retention Risk */}
        {customer.retentionRisk !== 'low' && !compact && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Retention risk: {customer.retentionRisk}</span>
          </div>
        )}

        {/* Quick Actions */}
        {showActions && (customer.phone || customer.email) && !compact && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                onClick={(e) => handlePhoneClick(e, customer.phone!)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg hover:bg-[var(--accent)]/20 transition-colors"
                title={isDesktop ? 'Click to copy' : 'Click to call'}
              >
                {copiedPhone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )}
                {copiedPhone ? 'Copied!' : 'Call'}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Mini customer card for inline display
 */
export function CustomerMiniCard({
  customer,
  onClick,
}: {
  customer: Customer | { name: string; segment: string; phone?: string };
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-2 py-1
        bg-[var(--surface-2)]
        border border-[var(--border)]
        rounded-lg text-left
        ${onClick ? 'hover:border-[var(--accent)] cursor-pointer' : ''}
        transition-colors
      `}
    >
      <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[150px]">
        {customer.name}
      </span>
      {onClick && <ExternalLink className="w-3 h-3 text-[var(--text-light)]" />}
    </button>
  );
}

export default CustomerCard;
