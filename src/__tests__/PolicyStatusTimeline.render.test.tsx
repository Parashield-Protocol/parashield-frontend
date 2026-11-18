import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PolicyStatusTimeline } from '../components/PolicyStatusTimeline';
import type { Policy } from '../types';

function makePolicy(status: Policy['status']): Policy {
  return {
    id: 'policy-1',
    productId: 'product-1',
    policyholder: 'GABCDEF1234567890',
    coverage: '10000000',
    premiumPaid: '500000',
    oracleKey: 'weather:lagos',
    startTime: 1_720_000_000,
    endTime: 1_720_086_400,
    status,
  };
}

describe('PolicyStatusTimeline rendering (#700)', () => {
  it('renders every step and no toggle by default', () => {
    render(<PolicyStatusTimeline policy={makePolicy('Active')} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('puts only the current step in the DOM while collapsed', () => {
    render(<PolicyStatusTimeline policy={makePolicy('Active')} collapsible />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Oracle monitoring');
    expect(screen.queryByText('Policy expires')).toBeNull();
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('expands to all steps and collapses back', () => {
    render(<PolicyStatusTimeline policy={makePolicy('Expired')} collapsible />);
    const toggle = screen.getByRole('button', { name: 'Show all 3 steps' });

    fireEvent.click(toggle);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Policy expires');
  });

  it('respects defaultCollapsed={false}', () => {
    render(
      <PolicyStatusTimeline policy={makePolicy('Active')} collapsible defaultCollapsed={false} />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows the cancelled step as current for a cancelled policy', () => {
    render(<PolicyStatusTimeline policy={makePolicy('Cancelled')} collapsible />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Policy cancelled');
  });
});
