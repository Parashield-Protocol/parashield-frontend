import { renderToStaticMarkup } from 'react-dom/server';
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
});
