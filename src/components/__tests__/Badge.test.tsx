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
