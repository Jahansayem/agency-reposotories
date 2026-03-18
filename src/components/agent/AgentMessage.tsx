'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import type { AgentMessage as AgentMessageType } from '@/types/agent';
import { AgentToolCard } from './AgentToolCard';
import type { Components } from 'react-markdown';

interface AgentMessageProps {
  message: AgentMessageType;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const { role, content, timestamp, createdAt, toolCalls } = message;

  const formattedTime = useMemo(() => {
    const date = timestamp || new Date(createdAt);
    return format(date, 'h:mm a');
  }, [timestamp, createdAt]);

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-lg px-4 py-2 shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {content && (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
                  code: ({ children }: { children?: React.ReactNode }) => (
                    <code className={`px-1 py-0.5 rounded text-xs font-mono ${
                      isUser ? 'bg-blue-700' : 'bg-gray-200'
                    }`}>
                      {children}
                    </code>
                  ),
                  pre: ({ children }: { children?: React.ReactNode }) => (
                    <pre className={`p-2 rounded mt-2 overflow-x-auto ${
                      isUser ? 'bg-blue-700' : 'bg-gray-200'
                    }`}>
                      {children}
                    </pre>
                  ),
                  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline ${
                        isUser ? 'text-blue-100' : 'text-blue-600'
                      }`}
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside my-2">{children}</ul>,
                  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
                  li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}

          {toolCalls && toolCalls.length > 0 && (
            <div className="space-y-2 mt-2">
              {toolCalls.map(toolCall => (
                <AgentToolCard key={toolCall.id} toolCall={toolCall} />
              ))}
            </div>
          )}
        </div>

        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-left' : 'text-right'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
}
