import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentToggleButton } from './AgentToggleButton';

describe('AgentToggleButton', () => {
  const defaultUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  };

  const defaultProps = {
    onClick: vi.fn(),
    usage: defaultUsage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render floating button', () => {
      render(<AgentToggleButton {...defaultProps} />);

      const button = screen.getByLabelText('Open AI Assistant (Cmd+K)');
      expect(button).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
      const { container } = render(<AgentToggleButton {...defaultProps} />);

      const wrapper = container.querySelector('.fixed');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('bottom-6', 'right-6');
    });

    it('should have rounded shape', () => {
      render(<AgentToggleButton {...defaultProps} />);

      const button = screen.getByLabelText('Open AI Assistant (Cmd+K)');
      expect(button).toHaveClass('rounded-full');
    });

    it('should display icon', () => {
      const { container } = render(<AgentToggleButton {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('click interaction', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      const button = screen.getByLabelText('Open AI Assistant (Cmd+K)');
      await userEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning badge', () => {
    it('should not show warning badge when usage is under 80%', () => {
      const usage = {
        inputTokens: 40000,
        outputTokens: 30000,
        totalCost: 0.01,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={100000} />
      );

      const badge = container.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show warning badge when usage is 80%', () => {
      const usage = {
        inputTokens: 50000,
        outputTokens: 30000,
        totalCost: 0.02,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={100000} />
      );

      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });

    it('should show warning badge when usage is over 80%', () => {
      const usage = {
        inputTokens: 60000,
        outputTokens: 30000,
        totalCost: 0.03,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={100000} />
      );

      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });

    it('should animate warning badge', () => {
      const usage = {
        inputTokens: 85000,
        outputTokens: 0,
        totalCost: 0.02,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={100000} />
      );

      const badge = container.querySelector('.bg-red-500');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('should calculate usage based on total tokens', () => {
      const usage = {
        inputTokens: 40000,
        outputTokens: 41000,
        totalCost: 0.02,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={100000} />
      );

      // 81000 / 100000 = 81% > 80%, should show badge
      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('keyboard shortcut', () => {
    it('should trigger onClick on Cmd+K', () => {
      const onClick = vi.fn();
      render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(window, { key: 'k', metaKey: true });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger onClick on Ctrl+K', () => {
      const onClick = vi.fn();
      render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on keyboard shortcut', () => {
      const onClick = vi.fn();
      render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      fireEvent(window, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not trigger on other key combinations', () => {
      const onClick = vi.fn();
      render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(window, { key: 'j', metaKey: true });
      fireEvent.keyDown(window, { key: 'k' }); // No modifier

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should clean up keyboard listener on unmount', () => {
      const onClick = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<AgentToggleButton {...defaultProps} onClick={onClick} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('accessibility', () => {
    it('should have aria-label', () => {
      render(<AgentToggleButton {...defaultProps} />);

      const button = screen.getByLabelText('Open AI Assistant (Cmd+K)');
      expect(button).toBeInTheDocument();
    });

    it('should have title attribute', () => {
      render(<AgentToggleButton {...defaultProps} />);

      const button = screen.getByTitle('Open AI Assistant (Cmd+K)');
      expect(button).toBeInTheDocument();
    });
  });

  describe('default budget limit', () => {
    it('should use default budget of 100000 when not specified', () => {
      const usage = {
        inputTokens: 85000,
        outputTokens: 0,
        totalCost: 0.02,
      };

      const { container } = render(<AgentToggleButton {...defaultProps} usage={usage} />);

      // 85000 / 100000 = 85% > 80%, should show badge
      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('custom budget limit', () => {
    it('should use custom budget limit when provided', () => {
      const usage = {
        inputTokens: 40000,
        outputTokens: 5000,
        totalCost: 0.01,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={50000} />
      );

      // 45000 / 50000 = 90% > 80%, should show badge
      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });

    it('should not show badge with custom higher limit', () => {
      const usage = {
        inputTokens: 40000,
        outputTokens: 5000,
        totalCost: 0.01,
      };

      const { container } = render(
        <AgentToggleButton {...defaultProps} usage={usage} budgetLimit={200000} />
      );

      // 45000 / 200000 = 22.5% < 80%, should not show badge
      const badge = container.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('z-index', () => {
    it('should have appropriate z-index for floating', () => {
      const { container } = render(<AgentToggleButton {...defaultProps} />);

      const wrapper = container.querySelector('.z-30');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('keyboard hint tooltip', () => {
    it('should render keyboard hint', () => {
      const { container } = render(<AgentToggleButton {...defaultProps} />);

      const tooltip = container.querySelector('div:has-text("Cmd+K")');
      expect(tooltip).toBeTruthy();
    });
  });
});
