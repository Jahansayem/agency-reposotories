'use client';

/**
 * Analytics Page
 *
 * Main analytics view showing Book of Business Dashboard and other analytics components.
 * Accessible via the "Analytics" nav item in the sidebar.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  ConnectedBookOfBusinessDashboard,
  CustomerSegmentationDashboard,
  CsvUploadModal,
  DataFlowBanner,
} from '@/components/analytics';
import { BarChart2, Users, Upload } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useCustomerList } from '@/hooks/useCustomers';

type AnalyticsTab = 'overview' | 'customers';

interface AnalyticsPageProps {
  onNavigateToSegment?: (segment: 'elite' | 'premium' | 'standard' | 'entry') => void;
}

export function AnalyticsPage({ onNavigateToSegment }: AnalyticsPageProps = {}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const currentUser = useCurrentUser();

  // Fetch customer count for data flow banner
  const { stats } = useCustomerList({ limit: 1 });

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card-elevated border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30">
              <BarChart2 className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-white/60">
                Book of business insights and cross-sell opportunities
              </p>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors"
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
            active={activeTab === 'customers'}
            onClick={() => setActiveTab('customers')}
            icon={Users}
            label="Customer Insights"
          />
        </div>
      </div>

      {/* Data Flow Banner */}
      <div className="px-6 pt-4">
        <DataFlowBanner
          customerCount={stats?.total || 0}
          lastImportDate={null} // TODO: track last import in state
          dashboardCount={3}
        />
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

        {activeTab === 'customers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Customer Segmentation Dashboard */}
            <CustomerSegmentationDashboard onSegmentClick={onNavigateToSegment} />
          </motion.div>
        )}
      </div>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={(result) => {
          logger.info(`Imported ${result.recordsCreated} cross-sell opportunities`, { component: 'AnalyticsPage', action: 'onUploadComplete' });
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
          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
          : 'text-white/60 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default AnalyticsPage;
