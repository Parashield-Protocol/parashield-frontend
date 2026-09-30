import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OracleDataWidget } from '../components/OracleDataWidget';

vi.mock('@/hooks/useOracle', () => ({
  useOracleReading: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatOracleValue: (value: string) => value,
  formatDateTime: (ts: number) => new Date(ts * 1000).toLocaleString(),
  formatUtcDateTime: (ts: number) => new Date(ts * 1000).toUTCString(),
}));

vi.mock('@/lib/oracle', () => ({
  oracleKeyLabel: (key: string) => `Label for ${key}`,
  confidenceLabel: () => 'High',
  confidenceColour: () => 'text-emerald-400',
  parseOracleKey: () => ({ dataType: 'unknown' }),
}));

vi.mock('@/components/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { useOracleReading } from '@/hooks/useOracle';
const mockUseOracleReading = vi.mocked(useOracleReading);

const baseReading = {
  key: 'rainfall:1,1:2025-01',
  value: '324000000',
  confidence: 95,
  timestamp: 1720000000,
  source: 'NOAA',
  dataType: 'weather' as const,
};

function setup(overrides: Partial<Record<string, unknown>> = {}) {
  mockUseOracleReading.mockReturnValue({
    reading: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useOracleReading>);
  return render(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
}

describe('OracleDataWidget accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refresh button is not marked busy when idle', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Refresh oracle data' });
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('refresh button sets aria-busy=true while refreshing', async () => {
    let resolveRefetch: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    setup({ refetch });

    const button = screen.getByRole('button', { name: 'Refresh oracle data' });
    await act(async () => {
      button.click();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));

    await act(async () => {
      resolveRefetch();
    });
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
  });

  it('retry button sets aria-busy=true while retrying after an error', async () => {
    let resolveRefetch: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    setup({ error: 'Network error', refetch });

    const button = screen.getByRole('button', { name: 'Retry' });
    await act(async () => {
      button.click();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));

    await act(async () => {
      resolveRefetch();
    });
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
  });
});
