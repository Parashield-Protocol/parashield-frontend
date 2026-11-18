import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WithdrawModal } from '../components/WithdrawModal';
import { fetchPoolUserShares } from '@/lib/api';
import type { PoolStats } from '../types';

vi.mock('@/lib/stellar', () => ({
  signTransaction: vi.fn(),
  getAddress: vi.fn(),
  isConnected: vi.fn(),
}));
vi.mock('@/lib/contract', () => ({
  buildWithdrawTx: vi.fn(),
  submitSignedTransaction: vi.fn(),
  withStateRestore: vi.fn(),
}));
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({ address: 'GTESTADDRESS' })),
}));
vi.mock('@/context/ToastContext', () => ({
  useToast: vi.fn(() => ({ show: vi.fn() })),
}));
vi.mock('@/lib/api', () => ({
  fetchPoolShares: vi.fn().mockResolvedValue({
    shareSupply: '100000000',
    totalLiquidity: '100000000',
    paused: false,
  }),
  // 5 shares held by default
  fetchPoolUserShares: vi.fn().mockResolvedValue({ shares: '50000000' }),
}));

const pool: PoolStats = {
  poolId: 'pool-1',
  category: 'crop',
  totalLiquidity: '100000000',
  activePolicies: 3,
  utilizationRate: 0.4,
  apy: 0.12,
};

async function renderLoaded() {
  render(<WithdrawModal pool={pool} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByText(/5\.0000/).length).toBeGreaterThan(0));
  return {
    input: screen.getByPlaceholderText('0.00'),
    submit: screen.getByRole('button', { name: /confirm withdrawal/i }),
  };
}

describe('WithdrawModal minimum withdrawal (#699)', () => {
  it('shows an error and disables submit below the minimum', async () => {
    const { input, submit } = await renderLoaded();
    fireEvent.change(input, { target: { value: '0.001' } });

    expect(screen.getByRole('alert').textContent).toContain('Minimum withdrawal is 0.01 shares');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it('allows exactly the minimum', async () => {
    const { input, submit } = await renderLoaded();
    fireEvent.change(input, { target: { value: '0.01' } });

    expect(screen.queryByRole('alert')).toBeNull();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it('allows withdrawing an entire balance that is below the minimum', async () => {
    vi.mocked(fetchPoolUserShares).mockResolvedValueOnce({ shares: '50000' } as never); // 0.005 shares
    render(<WithdrawModal pool={pool} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText(/0\.0050/).length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0.005' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('button', { name: /confirm withdrawal/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
