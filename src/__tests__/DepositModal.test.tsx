import { renderToStaticMarkup } from 'react-dom/server';
import { DepositModal } from '../components/DepositModal';
import type { PoolStats } from '../types';

vi.mock('@/lib/stellar', () => ({
  signTransaction: vi.fn(),
  getAddress: vi.fn(),
  isConnected: vi.fn(),
}));
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: 'GTESTADDRESS',
    connect: vi.fn(),
    connecting: false,
    error: null,
  })),
}));
vi.mock('@/context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    show: vi.fn(),
  })),
}));
vi.mock('@/lib/api', () => ({
  fetchPoolShares: vi.fn().mockResolvedValue({
    shareSupply: '10000000',
    totalLiquidity: '100000000',
    paused: false,
  }),
}));

function makePool(overrides: Partial<PoolStats> = {}): PoolStats {
  return {
    poolId: 'pool-1',
    category: 'crop',
    totalLiquidity: '100000000',
    activePolicies: 3,
    utilizationRate: 0.4,
    apy: 0.12,
    ...overrides,
  };
}

describe('DepositModal', () => {
  it('renders the deposit form with amount input', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool()} onClose={vi.fn()} />);
    expect(html).toContain('Amount (USDC)');
    expect(html).toContain('Confirm deposit');
  });

  it('displays pool liquidity and APY information', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool()} onClose={vi.fn()} />);
    expect(html).toContain('Pool liquidity');
    expect(html).toContain('APY');
    expect(html).toContain('Utilization');
  });

  it('shows pool label based on category', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool({ category: 'crop' })} onClose={vi.fn()} />);
    expect(html).toContain('Deposit — Crop Insurance Pool');
  });

  it('shows flight pool label', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool({ category: 'flight' })} onClose={vi.fn()} />);
    expect(html).toContain('Deposit — Flight Delay Pool');
  });

  it('shows deFi pool label', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool({ category: 'defi' })} onClose={vi.fn()} />);
    expect(html).toContain('Deposit — DeFi Cover Pool');
  });

  it('shows disaster pool label', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool({ category: 'disaster' })} onClose={vi.fn()} />);
    expect(html).toContain('Deposit — Natural Disaster Pool');
  });

  it('shows health pool label', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool({ category: 'health' })} onClose={vi.fn()} />);
    expect(html).toContain('Deposit — Health Pool');
  });

  it('displays estimated LP shares placeholder', () => {
    const html = renderToStaticMarkup(<DepositModal pool={makePool()} onClose={vi.fn()} />);
    expect(html).toContain('Estimated LP shares');
  });
});
