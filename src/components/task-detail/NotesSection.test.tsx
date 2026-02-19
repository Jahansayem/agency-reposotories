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
});
