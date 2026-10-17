import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { TransactionProgress, TX_COMPLETE, type TransactionStep } from '../components/TransactionProgress';
import { BuyPolicyModal } from '../components/BuyPolicyModal';
import { invokeBuyPolicy, type TxProgressHandler } from '@/lib/contract';
import { buyPolicy } from '@/lib/api';
import { SUBMIT_COOLDOWN_MS } from '@/hooks/useSubmitGuard';
import type { Product } from '../types';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({ address: 'GABC123', connect: vi.fn(), connecting: false, error: null })),
}));
vi.mock('@/context/ToastContext', () => ({ useToast: vi.fn(() => ({ show: vi.fn() })) }));
vi.mock('@/lib/stellar', () => ({ signTransaction: vi.fn(async () => 'signed-xdr') }));

// Lets the test drive the purchase through each stage by hand.
let reportStage: TxProgressHandler = () => {};
let resolvePurchase: () => void = () => {};
vi.mock('@/lib/contract', () => ({
  invokeBuyPolicy: vi.fn(
    (_a: string, _p: string, _c: bigint, _k: string, _d: number, onProgress?: TxProgressHandler) =>
      new Promise((resolve) => {
        reportStage = (stage) => onProgress?.(stage);
        resolvePurchase = () => resolve({ txHash: 'abc123def456', signedXdr: 'x' });
      }),
  ),
}));

let resolveRecord: () => void = () => {};
vi.mock('@/lib/api', () => ({
  buyPolicy: vi.fn(() => new Promise((resolve) => { resolveRecord = () => resolve({}); })),
}));

const STEPS: TransactionStep[] = [
  { id: 'a', label: 'Step A', status: 'Doing A…' },
  { id: 'b', label: 'Step B', status: 'Doing B…' },
  { id: 'c', label: 'Step C', status: 'Doing C…' },
];

function states() {
  return screen.getAllByRole('listitem').map((li) => li.getAttribute('data-state'));
}

describe('TransactionProgress', () => {
  it('marks earlier steps done, the current one active and later ones pending', () => {
    render(<TransactionProgress steps={STEPS} current="b" />);
    expect(states()).toEqual(['done', 'active', 'pending']);
    expect(screen.getByRole('status')).toHaveTextContent('Doing B…');
  });

  it('shows the completion state once every step has finished', () => {
    render(<TransactionProgress steps={STEPS} current={TX_COMPLETE} completeText="All done!" />);
    expect(states()).toEqual(['done', 'done', 'done']);
    expect(screen.getByRole('status')).toHaveTextContent('All done!');
  });
});

const product: Product = {
  id: 'product-1', name: 'DeFi Cover', category: 'defi', triggerType: 'Threshold', threshold: '30',
  comparison: 'LessThan', coverageMin: '1000000', coverageMax: '100000000', premiumRate: 500,
  maxDuration: 30, status: 'Active',
} as Product;

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

describe('BuyPolicyModal purchase progress', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('updates the status text per step and ends on a completion state', async () => {
    const onClose = vi.fn();
    render(<BuyPolicyModal product={product} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText(/–/), { target: { value: '5' } });
    for (const name of ['Next', 'Confirm details', /sign & confirm/i]) {
      fireEvent.click(screen.getByRole('button', { name }));
      await flush();
      act(() => { vi.advanceTimersByTime(SUBMIT_COOLDOWN_MS + 1); });
    }

    expect(invokeBuyPolicy).toHaveBeenCalledTimes(1);
    const tracker = screen.getByTestId('transaction-progress');
    const status = () => within(tracker).getByRole('status');
    expect(status()).toHaveTextContent('Preparing transaction…');

    const expected: [Parameters<TxProgressHandler>[0], string][] = [
      ['signing',    'Waiting for your wallet signature…'],
      ['submitting', 'Submitting to the network…'],
      ['confirming', 'Confirming transaction…'],
    ];
    for (const [stage, text] of expected) {
      act(() => reportStage(stage));
      expect(status()).toHaveTextContent(text);
    }

    resolvePurchase();
    await flush();
    expect(buyPolicy).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent('Processing your policy…');

    resolveRecord();
    await flush();
    expect(status()).toHaveTextContent('Complete! Your policy is active.');
    expect(within(tracker).getAllByRole('listitem').every((li) => li.getAttribute('data-state') === 'done')).toBe(true);

    // The completion state stays up until the user dismisses it.
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
