/**
 * Today's Opportunities Panel
 *
 * Displays TODAY's top priority cross-sell opportunities with:
 * - Auto-filtered by current date (daysUntilRenewal = 0)
 * - One-click calling
 * - Quick contact logging
 * - Real-time updates via API
 */

import { useState } from 'react';
import { useTodayOpportunities } from '../hooks/useCrossSellOpportunities';
import { Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { ContactRequest } from '../lib/api-client';

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

  // Handle contact logging
  const handleLogContact = async (
    opportunityId: string,
    request: ContactRequest
  ) => {
    setLoggingContact(opportunityId);

    try {
      await logContactAttempt(opportunityId, request);
      // Success - opportunity automatically updated/removed from list
      toast.success('Contact logged successfully');
    } catch (error) {
      console.error('Failed to log contact:', error);
      toast.error('Failed to log contact. Please try again.');
    } finally {
      setLoggingContact(null);
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

              {/* Log Contact Buttons */}
              <button
                onClick={() =>
                  handleLogContact(opp.id, {
                    contactType: 'call',
                    outcome: 'reached',
                    notes: 'Contact made via Today panel'
                  })
                }
                disabled={loggingContact === opp.id}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="h-5 w-5" />
                {loggingContact === opp.id ? 'Logging...' : '✅ Contacted'}
              </button>

              <button
                onClick={() =>
                  handleLogContact(opp.id, {
                    contactType: 'call',
                    outcome: 'no_answer',
                    notes: 'No answer - will retry'
                  })
                }
                disabled={loggingContact === opp.id}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock className="h-5 w-5" />
                No Answer
              </button>
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
