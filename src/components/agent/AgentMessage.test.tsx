import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentMessage } from './AgentMessage';
import type { AgentMessage as AgentMessageType } from '@/types/agent';

// Mock AgentToolCard component
vi.mock('./AgentToolCard', () => ({
  AgentToolCard: ({ toolCall }: any) => (
    <div data-testid={`tool-card-${toolCall.id}`}>{toolCall.name}</div>
  ),
}));

describe('AgentMessage', () => {
  const baseMessage: AgentMessageType = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello',
    createdAt: '2026-02-19T10:00:00Z',
    timestamp: new Date('2026-02-19T10:00:00Z'),
    toolCalls: null,
  };

  describe('role-based styling', () => {
    it('should style user messages with blue background', () => {
      const message = { ...baseMessage, role: 'user' as const };
      const { container } = render(<AgentMessage message={message} />);

      const messageBox = container.querySelector('.bg-blue-600');
      expect(messageBox).toBeInTheDocument();
      expect(messageBox).toHaveClass('text-white');
    });

    it('should style assistant messages with gray background', () => {
      const message = { ...baseMessage, role: 'assistant' as const };
      const { container } = render(<AgentMessage message={message} />);

      const messageBox = container.querySelector('.bg-gray-100');
      expect(messageBox).toBeInTheDocument();
      expect(messageBox).toHaveClass('text-gray-900');
    });

    it('should align user messages to left', () => {
      const message = { ...baseMessage, role: 'user' as const };
      const { container } = render(<AgentMessage message={message} />);

      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });

    it('should align assistant messages to right', () => {
      const message = { ...baseMessage, role: 'assistant' as const };
      const { container } = render(<AgentMessage message={message} />);

      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('content rendering', () => {
    it('should render plain text content', () => {
      const message = { ...baseMessage, content: 'Plain text message' };
      render(<AgentMessage message={message} />);

      expect(screen.getByText('Plain text message')).toBeInTheDocument();
    });

    it('should render markdown bold text', () => {
      const message = { ...baseMessage, content: 'This is **bold** text' };
      const { container } = render(<AgentMessage message={message} />);

      const bold = container.querySelector('strong');
      expect(bold).toBeInTheDocument();
      expect(bold?.textContent).toBe('bold');
    });

    it('should render markdown italic text', () => {
      const message = { ...baseMessage, content: 'This is *italic* text' };
      const { container } = render(<AgentMessage message={message} />);

      const italic = container.querySelector('em');
      expect(italic).toBeInTheDocument();
      expect(italic?.textContent).toBe('italic');
    });

    it('should render markdown inline code', () => {
      const message = { ...baseMessage, content: 'Use `console.log()` here' };
      const { container } = render(<AgentMessage message={message} />);

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toBe('console.log()');
    });

    it('should render markdown links', () => {
      const message = { ...baseMessage, content: 'Visit [Google](https://google.com)' };
      const { container } = render(<AgentMessage message={message} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.href).toBe('https://google.com/');
      expect(link?.textContent).toBe('Google');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render markdown lists', () => {
      const message = {
        ...baseMessage,
        content: '- Item 1\n- Item 2\n- Item 3',
      };
      const { container } = render(<AgentMessage message={message} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list?.querySelectorAll('li')).toHaveLength(3);
    });

    it('should render markdown code blocks', () => {
      const message = {
        ...baseMessage,
        content: '```\nconst x = 1;\n```',
      };
      const { container } = render(<AgentMessage message={message} />);

      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('should format timestamp correctly', () => {
      const message = {
        ...baseMessage,
        timestamp: new Date('2026-02-19T14:30:00Z'),
      };
      render(<AgentMessage message={message} />);

      // Format should be "h:mm a" (e.g., "2:30 PM")
      // Exact format depends on timezone, so just check it exists
      const timeElement = screen.getByText(/\d{1,2}:\d{2}\s[AP]M/i);
      expect(timeElement).toBeInTheDocument();
    });

    it('should use createdAt if timestamp not provided', () => {
      const message = {
        ...baseMessage,
        timestamp: undefined,
        createdAt: '2026-02-19T14:30:00Z',
      };
      render(<AgentMessage message={message} />);

      const timeElement = screen.getByText(/\d{1,2}:\d{2}\s[AP]M/i);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('tool calls rendering', () => {
    it('should render AgentToolCard for each tool call', () => {
      const message: AgentMessageType = {
        ...baseMessage,
        role: 'assistant',
        toolCalls: [
          {
            id: 'tool-1',
            name: 'search_tasks',
            status: 'success',
            input: {},
            result: { count: 5 },
          },
          {
            id: 'tool-2',
            name: 'create_task',
            status: 'running',
            input: {},
          },
        ],
      };

      render(<AgentMessage message={message} />);

      expect(screen.getByTestId('tool-card-tool-1')).toBeInTheDocument();
      expect(screen.getByTestId('tool-card-tool-2')).toBeInTheDocument();
    });

    it('should not render tool section when toolCalls is null', () => {
      const message = { ...baseMessage, toolCalls: null };
      const { container } = render(<AgentMessage message={message} />);

      expect(container.querySelector('[data-testid^="tool-card-"]')).not.toBeInTheDocument();
    });

    it('should not render tool section when toolCalls is empty array', () => {
      const message = { ...baseMessage, toolCalls: [] };
      const { container } = render(<AgentMessage message={message} />);

      expect(container.querySelector('[data-testid^="tool-card-"]')).not.toBeInTheDocument();
    });
  });

  describe('message layout', () => {
    it('should have max width constraint', () => {
      const message = baseMessage;
      const { container } = render(<AgentMessage message={message} />);

      const contentWrapper = container.querySelector('.max-w-\\[80\\%\\]');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const message = baseMessage;
      const { container } = render(<AgentMessage message={message} />);

      const messageBox = container.querySelector('.rounded-lg');
      expect(messageBox).toBeInTheDocument();
    });

    it('should have shadow', () => {
      const message = baseMessage;
      const { container } = render(<AgentMessage message={message} />);

      const messageBox = container.querySelector('.shadow-sm');
      expect(messageBox).toBeInTheDocument();
    });
  });

  describe('markdown styling for user vs assistant', () => {
    it('should use blue code background for user messages', () => {
      const message = {
        ...baseMessage,
        role: 'user' as const,
        content: 'Use `code` here',
      };
      const { container } = render(<AgentMessage message={message} />);

      const code = container.querySelector('code');
      expect(code).toHaveClass('bg-blue-700');
    });

    it('should use gray code background for assistant messages', () => {
      const message = {
        ...baseMessage,
        role: 'assistant' as const,
        content: 'Use `code` here',
      };
      const { container } = render(<AgentMessage message={message} />);

      const code = container.querySelector('code');
      expect(code).toHaveClass('bg-gray-200');
    });

    it('should style links differently for user messages', () => {
      const message = {
        ...baseMessage,
        role: 'user' as const,
        content: '[Link](https://example.com)',
      };
      const { container } = render(<AgentMessage message={message} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-blue-100');
    });

    it('should style links differently for assistant messages', () => {
      const message = {
        ...baseMessage,
        role: 'assistant' as const,
        content: '[Link](https://example.com)',
      };
      const { container } = render(<AgentMessage message={message} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-blue-600');
    });
  });

  describe('empty content', () => {
    it('should render even with empty content', () => {
      const message = { ...baseMessage, content: '' };
      const { container } = render(<AgentMessage message={message} />);

      // Should still render the message container
      const messageBox = container.querySelector('.rounded-lg');
      expect(messageBox).toBeInTheDocument();
    });
  });

  describe('mixed content', () => {
    it('should render both content and tool calls', () => {
      const message: AgentMessageType = {
        ...baseMessage,
        role: 'assistant',
        content: 'Found 5 tasks',
        toolCalls: [
          {
            id: 'tool-1',
            name: 'search_tasks',
            status: 'success',
            input: {},
            result: { count: 5 },
          },
        ],
      };

      render(<AgentMessage message={message} />);

      expect(screen.getByText('Found 5 tasks')).toBeInTheDocument();
      expect(screen.getByTestId('tool-card-tool-1')).toBeInTheDocument();
    });
  });
});
