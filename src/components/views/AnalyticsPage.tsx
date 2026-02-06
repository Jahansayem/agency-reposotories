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
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Book of business insights and cross-sell opportunities
              </p>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
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

            {/* Quick API Reference */}
            <div className="glass-card p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Available Analytics APIs</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ApiCard
                  endpoint="/api/analytics/simulate"
                  description="Run agency growth simulations"
                />
                <ApiCard
                  endpoint="/api/analytics/segmentation"
                  description="Customer segmentation analysis"
                />
                <ApiCard
                  endpoint="/api/analytics/lead-quality"
                  description="Score and rank leads"
                />
                <ApiCard
                  endpoint="/api/analytics/cash-flow"
                  description="Cash flow projections"
                />
                <ApiCard
                  endpoint="/api/analytics/optimal-times"
                  description="Cross-sell timing analysis"
                />
                <ApiCard
                  endpoint="/api/analytics/upload"
                  description="Upload book of business data"
                />
              </div>
            </div>
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
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ApiCard({ endpoint, description }: { endpoint: string; description: string }) {
  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <code className="text-sm text-blue-600 dark:text-blue-400 font-mono">{endpoint}</code>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
}

export default AnalyticsPage;
