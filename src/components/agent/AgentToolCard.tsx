'use client';

import { Loader2, CheckCircle, XCircle, Wrench } from 'lucide-react';
import type { AgentToolCall } from '@/types/agent';

interface AgentToolCardProps {
  toolCall: AgentToolCall;
}

export function AgentToolCard({ toolCall }: AgentToolCardProps) {
  const { name, status, result, error } = toolCall;

  const getIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-200';
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
    }
  };

  const formatToolName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderResult = (): React.ReactNode => {
    if (!result) return null;

    // Handle array results (e.g., task lists)
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return <p className="text-sm text-gray-500 italic">No results found</p>;
      }

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                {Object.keys(result[0]).map(key => (
                  <th key={key} className="px-2 py-1 text-left font-medium text-gray-700">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.slice(0, 5).map((item, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  {Object.values(item).map((value, vIdx) => (
                    <td key={vIdx} className="px-2 py-1 text-gray-600">
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.length > 5 && (
            <p className="mt-2 text-xs text-gray-500">
              Showing 5 of {result.length} results
            </p>
          )}
        </div>
      );
    }

    // Handle object results
    if (typeof result === 'object' && result !== null) {
      return (
        <div className="space-y-1">
          {Object.entries(result).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-gray-700">{key}:</span>
              <span className="text-gray-600">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Handle string/primitive results
    return <p className="text-sm text-gray-600 whitespace-pre-wrap">{String(result)}</p>;
  };

  return (
    <div
      className={`rounded-lg border-2 ${getBorderColor()} bg-white p-3 shadow-sm transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-900">{formatToolName(name)}</span>
        {getIcon()}
      </div>

      {status === 'running' && (
        <p className="text-sm text-gray-500">Processing...</p>
      )}

      {status === 'success' && result !== undefined && (
        <div className="mt-2">{renderResult()}</div>
      )}

      {status === 'error' && error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
