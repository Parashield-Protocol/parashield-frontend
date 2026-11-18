import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';
import { STATUS_COLOURS } from '@/lib/constants';

describe('Badge', () => {
  it('applies colour based on known status label', () => {
    render(<Badge label="Active" />);
    const span = screen.getByText('Active');
    // STATUS_COLOURS['Active'] -> 'emerald'
    expect(span).toHaveClass('bg-emerald-500/10');
  });

  it('falls back to gray for unknown label', () => {
    render(<Badge label="UnknownStatus" />);
    const span = screen.getByText('UnknownStatus');
    expect(span).toHaveClass('bg-gray-500/10');
  });

  it('uses explicit variant prop to override status colour', () => {
    render(<Badge label="Active" variant="red" />);
    const span = screen.getByText('Active');
    expect(span).toHaveClass('bg-red-500/10');
  });
});

describe('Badge size', () => {
  it('defaults to sm, preserving the original sizing', () => {
    render(<Badge label="Active" />);
    const span = screen.getByText('Active');
    expect(span).toHaveClass('px-2.5', 'py-0.5', 'text-[10px]');
  });

  it('applies md sizing classes', () => {
    render(<Badge label="Active" size="md" />);
    const span = screen.getByText('Active');
    expect(span).toHaveClass('px-3', 'py-1', 'text-xs');
    expect(span).not.toHaveClass('text-[10px]');
  });

  it('applies lg sizing classes', () => {
    render(<Badge label="Active" size="lg" />);
    const span = screen.getByText('Active');
    expect(span).toHaveClass('px-4', 'py-1.5', 'text-sm');
  });
});
