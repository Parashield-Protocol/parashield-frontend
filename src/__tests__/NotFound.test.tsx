import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '../app/not-found';

describe('NotFound (#899)', () => {
  it('is a labelled main landmark, not a live alert region', () => {
    render(<NotFound />);

    const main = screen.getByRole('main', { name: 'Page not found' });
    expect(main).not.toHaveAttribute('role', 'alert');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
