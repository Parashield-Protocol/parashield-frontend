import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, within } from '@testing-library/react';
import { ClaimHistoryTable } from '../components/ClaimHistoryTable';
import type { Claim } from '../types';

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    policyId: 'policy-1',
    claimant: 'GWALLET',
    triggerMet: true,
    status: 'Paid',
    submittedAt: 1_720_000_000,
    processedAt: null,
    payoutAmount: '1000000',
    ...overrides,
  };
}

describe('ClaimHistoryTable', () => {
  it('renders empty state when no claims', () => {
    const html = renderToStaticMarkup(<ClaimHistoryTable claims={[]} />);
    expect(html).toContain('No claims yet');
  });

  it('renders claims in a table', () => {
    const claims = [
      makeClaim({ id: 'claim-1', status: 'Paid' }),
      makeClaim({ id: 'claim-2', status: 'Processing' }),
    ];

    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('claim-1');
    expect(html).toContain('claim-2');
    expect(html).toContain('Paid');
    expect(html).toContain('Processing');
  });

  it('links each claim row to its policy details', () => {
    const html = renderToStaticMarkup(
      <ClaimHistoryTable claims={[makeClaim({ id: 'claim-1', policyId: 'policy-123' })]} />,
    );

    expect(html.match(/href="\/policies\/policy-123"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="View policy for claim claim-1"');
  });

  it('displays trigger status correctly', () => {
    const claims = [
      makeClaim({ id: 'claim-1', triggerMet: true }),
      makeClaim({ id: 'claim-2', triggerMet: false }),
    ];

    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('Met');
    expect(html).toContain('Not met');
  });

  it('displays payout amount correctly', () => {
    const claims = [
      makeClaim({ id: 'claim-1', payoutAmount: '1000000' }),
      makeClaim({ id: 'claim-2', payoutAmount: undefined }),
    ];

    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('0.10');
    expect(html).toContain('—');
  });

  it('displays transaction link for paid claims with txHash', () => {
    const claims = [
      makeClaim({ id: 'claim-1', status: 'Paid', txHash: 'tx-abc123' }),
    ];

    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('tx-abc123');
  });

  it('displays dash for claims without txHash', () => {
    const claims = [
      makeClaim({ id: 'claim-1', status: 'Paid', txHash: undefined }),
    ];

    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('—');
  });

  it('renders sort buttons for sortable columns', () => {
    const claims = [makeClaim()];
    const html = renderToStaticMarkup(<ClaimHistoryTable claims={claims} />);
    expect(html).toContain('Trigger');
    expect(html).toContain('Payout');
    expect(html).toContain('Submitted');
    expect(html).toContain('Status');
  });

  // #754: mobile used to swap the table for <div> cards, so screen readers
  // announced cards instead of a table. The same <table> must now serve every
  // viewport, with CSS doing the stacking.
  describe('table semantics on mobile (#754)', () => {
    const claims = [
      makeClaim({ id: 'claim-1', txHash: 'tx-abc123' }),
      makeClaim({ id: 'claim-2', status: 'Processing' }),
    ];

    it('renders a single table with no separate card layout', () => {
      const { container } = render(<ClaimHistoryTable claims={claims} />);
      expect(container.querySelectorAll('table')).toHaveLength(1);
      expect(container.querySelector('.md\\:hidden, .hidden.md\\:block')).toBeNull();
    });

    it('exposes table, row, columnheader and cell roles', () => {
      render(<ClaimHistoryTable claims={claims} />);
      const table = screen.getByRole('table');
      expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
      // header row + one row per claim
      expect(within(table).getAllByRole('row')).toHaveLength(claims.length + 1);
      expect(within(table).getAllByRole('cell')).toHaveLength(claims.length * 7);
    });

    it('gives every cell a data-label matching its column header', () => {
      const { container } = render(<ClaimHistoryTable claims={claims} />);
      const headers = Array.from(container.querySelectorAll('thead th')).map((th) =>
        th.textContent?.replace(/[↑↓]/g, '').trim(),
      );
      for (const row of Array.from(container.querySelectorAll('tbody tr'))) {
        const labels = Array.from(row.querySelectorAll('td')).map((td) => td.getAttribute('data-label'));
        expect(labels).toEqual(headers);
      }
    });

    it('uses the responsive-table class backed by a mobile stacking rule', () => {
      render(<ClaimHistoryTable claims={claims} />);
      expect(screen.getByRole('table')).toHaveClass('responsive-table');

      const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
      expect(css).toMatch(/@media \(max-width: 47\.999rem\)[\s\S]*\.responsive-table td\[data-label\]::before[\s\S]*content: attr\(data-label\)/);
    });
  });
});
