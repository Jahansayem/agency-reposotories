'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { type TaskMatch, getConfidenceLevel } from '@/lib/retroactiveLinking';

type MatchStatus = 'pending' | 'approved' | 'rejected';
type ConfidenceFilter = 'all' | 'high' | 'medium';

interface MatchWithStatus extends TaskMatch {
  status: MatchStatus;
}

async function fetchMatches(): Promise<TaskMatch[]> {
  const res = await fetch('/api/admin/retroactive-matches');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch matches');
  }
  const data = await res.json();
  return data.matches;
}

async function applyLinks(
  approvedMatches: Array<{ taskId: string; customerId: string }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const res = await fetch('/api/admin/apply-retroactive-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedMatches }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to apply links');
  }
  return res.json();
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = getConfidenceLevel(confidence);
  const percent = Math.round(confidence * 100);

  const styles: Record<string, string> = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[level]}`}
    >
      {percent}% {level}
    </span>
  );
}

export function RetroactiveLinkingTool() {
  const [matches, setMatches] = useState<MatchWithStatus[]>([]);
  const [filter, setFilter] = useState<ConfidenceFilter>('all');
  const [applyResult, setApplyResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Fetch matches query - manual trigger via refetch()
  const {
    refetch,
    isFetching,
    error: fetchError,
    isError,
  } = useQuery({
    queryKey: ['retroactive-matches'],
    queryFn: fetchMatches,
    enabled: false,
    retry: false,
  });

  // Apply links mutation
  const applyMutation = useMutation({
    mutationFn: applyLinks,
    onSuccess: (result) => {
      setApplyResult(result);
      // Remove successfully applied matches from the list
      if (result.success > 0) {
        setMatches((prev) => prev.filter((m) => m.status !== 'approved'));
      }
    },
  });

  const handleFindMatches = async () => {
    setApplyResult(null);
    const result = await refetch();
    if (result.data) {
      setMatches(result.data.map((m) => ({ ...m, status: 'pending' as MatchStatus })));
    }
  };

  const setMatchStatus = (taskId: string, customerId: string, status: MatchStatus) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.taskId === taskId && m.customerId === customerId ? { ...m, status } : m
      )
    );
  };

  const approveAllHighConfidence = () => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.status === 'pending' && getConfidenceLevel(m.confidence) === 'high') {
          return { ...m, status: 'approved' };
        }
        return m;
      })
    );
  };

  const handleApplyLinks = () => {
    const approved = matches
      .filter((m) => m.status === 'approved')
      .map((m) => ({ taskId: m.taskId, customerId: m.customerId }));

    if (approved.length > 0) {
      applyMutation.mutate(approved);
    }
  };

  // Filter matches by confidence level
  const filteredMatches = useMemo(() => {
    if (filter === 'all') return matches;
    return matches.filter((m) => {
      const level = getConfidenceLevel(m.confidence);
      if (filter === 'high') return level === 'high';
      if (filter === 'medium') return level === 'medium';
      return true;
    });
  }, [matches, filter]);

  const approvedCount = matches.filter((m) => m.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleFindMatches}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
          {isFetching ? 'Scanning...' : 'Find Matches'}
        </button>

        {matches.length > 0 && (
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ConfidenceFilter)}
              className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm"
            >
              <option value="all">All Matches</option>
              <option value="high">High Only (&ge;70%)</option>
              <option value="medium">Medium Only (40-69%)</option>
            </select>

            <button
              onClick={approveAllHighConfidence}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-300 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              Approve All High Confidence
            </button>

            {approvedCount > 0 && (
              <button
                onClick={handleApplyLinks}
                disabled={applyMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply {approvedCount} Link{approvedCount !== 1 ? 's' : ''}
              </button>
            )}
          </>
        )}
      </div>

      {/* Error state */}
      {isError && fetchError && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Failed to find matches: {fetchError instanceof Error ? fetchError.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Apply result feedback */}
      {applyResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border ${
            applyResult.failed > 0
              ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {applyResult.failed > 0 ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-medium">
              {applyResult.success} link{applyResult.success !== 1 ? 's' : ''} applied
              {applyResult.failed > 0 && `, ${applyResult.failed} failed`}
            </p>
            {applyResult.errors.length > 0 && (
              <ul className="mt-1 list-disc list-inside">
                {applyResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Apply mutation error */}
      {applyMutation.isError && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Failed to apply links:{' '}
            {applyMutation.error instanceof Error ? applyMutation.error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Results table */}
      {matches.length > 0 && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                    Task
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                    Matched On
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                    Confidence
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => (
                  <tr
                    key={`${match.taskId}-${match.customerId}`}
                    className={`border-b border-[var(--border)] last:border-b-0 ${
                      match.status === 'approved'
                        ? 'bg-green-50/50'
                        : match.status === 'rejected'
                          ? 'bg-red-50/30 opacity-60'
                          : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-[var(--foreground)] line-clamp-2 max-w-xs">
                        {match.taskText}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">{match.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--text-muted)]">{match.matchedOn}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge confidence={match.confidence} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {match.status === 'pending' && (
                          <>
                            <button
                              onClick={() =>
                                setMatchStatus(match.taskId, match.customerId, 'approved')
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                              title="Approve"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setMatchStatus(match.taskId, match.customerId, 'rejected')
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                              title="Reject"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {match.status === 'approved' && (
                          <button
                            onClick={() =>
                              setMatchStatus(match.taskId, match.customerId, 'pending')
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
                            title="Undo approval"
                          >
                            Undo
                          </button>
                        )}
                        {match.status === 'rejected' && (
                          <button
                            onClick={() =>
                              setMatchStatus(match.taskId, match.customerId, 'pending')
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
                            title="Undo rejection"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMatches.length === 0 && (
            <div className="p-8 text-center text-[var(--text-muted)]">
              No matches found for the selected filter.
            </div>
          )}
        </div>
      )}

      {/* Empty state - no matches found after search */}
      {matches.length === 0 && !isFetching && !isError && (
        <div className="p-12 text-center border border-[var(--border)] rounded-lg bg-[var(--surface)]">
          <p className="text-[var(--text-muted)] text-lg">
            Click &quot;Find Matches&quot; to scan completed tasks for customer name matches.
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            This will compare completed tasks (without a customer link) against your customer
            database.
          </p>
        </div>
      )}
    </div>
  );
}
