/**
 * ErrorState Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorState from '@/components/todo/ErrorState';

describe('ErrorState', () => {
  it('should render error message', () => {
    render(<ErrorState error="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render setup required title', () => {
    render(<ErrorState error="Test error" />);

    expect(screen.getByText('Setup Required')).toBeInTheDocument();
  });

  it('should render setup instructions hint', () => {
    render(<ErrorState error="Test error" />);

    expect(screen.getByText('See SETUP.md for instructions')).toBeInTheDocument();
  });

  it('should render alert icon', () => {
    const { container } = render(<ErrorState error="Test error" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have centered layout', () => {
    const { container } = render(<ErrorState error="Test error" />);

    const mainContainer = container.querySelector('.flex.items-center.justify-center');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should have danger-colored icon container', () => {
    const { container } = render(<ErrorState error="Test error" />);

    const iconContainer = container.querySelector('.bg-\\[var\\(--danger-light\\)\\]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should display different error messages correctly', () => {
    const { rerender } = render(<ErrorState error="Error 1" />);
    expect(screen.getByText('Error 1')).toBeInTheDocument();

    rerender(<ErrorState error="Supabase is not configured" />);
    expect(screen.getByText('Supabase is not configured')).toBeInTheDocument();

    rerender(<ErrorState error="Network connection failed" />);
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('should have max width container', () => {
    const { container } = render(<ErrorState error="Test error" />);

    const card = container.querySelector('.max-w-md');
    expect(card).toBeInTheDocument();
  });

  it('should have proper styling for card', () => {
    const { container } = render(<ErrorState error="Test error" />);

    const card = container.querySelector('.rounded-\\[var\\(--radius-xl\\)\\]');
    expect(card).toBeInTheDocument();
  });
});
