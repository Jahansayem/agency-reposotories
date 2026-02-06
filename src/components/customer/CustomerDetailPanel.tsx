'use client';

/**
 * Customer Detail Panel
 *
 * Full customer context panel for display in task detail modal.
 * Shows customer info, opportunities, and linked tasks.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Loader2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCustomerDetail, useCreateTaskFromOpportunity, useDismissOpportunity } from '@/hooks/useCustomers';
import { SegmentIndicator } from './CustomerBadge';
import type { CustomerOpportunity, CustomerTask } from '@/types/customer';

interface CustomerDetailPanelProps {
  customerId: string;
  onCreateTask?: (taskId: string) => void;
  onViewTask?: (taskId: string) => void;
  currentUser?: string;
  className?: string;
}

export function CustomerDetailPanel({
  customerId,
  onCreateTask,
  onViewTask,
  currentUser = 'Unknown',
  className = '',
}: CustomerDetailPanelProps) {
  const { customer, opportunities, tasks, stats, loading, error } = useCustomerDetail(customerId);
  const [expandedSection, setExpandedSection] = useState<'opportunities' | 'tasks' | null>('opportunities');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const toast = useToast();

  // Check if device has hover capability (desktop) vs touch-only (mobile)
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const handlePhoneClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>, phone: string) => {
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

  if (loading) {
    return (
      <div className={`p-4 bg-[var(--surface-2)] rounded-lg ${className}`}>
        <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading customer...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
        <div className="text-sm text-red-600 dark:text-red-400">
          {error?.message || 'Customer not found'}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-start gap-3">
          <SegmentIndicator segment={customer.segment} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--foreground)] truncate">
                {customer.name}
              </h3>
              <span className={`
                px-2 py-0.5 text-xs font-medium rounded capitalize
                ${customer.segment === 'elite' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  customer.segment === 'premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  customer.segment === 'standard' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}
              `}>
                {customer.segment}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {customer.segmentConfig.description}
            </p>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2 mt-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              onClick={(e) => handlePhoneClick(e, customer.phone!)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              title={isDesktop ? 'Click to copy' : 'Click to call'}
            >
              {copiedPhone ? (
                <Check className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {copiedPhone ? 'Copied!' : customer.phone}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-px bg-[var(--border)]">
        <StatBox label="Premium" value={formatCurrency(customer.totalPremium)} subtext="/year" />
        <StatBox label="Policies" value={customer.policyCount.toString()} />
        <StatBox label="Tenure" value={`${customer.tenureYears}yr`} />
        <StatBox
          label="LTV"
          value={formatCurrency(customer.segmentConfig.avgLtv)}
          className={customer.segment === 'elite' ? 'text-amber-600 dark:text-amber-400' : ''}
        />
      </div>

      {/* Products */}
      <div className="p-4 border-b border-[var(--border)]">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
          Current Products
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {customer.products.map((product, i) => (
            <span
              key={i}
              className="px-2 py-1 text-sm bg-[var(--surface-2)] text-[var(--foreground)] rounded"
            >
              {product}
            </span>
          ))}
          {customer.products.length === 0 && (
            <span className="text-sm text-[var(--text-light)]">No products listed</span>
          )}
        </div>
      </div>

      {/* Warnings/Alerts */}
      {(customer.retentionRisk !== 'low' || customer.paymentStatus !== 'current' || customer.upcomingRenewal) && (
        <div className="p-4 border-b border-[var(--border)] space-y-2">
          {customer.retentionRisk !== 'low' && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Retention risk: <strong>{customer.retentionRisk}</strong></span>
            </div>
          )}
          {customer.paymentStatus !== 'current' && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
              <span>Payment status: <strong>{customer.paymentStatus.replace('_', ' ')}</strong></span>
            </div>
          )}
          {customer.upcomingRenewal && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
              <span>Upcoming renewal: <strong>{formatDate(customer.upcomingRenewal)}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Opportunities Section */}
      <CollapsibleSection
        title="Cross-sell Opportunities"
        count={stats?.activeOpportunities || 0}
        expanded={expandedSection === 'opportunities'}
        onToggle={() => setExpandedSection(expandedSection === 'opportunities' ? null : 'opportunities')}
        icon={TrendingUp}
        iconColor="text-green-500"
      >
        {opportunities.length > 0 ? (
          <div className="space-y-2">
            {opportunities.filter(o => !o.dismissed).map((opp) => (
              <OpportunityItem
                key={opp.id}
                opportunity={opp}
                onCreateTask={onCreateTask}
                onViewTask={onViewTask}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No active opportunities
          </p>
        )}
      </CollapsibleSection>

      {/* Tasks Section */}
      <CollapsibleSection
        title="Related Tasks"
        count={stats?.linkedTasks || 0}
        expanded={expandedSection === 'tasks'}
        onToggle={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
        icon={CheckCircle}
        iconColor="text-blue-500"
      >
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onClick={() => onViewTask?.(task.id)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No related tasks
          </p>
        )}
      </CollapsibleSection>
    </div>
  );
}

// Helper Components

function StatBox({
  label,
  value,
  subtext,
  className = '',
}: {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}) {
  return (
    <div className="p-3 bg-[var(--surface)] text-center">
      <div className="text-xs text-[var(--text-muted)] mb-0.5">{label}</div>
      <div className={`text-lg font-bold text-[var(--foreground)] ${className}`}>
        {value}
        {subtext && <span className="text-xs font-normal text-[var(--text-light)]">{subtext}</span>}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  icon: typeof TrendingUp;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
          {count > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--foreground)] rounded">
              {count}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-light)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-light)]" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OpportunityItem({
  opportunity,
  onCreateTask,
  onViewTask,
  onDismiss,
  currentUser,
}: {
  opportunity: CustomerOpportunity;
  onCreateTask?: (taskId: string) => void;
  onViewTask?: (taskId: string) => void;
  onDismiss?: (opportunityId: string) => void;
  currentUser: string;
}) {
  const { createTask, loading } = useCreateTaskFromOpportunity();
  const { dismissOpportunity, loading: dismissLoading } = useDismissOpportunity();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleCreateTask = async () => {
    const taskId = await createTask({
      opportunityId: opportunity.id,
      assignedTo: currentUser,
      createdBy: currentUser,
      priority: opportunity.priorityTier === 'HOT' ? 'urgent' : 'high',
    });
    onCreateTask?.(taskId);
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update - hide immediately
    setIsDismissed(true);

    try {
      await dismissOpportunity({
        opportunityId: opportunity.id,
        dismissedBy: currentUser,
      });
      onDismiss?.(opportunity.id);
    } catch (error) {
      // Rollback on error
      setIsDismissed(false);
      console.error('Failed to dismiss opportunity:', error);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  // Don't render if dismissed (optimistic update)
  if (isDismissed) {
    return null;
  }

  return (
    <div className="p-3 bg-[var(--surface-2)] rounded-lg relative group">
      {/* Dismiss button - top right corner */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissLoading}
        className="absolute top-2 right-2 p-1 rounded-full text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-50"
        title="Dismiss opportunity"
        aria-label="Dismiss opportunity"
      >
        {dismissLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <X className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="flex items-start justify-between gap-2 pr-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`
              px-1.5 py-0.5 text-xs font-bold rounded
              ${opportunity.priorityTier === 'HOT' ? 'bg-red-500 text-white' :
                opportunity.priorityTier === 'HIGH' ? 'bg-orange-500 text-white' :
                opportunity.priorityTier === 'MEDIUM' ? 'bg-yellow-500 text-white' :
                'bg-gray-400 text-white'}
            `}>
              {opportunity.priorityTier}
            </span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {opportunity.recommendedProduct}
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            +{formatCurrency(opportunity.potentialPremiumAdd)}/yr potential
            {opportunity.renewalDate && ` • Renews ${new Date(opportunity.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </div>
        </div>
        {opportunity.taskId ? (
          <button
            type="button"
            onClick={() => onViewTask?.(opportunity.taskId!)}
            className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Task
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateTask}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Task
          </button>
        )}
      </div>
      {opportunity.talkingPoints.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <ul className="text-xs text-[var(--text-muted)] space-y-1">
            {opportunity.talkingPoints.slice(0, 2).map((point, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-blue-500">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  onClick,
}: {
  task: CustomerTask;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-3 bg-[var(--surface-2)] rounded-lg text-left hover:bg-[var(--surface-2)] hover:opacity-80 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-[var(--border)]'
        }`}>
          {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.completed ? 'text-[var(--text-light)] line-through' : 'text-[var(--foreground)]'}`}>
            {task.text}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.assignedTo && <span>→ {task.assignedTo}</span>}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-[var(--text-light)]" />
      </div>
    </button>
  );
}

export default CustomerDetailPanel;
