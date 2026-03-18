import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentPanel } from './AgentPanel';
import { useAgent } from '@/hooks/useAgent';

// Mock dependencies
vi.mock('@/hooks/useAgent', () => ({
  useAgent: vi.fn(() => ({
    messages: [],
    isLoading: false,
    usage: { inputTokens: 0, outputTokens: 0, totalCost: 0 },
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

vi.mock('./AgentMessage', () => ({
  AgentMessage: ({ message }: any) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}));

vi.mock('./AgentQuickActions', () => ({
  AgentQuickActions: ({ onActionClick }: any) => (
    <div data-testid="quick-actions">
      <button onClick={() => onActionClick('Quick action prompt')}>Quick Action</button>
    </div>
  ),
}));

// Mock framer-motion to avoid AnimatePresence issues in jsdom
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

// jsdom doesn't provide scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockUseAgent = vi.mocked(useAgent);

const defaultMockReturn = {
  messages: [] as any[],
  isLoading: false,
  usage: { inputTokens: 0, outputTokens: 0, totalCost: 0 },
  sendMessage: vi.fn(),
  clearMessages: vi.fn(),
};

describe('AgentPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onMinimize: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock
    mockUseAgent.mockReturnValue({ ...defaultMockReturn, sendMessage: vi.fn(), clearMessages: vi.fn() });
  });

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<AgentPanel {...defaultProps} isOpen={true} />);

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AgentPanel {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
    });
  });

  describe('header controls', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<AgentPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onMinimize when minimize button is clicked', async () => {
      const onMinimize = vi.fn();
      render(<AgentPanel {...defaultProps} onMinimize={onMinimize} />);

      const minimizeButton = screen.getByLabelText('Minimize');
      await userEvent.click(minimizeButton);

      expect(onMinimize).toHaveBeenCalledTimes(1);
    });

    it('should display "AI Assistant" title', () => {
      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });
  });

  describe('input field', () => {
    it('should render textarea', () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Ask me anything... (Cmd+Enter to send)');
      expect(textarea).toBeInTheDocument();
    });

    it('should accept text input', async () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test message');

      expect(textarea).toHaveValue('Test message');
    });

    it('should clear input after sending message', async () => {
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, sendMessage });

      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Test message');

      const sendButton = screen.getByText('Send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should focus textarea when panel opens', async () => {
      const { rerender } = render(<AgentPanel {...defaultProps} isOpen={false} />);

      rerender(<AgentPanel {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveFocus();
      });
    });
  });

  describe('send button', () => {
    it('should be disabled when input is empty', () => {
      render(<AgentPanel {...defaultProps} />);

      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });

    it('should be enabled when input has text', async () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test');

      const sendButton = screen.getByText('Send');
      expect(sendButton).not.toBeDisabled();
    });

    it('should be disabled when loading', () => {
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, isLoading: true });

      render(<AgentPanel {...defaultProps} />);

      const sendButton = screen.getByText('Sending...');
      expect(sendButton).toBeDisabled();
    });

    it('should show loading state when sending', () => {
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, isLoading: true });

      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('should call sendMessage when clicked', async () => {
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, sendMessage });

      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test message');

      const sendButton = screen.getByText('Send');
      await userEvent.click(sendButton);

      expect(sendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  describe('character counter', () => {
    it('should show current character count', async () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Hello');

      expect(screen.getByText(/5 \/ 2000/)).toBeInTheDocument();
    });

    it('should show red text when over limit', async () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });

      const counter = screen.getByText(/2001 \/ 2000/);
      expect(counter).toHaveClass('text-red-600');
    });

    it('should disable send button when over limit', async () => {
      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });

      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should send message on Cmd+Enter', async () => {
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, sendMessage });

      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test message');

      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      expect(sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should send message on Ctrl+Enter', async () => {
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mockUseAgent.mockReturnValue({ ...defaultMockReturn, sendMessage });

      render(<AgentPanel {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Test message');

      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should close panel on Escape', async () => {
      const onClose = vi.fn();
      render(<AgentPanel {...defaultProps} onClose={onClose} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('messages display', () => {
    it('should show welcome message when no messages', () => {
      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText(/Hi! I'm your AI assistant/)).toBeInTheDocument();
      expect(screen.getByText(/Create and manage tasks/)).toBeInTheDocument();
    });

    it('should render messages when available', () => {
      const messages = [
        {
          id: 'msg-1',
          conversationId: 'local',
          role: 'user' as const,
          content: 'Hello',
          createdAt: new Date().toISOString(),
          timestamp: new Date(),
          toolCalls: null,
        },
        {
          id: 'msg-2',
          conversationId: 'local',
          role: 'assistant' as const,
          content: 'Hi there!',
          createdAt: new Date().toISOString(),
          timestamp: new Date(),
          toolCalls: null,
        },
      ];

      mockUseAgent.mockReturnValue({ ...defaultMockReturn, messages });

      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
      expect(screen.queryByText(/Hi! I'm your AI assistant/)).not.toBeInTheDocument();
    });
  });

  describe('usage stats', () => {
    it('should show "No tokens used yet" when usage is zero', () => {
      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText('No tokens used yet')).toBeInTheDocument();
    });

    it('should show token count when tokens used', () => {
      mockUseAgent.mockReturnValue({
        ...defaultMockReturn,
        usage: { inputTokens: 500, outputTokens: 300, totalCost: 0.01 },
      });

      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText(/800 tokens used/)).toBeInTheDocument();
    });

    it('should show cost when available', () => {
      mockUseAgent.mockReturnValue({
        ...defaultMockReturn,
        usage: { inputTokens: 1000, outputTokens: 500, totalCost: 0.0234 },
      });

      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByText(/\$0\.0234/)).toBeInTheDocument();
    });
  });

  describe('quick actions', () => {
    it('should render quick actions component', () => {
      render(<AgentPanel {...defaultProps} />);

      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });

    it('should populate textarea with quick action prompt', async () => {
      render(<AgentPanel {...defaultProps} />);

      const quickActionButton = screen.getByText('Quick Action');
      await userEvent.click(quickActionButton);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Quick action prompt');
    });

    it('should focus textarea after quick action click', async () => {
      render(<AgentPanel {...defaultProps} />);

      const quickActionButton = screen.getByText('Quick Action');
      await userEvent.click(quickActionButton);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveFocus();
      });
    });
  });

  describe('mobile overlay', () => {
    it('should render overlay on mobile', () => {
      const { container } = render(<AgentPanel {...defaultProps} />);

      // With framer-motion mocked, the overlay is rendered as a plain div
      // Look for the overlay by its class combination
      const overlay = container.querySelector('.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should close panel when overlay is clicked', async () => {
      const onClose = vi.fn();
      const { container } = render(<AgentPanel {...defaultProps} onClose={onClose} />);

      const overlay = container.querySelector('.bg-black\\/50') as HTMLElement;
      await userEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
