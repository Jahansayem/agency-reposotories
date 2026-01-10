/**
 * BulkActionBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionBar from '@/components/todo/BulkActionBar';

describe('BulkActionBar', () => {
  const defaultProps = {
    selectedCount: 3,
    users: ['User1', 'User2', 'User3'],
    onClearSelection: vi.fn(),
    onBulkDelete: vi.fn(),
    onBulkComplete: vi.fn(),
    onBulkAssign: vi.fn(),
    onBulkReschedule: vi.fn(),
    onBulkSetPriority: vi.fn(),
    onInitiateMerge: vi.fn(),
    onGenerateEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render selected count', () => {
    render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('should render all action buttons', () => {
    render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByTitle('Mark all as complete')).toBeInTheDocument();
    expect(screen.getByTitle('Assign to user')).toBeInTheDocument();
    expect(screen.getByTitle('Reschedule')).toBeInTheDocument();
    expect(screen.getByTitle('Set priority')).toBeInTheDocument();
    expect(screen.getByTitle('Merge selected tasks')).toBeInTheDocument();
    expect(screen.getByTitle('Generate customer email')).toBeInTheDocument();
    expect(screen.getByTitle('Delete selected')).toBeInTheDocument();
  });

  it('should call onClearSelection when clicking X button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const clearButton = screen.getByLabelText('Clear selection');
    fireEvent.click(clearButton);

    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });

  it('should call onBulkComplete when clicking Complete button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const completeButton = screen.getByTitle('Mark all as complete');
    fireEvent.click(completeButton);

    expect(defaultProps.onBulkComplete).toHaveBeenCalled();
  });

  it('should call onBulkDelete when clicking Delete button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete selected');
    fireEvent.click(deleteButton);

    expect(defaultProps.onBulkDelete).toHaveBeenCalled();
  });

  it('should call onGenerateEmail when clicking Email button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const emailButton = screen.getByTitle('Generate customer email');
    fireEvent.click(emailButton);

    expect(defaultProps.onGenerateEmail).toHaveBeenCalled();
  });

  it('should call onInitiateMerge when clicking Merge button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const mergeButton = screen.getByTitle('Merge selected tasks');
    fireEvent.click(mergeButton);

    expect(defaultProps.onInitiateMerge).toHaveBeenCalled();
  });

  it('should NOT show Merge button when less than 2 selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={1} />);

    expect(screen.queryByTitle('Merge selected tasks')).not.toBeInTheDocument();
  });

  it('should show Merge button when 2 or more selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={2} />);

    expect(screen.getByTitle('Merge selected tasks')).toBeInTheDocument();
  });

  describe('Assign Dropdown', () => {
    it('should show assign dropdown on click', () => {
      render(<BulkActionBar {...defaultProps} />);

      const assignButton = screen.getByTitle('Assign to user');
      fireEvent.click(assignButton);

      expect(screen.getByText('User1')).toBeInTheDocument();
      expect(screen.getByText('User2')).toBeInTheDocument();
      expect(screen.getByText('User3')).toBeInTheDocument();
    });

    it('should call onBulkAssign with selected user', () => {
      render(<BulkActionBar {...defaultProps} />);

      const assignButton = screen.getByTitle('Assign to user');
      fireEvent.click(assignButton);

      const userOption = screen.getByText('User2');
      fireEvent.click(userOption);

      expect(defaultProps.onBulkAssign).toHaveBeenCalledWith('User2');
    });
  });

  describe('Reschedule Dropdown', () => {
    it('should show reschedule dropdown on click', () => {
      render(<BulkActionBar {...defaultProps} />);

      const rescheduleButton = screen.getByTitle('Reschedule');
      fireEvent.click(rescheduleButton);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Next week')).toBeInTheDocument();
    });

    it('should call onBulkReschedule with today date', () => {
      render(<BulkActionBar {...defaultProps} />);

      const rescheduleButton = screen.getByTitle('Reschedule');
      fireEvent.click(rescheduleButton);

      const todayOption = screen.getByText('Today');
      fireEvent.click(todayOption);

      const today = new Date().toISOString().split('T')[0];
      expect(defaultProps.onBulkReschedule).toHaveBeenCalledWith(today);
    });

    it('should call onBulkReschedule with tomorrow date', () => {
      render(<BulkActionBar {...defaultProps} />);

      const rescheduleButton = screen.getByTitle('Reschedule');
      fireEvent.click(rescheduleButton);

      const tomorrowOption = screen.getByText('Tomorrow');
      fireEvent.click(tomorrowOption);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      expect(defaultProps.onBulkReschedule).toHaveBeenCalledWith(tomorrowStr);
    });
  });

  describe('Priority Dropdown', () => {
    it('should show priority dropdown on click', () => {
      render(<BulkActionBar {...defaultProps} />);

      const priorityButton = screen.getByTitle('Set priority');
      fireEvent.click(priorityButton);

      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should call onBulkSetPriority with selected priority', () => {
      render(<BulkActionBar {...defaultProps} />);

      const priorityButton = screen.getByTitle('Set priority');
      fireEvent.click(priorityButton);

      const urgentOption = screen.getByText('Urgent');
      fireEvent.click(urgentOption);

      expect(defaultProps.onBulkSetPriority).toHaveBeenCalledWith('urgent');
    });
  });

  it('should update selected count dynamically', () => {
    const { rerender } = render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();

    rerender(<BulkActionBar {...defaultProps} selectedCount={5} />);

    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });
});
