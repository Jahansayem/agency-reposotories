'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import type { AgentMessage as AgentMessageType } from '@/types/agent';
import { AgentToolCard } from './AgentToolCard';

interface AgentMessageProps {
  message: AgentMessageType;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const { role, content, timestamp, toolCalls } = message;

  const formattedTime = useMemo(() => {
    return format(new Date(timestamp), 'h:mm a');
  }, [timestamp]);

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
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className={`px-1 py-0.5 rounded text-xs font-mono ${
                      isUser ? 'bg-blue-700' : 'bg-gray-200'
                    }`}>
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className={`p-2 rounded mt-2 overflow-x-auto ${
                      isUser ? 'bg-blue-700' : 'bg-gray-200'
                    }`}>
                      {children}
                    </pre>
                  ),
                  a: ({ href, children }) => (
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
                  ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
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
