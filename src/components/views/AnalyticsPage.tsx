'use client';

/**
 * Analytics Page
 *
 * Main analytics view showing Book of Business Dashboard and other analytics components.
 * Accessible via the "Analytics" nav item in the sidebar.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ConnectedBookOfBusinessDashboard,
  TodayOpportunitiesPanel,
  CustomerSegmentationDashboard,
  CsvUploadModal,
} from '@/components/analytics';
import { BarChart2, Calendar, Users, Upload } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';

type AnalyticsTab = 'overview' | 'opportunities' | 'customers';

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const currentUser = useCurrentUser();

  return (
    <div className="h-full overflow-y-auto bg-[var(--surface)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-2)] border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent)]/10">
              <BarChart2 className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Analytics</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Book of business insights and cross-sell opportunities
              </p>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-medium text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Book of Business
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={BarChart2}
            label="Portfolio Overview"
          />
          <TabButton
            active={activeTab === 'opportunities'}
            onClick={() => setActiveTab('opportunities')}
            icon={Calendar}
            label="Today's Opportunities"
          />
          <TabButton
            active={activeTab === 'customers'}
            onClick={() => setActiveTab('customers')}
            icon={Users}
            label="Customer Insights"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConnectedBookOfBusinessDashboard />
          </motion.div>
        )}

        {activeTab === 'opportunities' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TodayOpportunitiesPanel />
          </motion.div>
        )}

        {activeTab === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Customer Segmentation Dashboard */}
            <CustomerSegmentationDashboard />
          </motion.div>
        )}
      </div>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={(result) => {
          console.log(`Imported ${result.recordsCreated} cross-sell opportunities`);
          // Refresh analytics data if needed
        }}
        currentUserName={currentUser?.name || 'Unknown'}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BarChart2;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default AnalyticsPage;
