import { renderToStaticMarkup } from 'react-dom/server';
import { ClaimStatus } from '../components/ClaimStatus';
import type { Claim } from '../types';

const { useClaim, useWallet } = vi.hoisted(() => ({
  useClaim: vi.fn(),
  useWallet: vi.fn(),
}));

vi.mock('@/hooks/useClaim', () => ({ useClaim }));
vi.mock('@/hooks/useWallet', () => ({ useWallet }));

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    policyId: 'policy-1',
    claimant: 'GWALLET',
    triggerMet: true,
    status: 'Processing',
    submittedAt: 1_720_000_000,
    processedAt: null,
    ...overrides,
  };
}

describe('ClaimStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWallet.mockReturnValue({ address: 'GWALLET' });
  });

  it('renders idle state with no claim submitted message', () => {
    useClaim.mockReturnValue({
      step: 'idle',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('No claim submitted for this policy.');
    expect(html).toContain('Submit Claim');
  });

  it('hides submit button when wallet is not connected', () => {
    useWallet.mockReturnValue({ address: null });
    useClaim.mockReturnValue({
      step: 'idle',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('No claim submitted for this policy.');
    expect(html).not.toContain('Submit Claim');
  });

  it('renders submitting state with loading spinner', () => {
    useClaim.mockReturnValue({
      step: 'submitting',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('Submitting claim');
  });

  it('renders polling state with processing message', () => {
    useClaim.mockReturnValue({
      step: 'polling',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('Processing claim');
  });

  it('renders error state with error message and try again button', () => {
    useClaim.mockReturnValue({
      step: 'error',
      claim: null,
      error: 'Transaction failed',
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('Transaction failed');
    expect(html).toContain('Try again');
  });

  it('renders timeout state with claim history link', () => {
    useClaim.mockReturnValue({
      step: 'timeout',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('processing is taking longer than usual');
    expect(html).toContain('claim history');
  });

  it('renders done state with claim details when claim exists', () => {
    const claim = makeClaim({
      status: 'Paid',
      payoutAmount: '1000000',
      triggerMet: true,
      processedAt: 1_720_086_400,
    });

    useClaim.mockReturnValue({
      step: 'done',
      claim,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('Paid');
    expect(html).toContain('paid out');
    expect(html).toContain('Trigger:');
    expect(html).toContain('Met');
  });

  it('renders done state without payout when payoutAmount is null', () => {
    const claim = makeClaim({
      status: 'Rejected',
      payoutAmount: undefined,
      triggerMet: false,
      processedAt: 1_720_086_400,
    });

    useClaim.mockReturnValue({
      step: 'done',
      claim,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toContain('Rejected');
    expect(html).not.toContain('paid out');
    expect(html).toContain('Not met');
  });

  it('renders nothing when step is done but claim is null', () => {
    useClaim.mockReturnValue({
      step: 'done',
      claim: null,
      error: null,
      submit: vi.fn(),
      reset: vi.fn(),
    });

    const html = renderToStaticMarkup(<ClaimStatus policyId="policy-1" />);
    expect(html).toBe('');
  });
});
