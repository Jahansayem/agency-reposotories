/**
 * BulkActionBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock usePermission hook (added during multi-tenancy migration)
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => true,
}));

import BulkActionBar from '@/components/todo/BulkActionBar';

describe('BulkActionBar', () => {
  const getDateOffset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const defaultProps = {
    selectedCount: 3,
    users: ['User1', 'User2', 'User3'],
    viewMode: 'list' as const,
    onClearSelection: vi.fn(),
    onBulkDelete: vi.fn(),
    onBulkComplete: vi.fn(),
    onBulkAssign: vi.fn(),
    onBulkReschedule: vi.fn(),
    onInitiateMerge: vi.fn(),
    getDateOffset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render selected count', () => {
    render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('selected')).toBeInTheDocument();
  });

  it('should call onClearSelection when clicking X button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const clearButton = screen.getByTitle('Clear selection');
    fireEvent.click(clearButton);

    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });

  it('should call onBulkComplete when clicking Mark Complete button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const completeButton = screen.getByText('Mark Complete');
    fireEvent.click(completeButton);

    expect(defaultProps.onBulkComplete).toHaveBeenCalled();
  });

  it('should call onBulkDelete when clicking Delete button', () => {
    render(<BulkActionBar {...defaultProps} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(defaultProps.onBulkDelete).toHaveBeenCalled();
  });

  it('should NOT show Merge button when less than 2 selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={1} />);

    expect(screen.queryByText('Merge')).not.toBeInTheDocument();
  });

  it('should show Merge button when 2 or more selected', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={2} />);

    expect(screen.getByText('Merge')).toBeInTheDocument();
  });

  it('should call onInitiateMerge when clicking Merge button', () => {
    render(<BulkActionBar {...defaultProps} selectedCount={3} />);

    const mergeButton = screen.getByText('Merge');
    fireEvent.click(mergeButton);

    expect(defaultProps.onInitiateMerge).toHaveBeenCalled();
  });

  describe('Reassign Dropdown', () => {
    it('should show user options in Reassign select', () => {
      render(<BulkActionBar {...defaultProps} />);

      const reassignSelect = screen.getByLabelText('Reassign');
      expect(reassignSelect).toBeInTheDocument();

      // Users should be in the select options
      const options = reassignSelect.querySelectorAll('option');
      expect(options.length).toBe(4); // "" + 3 users
      expect(options[1].textContent).toBe('User1');
      expect(options[2].textContent).toBe('User2');
      expect(options[3].textContent).toBe('User3');
    });

    it('should call onBulkAssign when selecting a user', () => {
      render(<BulkActionBar {...defaultProps} />);

      const reassignSelect = screen.getByLabelText('Reassign');
      fireEvent.change(reassignSelect, { target: { value: 'User2' } });

      expect(defaultProps.onBulkAssign).toHaveBeenCalledWith('User2');
    });
  });

  describe('Change Date Dropdown', () => {
    it('should show date options in Change Date select', () => {
      render(<BulkActionBar {...defaultProps} />);

      const dateSelect = screen.getByLabelText('Change Date');
      expect(dateSelect).toBeInTheDocument();

      const options = dateSelect.querySelectorAll('option');
      expect(options.length).toBe(5); // "" + Today, Tomorrow, Next Week, Next Month
    });

    it('should call onBulkReschedule when selecting Today', () => {
      render(<BulkActionBar {...defaultProps} />);

      const dateSelect = screen.getByLabelText('Change Date');
      const today = getDateOffset(0);
      fireEvent.change(dateSelect, { target: { value: today } });

      expect(defaultProps.onBulkReschedule).toHaveBeenCalledWith(today);
    });
  });

  it('should update selected count dynamically', () => {
    const { rerender } = render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(<BulkActionBar {...defaultProps} selectedCount={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
