'use client';

/**
 * Customer Card
 *
 * Compact card showing customer info with quick actions.
 * Used in search results, lists, and task detail panels.
 */

import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { SegmentIndicator } from './CustomerBadge';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <SegmentIndicator segment={customer.segment} size={compact ? 'sm' : 'md'} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {customer.name}
              </h3>
              {customer.hasOpportunity && customer.priorityTier && (
                <span className={`
                  px-1.5 py-0.5 text-xs font-medium rounded
                  ${customer.priorityTier === 'HOT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    customer.priorityTier === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    customer.priorityTier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
                `}>
                  {customer.priorityTier}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatCurrency(customer.totalPremium)}/yr
              </span>
              <span>{customer.policyCount} {customer.policyCount === 1 ? 'policy' : 'policies'}</span>
              {customer.tenureYears > 0 && (
                <span>{customer.tenureYears} {customer.tenureYears === 1 ? 'year' : 'years'}</span>
              )}
            </div>
          </div>

          {onClick && (
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </div>

        {/* Products */}
        {customer.products.length > 0 && !compact && (
          <div className="mt-2 flex flex-wrap gap-1">
            {customer.products.slice(0, 4).map((product, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
              >
                {product}
              </span>
            ))}
            {customer.products.length > 4 && (
              <span className="px-2 py-0.5 text-xs text-gray-400">
                +{customer.products.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Opportunity */}
        {customer.recommendedProduct && !compact && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">Opportunity:</span>
              <span>{customer.recommendedProduct}</span>
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
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
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
        bg-gray-50 dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg text-left
        ${onClick ? 'hover:border-blue-400 cursor-pointer' : ''}
        transition-colors
      `}
    >
      <SegmentIndicator segment={customer.segment as Customer['segment']} size="sm" />
      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
        {customer.name}
      </span>
      {onClick && <ExternalLink className="w-3 h-3 text-gray-400" />}
    </button>
  );
}

export default CustomerCard;
