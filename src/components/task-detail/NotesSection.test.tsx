import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotesSection from './NotesSection';

describe('NotesSection', () => {
  const defaultProps = {
    notes: '',
    onNotesChange: vi.fn(),
    onSaveNotes: vi.fn(),
    canEdit: true,
  };

  it('renders textarea with initial notes value', () => {
    render(<NotesSection {...defaultProps} notes="Initial notes" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Initial notes');
  });

  it('shows manual save button when canEdit is true', () => {
    render(<NotesSection {...defaultProps} canEdit={true} notes="Some notes" />);
    const saveButton = screen.getByTitle('Save now');
    expect(saveButton).toBeInTheDocument();
  });

  it('hides manual save button when canEdit is false', () => {
    render(<NotesSection {...defaultProps} canEdit={false} notes="Some notes" />);
    const saveButton = screen.queryByTitle('Save now');
    expect(saveButton).not.toBeInTheDocument();
  });

  it('displays character count correctly', () => {
    render(<NotesSection {...defaultProps} notes="Hello" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
