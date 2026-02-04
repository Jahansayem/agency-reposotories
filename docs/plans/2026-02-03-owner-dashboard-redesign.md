# Owner Dashboard Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the dashboard into an Allstate agency owner command center focused on premium, pipeline, retention, and team production.

**Architecture:** Hybrid data approach - leverage existing task system with new insurance-specific fields (category, premium_amount, customer_name) plus manual metric entry. Owner-first design with simplified staff views.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Tailwind CSS, Framer Motion

---

## Design Decisions Summary

| Decision | Choice |
|----------|--------|
| Data Integration | Hybrid - existing tasks + manual key metrics |
| Primary Persona | Owner-First Design |
| Task Categorization | AI-suggested tags with user confirmation |
| Calendar | Integrated view showing tasks + renewals |

---

## Task 1: Database Schema Changes

**Files:**
- Create: `supabase/migrations/20260203_dashboard_redesign_schema.sql`
- Modify: `src/types/todo.ts`

### Step 1.1: Create SQL migration

```sql
-- Add insurance-specific fields to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS premium_amount DECIMAL(10,2);
ALTER TABLE todos ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS policy_type TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS renewal_status TEXT;

-- Add constraint for category values
ALTER TABLE todos ADD CONSTRAINT todos_category_check
  CHECK (category IS NULL OR category IN ('quote', 'renewal', 'claim', 'service', 'follow-up', 'prospecting', 'other'));

-- Add constraint for policy_type values
ALTER TABLE todos ADD CONSTRAINT todos_policy_type_check
  CHECK (policy_type IS NULL OR policy_type IN ('auto', 'home', 'life', 'commercial', 'bundle'));

-- Add constraint for renewal_status values
ALTER TABLE todos ADD CONSTRAINT todos_renewal_status_check
  CHECK (renewal_status IS NULL OR renewal_status IN ('pending', 'contacted', 'confirmed', 'at-risk'));

-- Create agency_metrics table for monthly snapshots
CREATE TABLE IF NOT EXISTS agency_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: '2026-02'
  retention_rate DECIMAL(5,2),
  premium_goal DECIMAL(12,2),
  premium_actual DECIMAL(12,2) DEFAULT 0,
  policies_goal INTEGER,
  policies_actual INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_id, month)
);

-- Enable RLS
ALTER TABLE agency_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy for agency_metrics
CREATE POLICY "Agency members can view their agency metrics" ON agency_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agency_metrics;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_category_due ON todos(category, due_date);
CREATE INDEX IF NOT EXISTS idx_agency_metrics_agency_month ON agency_metrics(agency_id, month);
```

### Step 1.2: Update TypeScript types

In `src/types/todo.ts`, add:

```typescript
export type TaskCategory = 'quote' | 'renewal' | 'claim' | 'service' | 'follow-up' | 'prospecting' | 'other';
export type PolicyType = 'auto' | 'home' | 'life' | 'commercial' | 'bundle';
export type RenewalStatus = 'pending' | 'contacted' | 'confirmed' | 'at-risk';

// Update Todo interface
export interface Todo {
  // ... existing fields ...
  category?: TaskCategory;
  premium_amount?: number;
  customer_name?: string;
  policy_type?: PolicyType;
  renewal_status?: RenewalStatus;
}

// New interface for agency metrics
export interface AgencyMetrics {
  id: string;
  agency_id: string;
  month: string;
  retention_rate?: number;
  premium_goal?: number;
  premium_actual?: number;
  policies_goal?: number;
  policies_actual?: number;
  created_at: string;
  updated_at: string;
}
```

---

## Task 2: Quick Stats Bar Component

**Files:**
- Create: `src/components/dashboard/QuickStatsBar.tsx`
- Create: `src/components/dashboard/LogSaleModal.tsx`
- Create: `src/hooks/useAgencyMetrics.ts`

### Step 2.1: Create useAgencyMetrics hook

```typescript
// src/hooks/useAgencyMetrics.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAgency } from '@/contexts/AgencyContext';
import type { AgencyMetrics, Todo } from '@/types/todo';

export function useAgencyMetrics() {
  const { currentAgencyId } = useAgency();
  const [metrics, setMetrics] = useState<AgencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchMetrics = useCallback(async () => {
    if (!currentAgencyId) return;

    const { data } = await supabase
      .from('agency_metrics')
      .select('*')
      .eq('agency_id', currentAgencyId)
      .eq('month', currentMonth)
      .single();

    setMetrics(data);
    setLoading(false);
  }, [currentAgencyId, currentMonth]);

  // Calculate pipeline value from open quotes
  const calculatePipelineValue = useCallback((todos: Todo[]) => {
    return todos
      .filter(t => t.category === 'quote' && !t.completed)
      .reduce((sum, t) => sum + (t.premium_amount || 0), 0);
  }, []);

  // Calculate policies this week
  const calculatePoliciesThisWeek = useCallback((todos: Todo[]) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return todos.filter(t =>
      t.category === 'quote' &&
      t.completed &&
      new Date(t.updated_at || t.created_at) >= weekStart
    ).length;
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics,
    calculatePipelineValue,
    calculatePoliciesThisWeek,
  };
}
```

### Step 2.2: Create QuickStatsBar component

```typescript
// src/components/dashboard/QuickStatsBar.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, Shield, TrendingUp, Plus } from 'lucide-react';
import { useAgencyMetrics } from '@/hooks/useAgencyMetrics';
import { LogSaleModal } from './LogSaleModal';
import { CountUp } from '@/components/ui/CountUp';
import type { Todo } from '@/types/todo';

interface QuickStatsBarProps {
  userName: string;
  todos: Todo[];
  onSaleLogged: () => void;
}

export function QuickStatsBar({ userName, todos, onSaleLogged }: QuickStatsBarProps) {
  const [showLogSale, setShowLogSale] = useState(false);
  const { metrics, calculatePipelineValue, calculatePoliciesThisWeek } = useAgencyMetrics();

  const stats = useMemo(() => {
    const premiumMTD = todos
      .filter(t => t.category === 'quote' && t.completed && t.premium_amount)
      .reduce((sum, t) => sum + (t.premium_amount || 0), 0);

    const pipelineValue = calculatePipelineValue(todos);
    const policiesThisWeek = calculatePoliciesThisWeek(todos);
    const openQuotes = todos.filter(t => t.category === 'quote' && !t.completed).length;

    return {
      premiumMTD,
      policiesThisWeek,
      retentionRate: metrics?.retention_rate || 0,
      pipelineValue,
      openQuotes,
      policiesGoal: metrics?.policies_goal || 5,
    };
  }, [todos, metrics, calculatePipelineValue, calculatePoliciesThisWeek]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <>
      <div className="bg-gradient-to-r from-[#0033A0] to-[#003D7A] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">
            {greeting}, {userName}
          </h1>
          <button
            onClick={() => setShowLogSale(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Sale
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Premium MTD"
            value={`$${stats.premiumMTD.toLocaleString()}`}
            subtext={metrics?.premium_goal ? `Goal: $${metrics.premium_goal.toLocaleString()}` : undefined}
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="Policies This Week"
            value={stats.policiesThisWeek.toString()}
            subtext={`Goal: ${stats.policiesGoal}`}
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Retention"
            value={stats.retentionRate ? `${stats.retentionRate}%` : '--'}
            subtext="vs 85% target"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Pipeline"
            value={`$${stats.pipelineValue.toLocaleString()}`}
            subtext={`${stats.openQuotes} quotes`}
          />
        </div>
      </div>

      <LogSaleModal
        isOpen={showLogSale}
        onClose={() => setShowLogSale(false)}
        onSaleLogged={onSaleLogged}
      />
    </>
  );
}

function StatCard({ icon, label, value, subtext }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 rounded-lg p-4"
    >
      <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && (
        <div className="text-xs text-white/50 mt-1">{subtext}</div>
      )}
    </motion.div>
  );
}
```

### Step 2.3: Create LogSaleModal component

```typescript
// src/components/dashboard/LogSaleModal.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, User, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/UserContext';
import { useAgency } from '@/contexts/AgencyContext';
import type { PolicyType } from '@/types/todo';

interface LogSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleLogged: () => void;
}

export function LogSaleModal({ isOpen, onClose, onSaleLogged }: LogSaleModalProps) {
  const currentUser = useCurrentUser();
  const { currentAgencyId } = useAgency();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    premiumAmount: '',
    policyType: 'auto' as PolicyType,
    producer: currentUser?.name || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supabase.from('todos').insert({
        text: `Policy sold: ${formData.customerName} - ${formData.policyType}`,
        category: 'quote',
        customer_name: formData.customerName,
        premium_amount: parseFloat(formData.premiumAmount),
        policy_type: formData.policyType,
        completed: true,
        status: 'done',
        created_by: formData.producer,
        assigned_to: formData.producer,
        agency_id: currentAgencyId,
      });

      onSaleLogged();
      onClose();
      setFormData({
        customerName: '',
        premiumAmount: '',
        policyType: 'auto',
        producer: currentUser?.name || '',
      });
    } catch (error) {
      console.error('Failed to log sale:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Log a Sale</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    placeholder="John Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Premium Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.premiumAmount}
                    onChange={(e) => setFormData({ ...formData, premiumAmount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    placeholder="1,200.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Policy Type
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={formData.policyType}
                    onChange={(e) => setFormData({ ...formData, policyType: e.target.value as PolicyType })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 appearance-none"
                  >
                    <option value="auto">Auto</option>
                    <option value="home">Home</option>
                    <option value="life">Life</option>
                    <option value="commercial">Commercial</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0033A0] hover:bg-[#002780] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Logging...' : 'Log Sale'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Task 3: Pipeline Health Panel

**Files:**
- Create: `src/components/dashboard/PipelineHealthPanel.tsx`

```typescript
// src/components/dashboard/PipelineHealthPanel.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, AlertTriangle, Flame, ChevronRight } from 'lucide-react';
import type { Todo } from '@/types/todo';

interface PipelineHealthPanelProps {
  todos: Todo[];
  onViewQuotes: () => void;
}

export function PipelineHealthPanel({ todos, onViewQuotes }: PipelineHealthPanelProps) {
  const stats = useMemo(() => {
    const quotes = todos.filter(t => t.category === 'quote' && !t.completed);
    const followUps = todos.filter(t => t.category === 'follow-up' && !t.completed);
    const now = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));

    // Quotes value
    const quotesValue = quotes.reduce((sum, t) => sum + (t.premium_amount || 0), 0);

    // Overdue follow-ups
    const overdueFollowUps = followUps.filter(t =>
      t.due_date && new Date(t.due_date) < now
    );

    // Quotes closing this week
    const closingSoon = quotes.filter(t =>
      t.due_date && new Date(t.due_date) <= weekEnd
    );

    // Stale quotes (over 7 days old)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const staleQuotes = quotes.filter(t =>
      new Date(t.created_at) < sevenDaysAgo
    );

    // Hot leads (due today or tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hotLeads = quotes.filter(t =>
      t.due_date && new Date(t.due_date) <= tomorrow && t.priority === 'high'
    );

    return {
      quotesCount: quotes.length,
      quotesValue,
      overdueFollowUps: overdueFollowUps.length,
      closingSoon: closingSoon.length,
      staleQuotes: staleQuotes.length,
      hotLeads: hotLeads.length,
    };
  }, [todos]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#0033A0]" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline Health</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.quotesCount}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Quotes</div>
          <div className="text-xs text-[#0033A0]">${stats.quotesValue.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{stats.overdueFollowUps}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Follow Ups</div>
          <div className="text-xs text-amber-600">overdue</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600">{stats.closingSoon}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Closing</div>
          <div className="text-xs text-emerald-600">this week</div>
        </div>
      </div>

      {(stats.staleQuotes > 0 || stats.hotLeads > 0) && (
        <div className="space-y-2 mb-4">
          {stats.staleQuotes > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              {stats.staleQuotes} quotes over 7 days old
            </div>
          )}
          {stats.hotLeads > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
              <Flame className="w-4 h-4" />
              {stats.hotLeads} hot leads need callback today
            </div>
          )}
        </div>
      )}

      <button
        onClick={onViewQuotes}
        className="w-full flex items-center justify-center gap-2 text-[#0033A0] hover:bg-slate-50 dark:hover:bg-slate-700 py-2 rounded-lg transition-colors"
      >
        View All Quotes
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
```

---

## Task 4: Renewals Calendar Panel

**Files:**
- Create: `src/components/dashboard/RenewalsCalendarPanel.tsx`

```typescript
// src/components/dashboard/RenewalsCalendarPanel.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ChevronRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { format, addDays, isWithinInterval } from 'date-fns';
import type { Todo, RenewalStatus } from '@/types/todo';

interface RenewalsCalendarPanelProps {
  todos: Todo[];
  onViewCalendar: () => void;
  onRenewalClick: (todo: Todo) => void;
}

const STATUS_CONFIG: Record<RenewalStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  'confirmed': { icon: CheckCircle, color: 'text-emerald-600', label: 'Confirmed' },
  'contacted': { icon: CheckCircle, color: 'text-blue-600', label: 'Contacted' },
  'pending': { icon: AlertTriangle, color: 'text-amber-600', label: 'No contact' },
  'at-risk': { icon: XCircle, color: 'text-red-600', label: 'At risk' },
};

export function RenewalsCalendarPanel({ todos, onViewCalendar, onRenewalClick }: RenewalsCalendarPanelProps) {
  const renewals = useMemo(() => {
    const now = new Date();
    const thirtyDaysOut = addDays(now, 30);

    return todos
      .filter(t =>
        t.category === 'renewal' &&
        !t.completed &&
        t.due_date &&
        isWithinInterval(new Date(t.due_date), { start: now, end: thirtyDaysOut })
      )
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
  }, [todos]);

  const summary = useMemo(() => {
    const allRenewals = todos.filter(t =>
      t.category === 'renewal' &&
      !t.completed &&
      t.due_date &&
      isWithinInterval(new Date(t.due_date), { start: new Date(), end: addDays(new Date(), 30) })
    );

    const totalPremium = allRenewals.reduce((sum, t) => sum + (t.premium_amount || 0), 0);
    const atRisk = allRenewals.filter(t => t.renewal_status === 'at-risk').length;
    const noContact = allRenewals.filter(t => !t.renewal_status || t.renewal_status === 'pending').length;

    return {
      total: allRenewals.length,
      totalPremium,
      atRisk,
      noContact,
    };
  }, [todos]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-5 h-5 text-[#0033A0]" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Renewals - Next 30 Days</h3>
      </div>

      {renewals.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No renewals due in the next 30 days
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {renewals.map((renewal) => {
              const status = renewal.renewal_status || 'pending';
              const config = STATUS_CONFIG[status];
              const StatusIcon = config.icon;

              return (
                <button
                  key={renewal.id}
                  onClick={() => onRenewalClick(renewal)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400 w-16">
                    {format(new Date(renewal.due_date!), 'MMM d')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {renewal.customer_name || renewal.text}
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    ${(renewal.premium_amount || 0).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">{summary.total} renewals</span>
                <span className="text-slate-900 dark:text-white font-medium ml-2">
                  ${summary.totalPremium.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                {summary.atRisk > 0 && (
                  <span className="text-red-600 mr-3">At Risk: {summary.atRisk}</span>
                )}
                {summary.noContact > 0 && (
                  <span className="text-amber-600">No Contact: {summary.noContact}</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <button
        onClick={onViewCalendar}
        className="w-full flex items-center justify-center gap-2 text-[#0033A0] hover:bg-slate-50 dark:hover:bg-slate-700 py-2 rounded-lg transition-colors"
      >
        View Full Calendar
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
```

---

## Task 5: Integrated Calendar View

**Files:**
- Create: `src/components/calendar/CalendarView.tsx`
- Create: `src/components/calendar/CalendarGrid.tsx`
- Create: `src/components/calendar/CalendarDayCell.tsx`

This is the full-page calendar that shows all tasks and renewals integrated.

### Step 5.1: CalendarView main component

```typescript
// src/components/calendar/CalendarView.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameMonth, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import type { Todo, TaskCategory } from '@/types/todo';

interface CalendarViewProps {
  todos: Todo[];
  onTaskClick: (todo: Todo) => void;
  onDateClick: (date: Date) => void;
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  quote: 'bg-blue-500',
  renewal: 'bg-purple-500',
  claim: 'bg-red-500',
  service: 'bg-amber-500',
  'follow-up': 'bg-emerald-500',
  prospecting: 'bg-cyan-500',
  other: 'bg-slate-500',
};

export function CalendarView({ todos, onTaskClick, onDateClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<TaskCategory[]>([
    'quote', 'renewal', 'follow-up'
  ]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();

    todos
      .filter(t => t.due_date && selectedCategories.includes(t.category || 'other'))
      .forEach(todo => {
        const dateKey = format(new Date(todo.due_date!), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, todo]);
      });

    return map;
  }, [todos, selectedCategories]);

  const toggleCategory = useCallback((category: TaskCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Get first day of week offset
  const firstDayOffset = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Today
          </button>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(Object.keys(CATEGORY_COLORS) as TaskCategory[]).slice(0, 6).map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1 text-xs rounded-full capitalize transition-all ${
                selectedCategories.includes(category)
                  ? `${CATEGORY_COLORS[category]} text-white`
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {category.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateKey) || [];

            return (
              <CalendarDayCell
                key={dateKey}
                date={day}
                tasks={dayTasks}
                isToday={isToday(day)}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                onDateClick={onDateClick}
                onTaskClick={onTaskClick}
                categoryColors={CATEGORY_COLORS}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          {(Object.entries(CATEGORY_COLORS) as [TaskCategory, string][]).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-slate-600 dark:text-slate-400 capitalize">
                {category.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 5.2: CalendarDayCell component

```typescript
// src/components/calendar/CalendarDayCell.tsx
'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import type { Todo, TaskCategory } from '@/types/todo';

interface CalendarDayCellProps {
  date: Date;
  tasks: Todo[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onDateClick: (date: Date) => void;
  onTaskClick: (todo: Todo) => void;
  categoryColors: Record<TaskCategory, string>;
}

export function CalendarDayCell({
  date,
  tasks,
  isToday,
  isCurrentMonth,
  onDateClick,
  onTaskClick,
  categoryColors,
}: CalendarDayCellProps) {
  const displayTasks = useMemo(() => tasks.slice(0, 3), [tasks]);
  const moreCount = tasks.length - 3;

  return (
    <div
      onClick={() => onDateClick(date)}
      className={`
        min-h-[100px] p-1 border rounded-lg cursor-pointer transition-colors
        ${isToday
          ? 'border-[#0033A0] bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }
        ${!isCurrentMonth && 'opacity-40'}
      `}
    >
      <div className={`
        text-sm font-medium mb-1 text-right pr-1
        ${isToday ? 'text-[#0033A0]' : 'text-slate-700 dark:text-slate-300'}
      `}>
        {format(date, 'd')}
      </div>

      <div className="space-y-1">
        {displayTasks.map(task => (
          <button
            key={task.id}
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
            className={`
              w-full text-left text-xs px-1.5 py-0.5 rounded truncate text-white
              ${categoryColors[task.category || 'other']}
              hover:opacity-80 transition-opacity
            `}
            title={task.text}
          >
            {task.customer_name || task.text}
          </button>
        ))}
        {moreCount > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 pl-1">
            +{moreCount} more
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 6: Team Production Panel

**Files:**
- Create: `src/components/dashboard/TeamProductionPanel.tsx`

```typescript
// src/components/dashboard/TeamProductionPanel.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Todo } from '@/types/todo';

interface TeamProductionPanelProps {
  todos: Todo[];
  teamMembers: string[];
  onMemberClick: (member: string) => void;
}

export function TeamProductionPanel({ todos, teamMembers, onMemberClick }: TeamProductionPanelProps) {
  const memberStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    return teamMembers.map(member => {
      const memberTodos = todos.filter(t => t.assigned_to === member || t.created_by === member);

      // Premium MTD
      const premiumMTD = memberTodos
        .filter(t =>
          t.category === 'quote' &&
          t.completed &&
          t.premium_amount &&
          new Date(t.updated_at || t.created_at) >= monthStart
        )
        .reduce((sum, t) => sum + (t.premium_amount || 0), 0);

      // Policies this week
      const policiesThisWeek = memberTodos.filter(t =>
        t.category === 'quote' &&
        t.completed &&
        new Date(t.updated_at || t.created_at) >= weekStart
      ).length;

      // Open quotes
      const openQuotes = memberTodos.filter(t => t.category === 'quote' && !t.completed).length;

      // Goal progress (assume $15K/month goal per producer)
      const goalProgress = Math.min(100, Math.round((premiumMTD / 15000) * 100));

      return {
        name: member,
        premiumMTD,
        policiesThisWeek,
        openQuotes,
        goalProgress,
      };
    }).sort((a, b) => b.premiumMTD - a.premiumMTD);
  }, [todos, teamMembers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#0033A0]" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Production This Week</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberStats.map((member, index) => (
          <button
            key={member.name}
            onClick={() => onMemberClick(member.name)}
            className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0033A0] flex items-center justify-center text-white font-medium">
                  {member.name.charAt(0)}
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
              </div>
              {index === 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Top</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">MTD Premium</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  ${member.premiumMTD.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Policies</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {member.policiesThisWeek}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${member.goalProgress}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {member.goalProgress}% of goal
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {member.openQuotes} open quotes
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
```

---

## Task 7: Staff Dashboard View

**Files:**
- Create: `src/components/dashboard/StaffDashboard.tsx`

A simplified "My Work" view for non-owner roles.

```typescript
// src/components/dashboard/StaffDashboard.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import type { Todo } from '@/types/todo';

interface StaffDashboardProps {
  todos: Todo[];
  currentUserName: string;
  onTaskClick: (todo: Todo) => void;
}

export function StaffDashboard({ todos, currentUserName, onTaskClick }: StaffDashboardProps) {
  const myTodos = useMemo(() =>
    todos.filter(t => t.assigned_to === currentUserName || t.created_by === currentUserName),
    [todos, currentUserName]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedThisWeek = myTodos.filter(t =>
      t.completed && new Date(t.updated_at || t.created_at) >= weekStart
    ).length;

    const premiumMTD = myTodos
      .filter(t =>
        t.category === 'quote' &&
        t.completed &&
        t.premium_amount &&
        new Date(t.updated_at || t.created_at) >= monthStart
      )
      .reduce((sum, t) => sum + (t.premium_amount || 0), 0);

    const pipelineValue = myTodos
      .filter(t => t.category === 'quote' && !t.completed)
      .reduce((sum, t) => sum + (t.premium_amount || 0), 0);

    const overdue = myTodos.filter(t =>
      !t.completed && t.due_date && new Date(t.due_date) < now
    ).length;

    const dueToday = myTodos.filter(t => {
      if (t.completed || !t.due_date) return false;
      const due = new Date(t.due_date);
      return due.toDateString() === now.toDateString();
    });

    return { completedThisWeek, premiumMTD, pipelineValue, overdue, dueToday };
  }, [myTodos]);

  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="My Premium MTD"
          value={`$${stats.premiumMTD.toLocaleString()}`}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-blue-600" />}
          label="My Pipeline"
          value={`$${stats.pipelineValue.toLocaleString()}`}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-[#0033A0]" />}
          label="Completed This Week"
          value={stats.completedThisWeek.toString()}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-red-600" />}
          label="Overdue"
          value={stats.overdue.toString()}
          highlight={stats.overdue > 0}
        />
      </div>

      {/* Due Today */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Today's Priorities
        </h3>

        {stats.dueToday.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No tasks due today. Great job staying on top of things!
          </div>
        ) : (
          <div className="space-y-2">
            {stats.dueToday.map(todo => (
              <button
                key={todo.id}
                onClick={() => onTaskClick(todo)}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full ${
                  todo.category === 'quote' ? 'bg-blue-500' :
                  todo.category === 'renewal' ? 'bg-purple-500' :
                  todo.category === 'follow-up' ? 'bg-emerald-500' :
                  'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {todo.text}
                  </div>
                  {todo.customer_name && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {todo.customer_name}
                    </div>
                  )}
                </div>
                {todo.premium_amount && (
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    ${todo.premium_amount.toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`
      p-4 rounded-xl border
      ${highlight
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }
    `}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
```

---

## Task 8: AI Category Suggestions

**Files:**
- Modify: `src/app/api/ai/suggest-category/route.ts` (create)
- Modify: `src/components/AddTodo.tsx`

### Step 8.1: Create API endpoint

```typescript
// src/app/api/ai/suggest-category/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TaskCategory, PolicyType } from '@/types/todo';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Analyze this insurance agency task and suggest a category and metadata.

Task: "${text}"

Return JSON only:
{
  "category": "quote" | "renewal" | "claim" | "service" | "follow-up" | "prospecting" | "other",
  "policy_type": "auto" | "home" | "life" | "commercial" | "bundle" | null,
  "customer_name": string | null,
  "confidence": number (0-1)
}

Categories:
- quote: New business quotes, proposals, sales opportunities
- renewal: Policy renewals, retention tasks
- claim: Claims handling, FNOL, claim follow-ups
- service: Policy changes, endorsements, certificates
- follow-up: Customer callbacks, lead follow-ups
- prospecting: Lead generation, outreach, networking
- other: Administrative, internal tasks`
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const suggestion = JSON.parse(responseText);

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Category suggestion error:', error);
    return NextResponse.json({ category: 'other', confidence: 0 });
  }
}
```

---

## Task 9: Update Owner Dashboard Layout

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

This task integrates all the new components into the main dashboard, replacing the current layout for owners.

The implementation will:
1. Check user role (owner vs staff)
2. Render QuickStatsBar at top for owners
3. Render PipelineHealthPanel and RenewalsCalendarPanel side-by-side
4. Render TeamProductionPanel below
5. Render StaffDashboard for non-owners

---

## Task 10: Add Calendar View Navigation

**Files:**
- Modify: `src/components/layout/NavigationSidebar.tsx`
- Modify: `src/components/MainApp.tsx`

Add "Calendar" to the navigation menu and route to the CalendarView component.

---

## Implementation Order

1. **Database Schema** - Must be first, enables all other features
2. **TypeScript Types** - Update types to match schema
3. **useAgencyMetrics Hook** - Data layer for metrics
4. **QuickStatsBar + LogSaleModal** - Top of dashboard
5. **PipelineHealthPanel** - Left column
6. **RenewalsCalendarPanel** - Right column
7. **TeamProductionPanel** - Full width below
8. **StaffDashboard** - Alternative view for staff
9. **CalendarView** - Full calendar page
10. **AI Category Suggestions** - Enhancement for task creation
11. **Dashboard Layout Integration** - Wire everything together
12. **Navigation Updates** - Add calendar to nav

---

## Testing Checklist

- [ ] Log Sale creates task with correct fields
- [ ] Quick stats calculate correctly from tasks
- [ ] Pipeline shows open quotes with values
- [ ] Renewals calendar shows next 30 days
- [ ] Team production shows per-member stats
- [ ] Staff see simplified "My Work" view
- [ ] Calendar view shows tasks by category
- [ ] AI suggests correct categories
- [ ] All components responsive on mobile
- [ ] Dark mode works throughout

---

## Migration Notes

- Existing tasks will have `category: null` initially
- AI can backfill categories on existing tasks via batch job
- Premium amounts default to 0 for existing tasks
- No breaking changes to existing functionality
