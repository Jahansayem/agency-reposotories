'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useAgent } from '@/hooks/useAgent';
import { AgentMessage } from './AgentMessage';
import { AgentQuickActions } from './AgentQuickActions';

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

const MAX_CHARS = 2000;

export function AgentPanel({ isOpen, onClose, onMinimize }: AgentPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, usage, sendMessage } = useAgent();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    await sendMessage(inputValue);
    setInputValue('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMinimize}
                  aria-label="Minimize"
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b bg-gray-50">
              <AgentQuickActions onActionClick={handleQuickAction} />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <p className="text-gray-500 text-sm">
                      Hi! I&apos;m your AI assistant. I can help you:
                    </p>
                    <ul className="text-gray-600 text-sm space-y-1 text-left max-w-xs mx-auto">
                      <li>• Create and manage tasks</li>
                      <li>• Find and segment customers</li>
                      <li>• Analyze team workload</li>
                      <li>• Answer questions about your data</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(message => (
                    <AgentMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything... (Cmd+Enter to send)"
                  className="min-h-[80px] resize-none"
                  disabled={isLoading}
                  maxLength={MAX_CHARS + 100} // Soft limit with visual feedback
                />

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs ${
                      isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {charCount} / {MAX_CHARS}
                  </span>

                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim() || isOverLimit}
                    size="sm"
                    className="gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer - Usage Stats */}
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-600">
              {usage.inputTokens + usage.outputTokens > 0 ? (
                <span>
                  {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens used
                  {usage.totalCost > 0 && ` • $${usage.totalCost.toFixed(4)}`}
                </span>
              ) : (
                <span>No tokens used yet</span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
