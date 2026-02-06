'use client';

/**
 * Connected Book of Business Dashboard
 *
 * A data-connected version of the BookOfBusinessDashboard that fetches
 * real data from the analytics APIs. Falls back to static demo data
 * when API data is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Upload,
  BarChart2,
  TrendingUp,
  Users,
  DollarSign,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BookOfBusinessDashboard, bookOfBusinessData } from './BookOfBusinessDashboard';
import { useCashFlow, useDataUpload, useAnalyticsConnectionStatus, useAnalyticsRealtime } from '../hooks';

type DataMode = 'demo' | 'live' | 'loading' | 'error';

interface DashboardStats {
  totalPremium: number;
  totalCustomers: number;
  totalPolicies: number;
  avgPremiumPerCustomer: number;
  cashFlowHealthy: boolean;
  workingCapitalNeeded: number;
  segmentBreakdown: Record<string, number>;
}

export function ConnectedBookOfBusinessDashboard() {
  const [dataMode, setDataMode] = useState<DataMode>('demo');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // API hooks
  const cashFlow = useCashFlow();
  const upload = useDataUpload();

  // Real-time connection status
  const connectionStatus = useAnalyticsConnectionStatus();
  const { lastEvent } = useAnalyticsRealtime(undefined, (event) => {
    // Auto-refresh when data is uploaded
    if (event.type === 'upload_complete') {
      fetchLiveData();
    }
  });

  // Fetch live data
  const fetchLiveData = useCallback(async () => {
    setDataMode('loading');

    try {
      // Fetch cash flow analysis with demo parameters
      const cashFlowResult = await cashFlow.analyze({
        parameters: {
          monthlyPolicies: bookOfBusinessData.overview.totalPolicies / 12,
          avgPremiumPerPolicy: bookOfBusinessData.overview.avgPremiumPerPolicy,
          commissionRate: 0.07,
          newPoliciesPerMonth: 10,
          renewalRate: 0.85,
          expenseRatio: 0.25,
        },
      });

      if (cashFlowResult?.success) {
        setStats({
          totalPremium: cashFlowResult.summary.totalPremium * 12,
          totalCustomers: bookOfBusinessData.overview.uniqueCustomers,
          totalPolicies: bookOfBusinessData.overview.totalPolicies,
          avgPremiumPerCustomer: bookOfBusinessData.overview.avgPremiumPerCustomer,
          cashFlowHealthy: cashFlowResult.summary.estimatedNetIncome > 0,
          workingCapitalNeeded: cashFlowResult.summary.workingCapitalNeeded,
          segmentBreakdown: {
            elite: bookOfBusinessData.customerSegments.elite.count,
            premium: bookOfBusinessData.customerSegments.premium.count,
            standard: bookOfBusinessData.customerSegments.standard.count,
            entry: bookOfBusinessData.customerSegments.entry.count,
          },
        });
        setDataMode('live');
      } else {
        setDataMode('demo');
      }
    } catch (error) {
      console.error('Failed to fetch live data:', error);
      setDataMode('demo');
    }
  }, [cashFlow]);

  // Handle file upload
  const handleUpload = async (file: File) => {
    const result = await upload.upload({
      file,
      uploadedBy: 'Dashboard User', // TODO: Get from auth context
      useEnhancedScoring: true,
      blendWeight: 0.6,
      dryRun: false,
    });

    if (result?.success) {
      setShowUpload(false);
      await fetchLiveData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Source Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <DataModeIndicator mode={dataMode} />
          <div>
            <h3 className="font-semibold text-white">
              {dataMode === 'demo' ? 'Demo Data' : dataMode === 'live' ? 'Live Analytics' : 'Loading...'}
            </h3>
            <p className="text-xs text-white/60">
              {dataMode === 'demo'
                ? 'Showing sample data from Nov 2025 audit'
                : dataMode === 'live'
                ? 'Connected to analytics APIs'
                : 'Fetching latest data...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/10">
            {connectionStatus.overall === 'healthy' ? (
              <Wifi className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className={`text-xs ${connectionStatus.overall === 'healthy' ? 'text-sky-400' : 'text-amber-400'}`}>
              {connectionStatus.realtime ? 'Live' : 'Polling'}
            </span>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Data
          </button>
          <button
            onClick={fetchLiveData}
            disabled={dataMode === 'loading'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${dataMode === 'loading' ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Live Stats Cards (when live data available) */}
      {dataMode === 'live' && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Cash Flow Status"
            value={stats.cashFlowHealthy ? 'Healthy' : 'Attention'}
            icon={TrendingUp}
            color={stats.cashFlowHealthy ? 'sky' : 'rose'}
          />
          <StatCard
            title="Working Capital Need"
            value={`$${(stats.workingCapitalNeeded / 1000).toFixed(0)}K`}
            icon={DollarSign}
            color="gold"
          />
          <StatCard
            title="High-Value Customers"
            value={stats.segmentBreakdown.elite + stats.segmentBreakdown.premium}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="API Status"
            value="Connected"
            icon={BarChart2}
            color="sky"
          />
        </motion.div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          loading={upload.loading}
          result={upload.data}
          error={upload.error}
        />
      )}

      {/* Main Dashboard */}
      <BookOfBusinessDashboard />
    </div>
  );
}

// Helper Components

function DataModeIndicator({ mode }: { mode: DataMode }) {
  const config = {
    demo: { icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    live: { icon: CheckCircle, color: 'text-sky-400', bg: 'bg-sky-500/20' },
    loading: { icon: RefreshCw, color: 'text-white/60', bg: 'bg-white/10' },
    error: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  };

  const { icon: Icon, color, bg } = config[mode];

  return (
    <div className={`p-2 rounded-lg ${bg}`}>
      <Icon className={`w-5 h-5 ${color} ${mode === 'loading' ? 'animate-spin' : ''}`} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: typeof TrendingUp;
  color: 'sky' | 'gold' | 'purple' | 'rose';
}) {
  const colorClasses = {
    sky: { bg: 'from-sky-500/20 to-sky-500/5', border: 'border-sky-500/30', text: 'text-sky-400' },
    gold: { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' },
    purple: { bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
    rose: { bg: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30', text: 'text-rose-400' },
  };

  const classes = colorClasses[color];

  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${classes.bg} border ${classes.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${classes.text}`} />
        <span className="text-xs text-white/60">{title}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${classes.text}`}>{value}</p>
    </div>
  );
}

interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File) => void;
  loading: boolean;
  result: { success: boolean; stats?: { records_created: number } } | null;
  error: Error | null;
}

function UploadModal({ onClose, onUpload, loading, result, error }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="glass-card-elevated p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-4">Upload Book of Business</h3>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 text-white/40 mx-auto mb-3" />
          <p className="text-white/70 mb-2">
            {file ? file.name : 'Drop your CSV or Excel file here'}
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="text-sm text-sky-400 cursor-pointer hover:underline"
          >
            or click to browse
          </label>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30">
            <p className="text-sm text-rose-300">{error.message}</p>
          </div>
        )}

        {result?.success && (
          <div className="mt-4 p-3 rounded-lg bg-sky-500/20 border border-sky-500/30">
            <p className="text-sm text-sky-300">
              Successfully imported {result.stats?.records_created || 0} records
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => file && onUpload(file)}
            disabled={!file || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ConnectedBookOfBusinessDashboard;
