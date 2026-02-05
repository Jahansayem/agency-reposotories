'use client';

/**
 * Today's Opportunities Panel
 *
 * Displays TODAY's top priority cross-sell opportunities with:
 * - Auto-filtered by current date (daysUntilRenewal = 0)
 * - One-click calling
 * - Quick contact logging with 8 detailed outcomes for model training
 * - Real-time updates via API
 */

import { useState } from 'react';
import { useTodayOpportunities, type ContactRequest, type TodayOpportunity } from '../hooks/useTodayOpportunities';
import { CONTACT_OUTCOME_CONFIG, type ContactOutcome } from '@/types/allstate-analytics';
import {
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  ListTodo,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Voicemail,
  PhoneMissed,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Icon mapping for contact outcomes
const OUTCOME_ICONS: Record<ContactOutcome, React.ComponentType<{ className?: string }>> = {
  contacted_interested: ThumbsUp,
  contacted_not_interested: ThumbsDown,
  contacted_callback_scheduled: Calendar,
  contacted_wrong_timing: Clock,
  left_voicemail: Voicemail,
  no_answer: PhoneMissed,
  invalid_contact: AlertCircle,
  declined_permanently: XCircle,
};

export function TodayOpportunitiesPanel() {
  const {
    opportunities,
    meta,
    loading,
    error,
    refresh,
    logContactAttempt
  } = useTodayOpportunities(10);

  const [loggingContact, setLoggingContact] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState<string | null>(null);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Track which opportunities have the outcome selector expanded
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());

  // Toggle outcome selector visibility
  const toggleOutcomeSelector = (oppId: string) => {
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(oppId)) {
        next.delete(oppId);
      } else {
        next.add(oppId);
      }
      return next;
    });
  };

  // Handle contact logging with the new outcome types
  const handleLogContact = async (
    opportunityId: string,
    outcome: ContactOutcome,
    notes?: string
  ) => {
    setLoggingContact(opportunityId);

    try {
      // For now, use a placeholder user ID - in production this would come from auth context
      // TODO: Get actual user ID from auth context
      const request: ContactRequest = {
        contactMethod: 'phone',
        outcome,
        notes: notes || `Contact logged via Today panel: ${CONTACT_OUTCOME_CONFIG[outcome].label}`,
      };

      // The hook now requires userId - we'll need to get this from context
      // For now, we'll call the API directly with a workaround
      const response = await fetch(`/api/opportunities/${opportunityId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder - should come from auth
          contact_method: request.contactMethod,
          contact_outcome: request.outcome,
          notes: request.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log contact');
      }

      setToastMessage({ type: 'success', message: `Contact logged: ${CONTACT_OUTCOME_CONFIG[outcome].label}` });
      // Close the outcome selector after logging
      setExpandedOutcomes(prev => {
        const next = new Set(prev);
        next.delete(opportunityId);
        return next;
      });
      // Refresh the list
      refresh();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to log contact:', err);
      setToastMessage({ type: 'error', message: 'Failed to log contact. Please try again.' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoggingContact(null);
    }
  };

  // Map priority tier to task priority
  const mapTierToPriority = (tier: string): string => {
    switch (tier) {
      case 'HOT': return 'urgent';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      default: return 'medium';
    }
  };

  // Handle inline task creation
  const handleQuickCreateTask = async (opp: TodayOpportunity) => {
    setCreatingTask(opp.id);

    try {
      const response = await fetch('/api/opportunities/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opp.id,
          assignedTo: 'Derrick', // Default assignee - could be made configurable
          createdBy: 'System',
          priority: mapTierToPriority(opp.priorityTier),
          customText: `Cross-sell: ${opp.customerName} - ${opp.recommendedProduct}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Task already exists
          setCreatedTaskIds(prev => new Set(prev).add(opp.id));
          setToastMessage({ type: 'success', message: 'Task already exists for this opportunity' });
        } else {
          throw new Error(errorData.error || 'Failed to create task');
        }
      } else {
        setCreatedTaskIds(prev => new Set(prev).add(opp.id));
        setToastMessage({ type: 'success', message: `Task created for ${opp.customerName}` });
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to create task:', err);
      setToastMessage({ type: 'error', message: 'Failed to create task. Please try again.' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setCreatingTask(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading today's priorities...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Error Loading Opportunities</h3>
        </div>
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-green-700">
          No opportunities renewing today. Great job! 🎉
        </p>
        {meta && meta.urgentCount > 0 && (
          <p className="text-green-600 mt-2">
            You have {meta.urgentCount} opportunities renewing in the next 7 days.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toastMessage.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            📅 Today's Top Opportunities
          </h2>
          <p className="text-gray-600 mt-1">
            Policies renewing TODAY - {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <button
          onClick={() => refresh()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {meta && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">
              {meta.todayCount}
            </div>
            <div className="text-sm text-red-700">Renewing TODAY</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {meta.urgentCount}
            </div>
            <div className="text-sm text-orange-700">Next 7 Days</div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {meta.upcomingCount}
            </div>
            <div className="text-sm text-blue-700">Next 30 Days</div>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all bg-white"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {opp.customerName}
                  </h3>

                  {/* Priority Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      opp.priorityTier === 'HOT'
                        ? 'bg-red-100 text-red-800'
                        : opp.priorityTier === 'HIGH'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {opp.priorityTier} - {opp.priorityScore}
                  </span>

                  {/* TODAY Badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
                    🔥 RENEWS TODAY
                  </span>
                </div>

                <p className="text-gray-700 font-medium">
                  {opp.currentProducts} → <span className="text-blue-600">{opp.recommendedProduct}</span>
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {opp.segment}
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  +${opp.potentialPremiumAdd.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  Current: ${opp.currentPremium.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {opp.expectedConversionPct}% conversion rate
                </div>
              </div>
            </div>

            {/* Talking Points */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Talking Points:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• {opp.talkingPoint1}</li>
                <li>• {opp.talkingPoint2}</li>
                <li>• {opp.talkingPoint3}</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Action: Create Task - Always visible inline */}
              <button
                onClick={() => handleQuickCreateTask(opp)}
                disabled={creatingTask === opp.id || createdTaskIds.has(opp.id)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  createdTaskIds.has(opp.id)
                    ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default'
                    : 'bg-[#0033A0] text-white hover:bg-[#002680] disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {creatingTask === opp.id ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Creating Task...
                  </>
                ) : createdTaskIds.has(opp.id) ? (
                  <>
                    <ListTodo className="h-5 w-5" />
                    Task Created
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create Task
                  </>
                )}
              </button>

              {/* Contact Actions Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Call Button */}
                <a
                  href={`tel:${opp.phone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Phone className="h-5 w-5" />
                  Call {opp.phone}
                </a>

                {/* Email Button */}
                <a
                  href={`mailto:${opp.email}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Mail className="h-5 w-5" />
                  Email
                </a>
              </div>

              {/* Log Contact Outcome Button - Expands to show all options */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleOutcomeSelector(opp.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors font-medium text-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-500" />
                    Log Contact Outcome
                  </span>
                  {expandedOutcomes.has(opp.id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {/* Expanded Outcome Options */}
                {expandedOutcomes.has(opp.id) && (
                  <div className="p-3 bg-white border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-3 px-1">
                      Select the outcome of your contact attempt:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(CONTACT_OUTCOME_CONFIG) as ContactOutcome[]).map((outcome) => {
                        const config = CONTACT_OUTCOME_CONFIG[outcome];
                        const Icon = OUTCOME_ICONS[outcome];
                        return (
                          <button
                            key={outcome}
                            onClick={() => handleLogContact(opp.id, outcome)}
                            disabled={loggingContact === opp.id}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                              border: `1px solid ${config.color}30`,
                            }}
                            title={config.description}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {loggingContact === opp.id && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Logging contact...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details (Expandable) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
                View Customer Details
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Address:</span>
                  <p className="font-medium">{opp.address}, {opp.city} {opp.zipCode}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tenure:</span>
                  <p className="font-medium">{opp.tenureYears} years</p>
                </div>
                <div>
                  <span className="text-gray-500">Policy Count:</span>
                  <p className="font-medium">{opp.policyCount} policies</p>
                </div>
                <div>
                  <span className="text-gray-500">EZ-Pay:</span>
                  <p className="font-medium">{opp.ezpayStatus}</p>
                </div>
                <div>
                  <span className="text-gray-500">Balance Due:</span>
                  <p className="font-medium">${opp.balanceDue.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Renewal Status:</span>
                  <p className="font-medium">{opp.renewalStatus}</p>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        Showing {opportunities.length} of {meta?.todayCount} opportunities renewing today
      </div>
    </div>
  );
}
