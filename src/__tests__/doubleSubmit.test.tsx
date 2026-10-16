import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BuyPolicyModal } from '../components/BuyPolicyModal';
import { DepositModal } from '../components/DepositModal';
import { invokeBuyPolicy, buildDepositTx, submitSignedTransaction } from '@/lib/contract';
import { SUBMIT_COOLDOWN_MS } from '@/hooks/useSubmitGuard';
import type { PoolStats, Product } from '../types';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({ address: 'GABC123', connect: vi.fn(), connecting: false, error: null })),
}));
vi.mock('@/context/ToastContext', () => ({ useToast: vi.fn(() => ({ show: vi.fn() })) }));
vi.mock('@/lib/stellar', () => ({ signTransaction: vi.fn(async () => 'signed-xdr') }));
vi.mock('@/lib/api', () => ({
  buyPolicy: vi.fn(async () => ({})),
  fetchPoolShares: vi.fn(async () => ({ shareSupply: '10000000', totalLiquidity: '100000000', paused: false })),
}));

// A request that stays in flight until the test resolves it.
let resolveRequest: () => void = () => {};
vi.mock('@/lib/contract', () => ({
  invokeBuyPolicy: vi.fn(
    () => new Promise((resolve) => { resolveRequest = () => resolve({ txHash: 'abc123def456', signedXdr: 'x' }); }),
  ),
  buildDepositTx: vi.fn(async () => 'unsigned-xdr'),
  submitSignedTransaction: vi.fn(
    () => new Promise<void>((resolve) => { resolveRequest = () => resolve(); }),
  ),
  withStateRestore: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const product: Product = {
  id: 'product-1', name: 'DeFi Cover', category: 'defi', triggerType: 'Threshold', threshold: '30',
  comparison: 'LessThan', coverageMin: '1000000', coverageMax: '100000000', premiumRate: 500,
  maxDuration: 30, status: 'Active',
} as Product;

const pool: PoolStats = {
  poolId: 'pool-1', category: 'crop', totalLiquidity: '100000000', activePolicies: 3, utilizationRate: 0.4, apy: 0.12,
};

/** Let the user "think" between deliberate clicks so the cooldown has passed. */
function pause() {
  act(() => { vi.advanceTimersByTime(SUBMIT_COOLDOWN_MS + 1); });
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

describe('double-click protection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('BuyPolicyModal: double-click on "Confirm details" does not also sign', async () => {
    render(<BuyPolicyModal product={product} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/–/), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flush();
    pause();

    const confirm = screen.getByRole('button', { name: 'Confirm details' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await flush();

    expect(screen.getByRole('button', { name: /sign & confirm/i })).toBeInTheDocument();
    expect(invokeBuyPolicy).not.toHaveBeenCalled();
  });

  it('BuyPolicyModal: rapid clicks on "Sign & Confirm" fire one request and show a loading state', async () => {
    render(<BuyPolicyModal product={product} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/–/), { target: { value: '5' } });
    for (const name of ['Next', 'Confirm details']) {
      fireEvent.click(screen.getByRole('button', { name }));
      await flush();
      pause();
    }

    const sign = screen.getByRole('button', { name: /sign & confirm/i });
    fireEvent.click(sign);
    fireEvent.click(sign);
    await flush();
    // Even after the cooldown, a click while the request is in flight is dropped.
    pause();
    fireEvent.click(sign);
    await flush();

    expect(invokeBuyPolicy).toHaveBeenCalledTimes(1);
    const busyButton = screen.getByRole('button', { name: /submitting/i });
    expect(busyButton).toBeDisabled();
    expect(busyButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => { resolveRequest(); });
  });

  it('DepositModal: double-click submits one deposit and disables the button in flight', async () => {
    render(<DepositModal pool={pool} onClose={vi.fn()} />);
    await flush();
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '10' } });

    const submit = screen.getByRole('button', { name: /confirm deposit/i });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await flush();
    await flush();

    expect(buildDepositTx).toHaveBeenCalledTimes(1);
    expect(submitSignedTransaction).toHaveBeenCalledTimes(1);
    const busyButton = screen.getByRole('button', { name: /confirming on chain/i });
    expect(busyButton).toBeDisabled();
    expect(busyButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => { resolveRequest(); });
  });
});
