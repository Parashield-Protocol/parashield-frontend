import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OracleDataWidget } from '../components/OracleDataWidget';

vi.mock('@/hooks/useOracle', () => ({
  useOracleReading: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatOracleValue: (value: string, dataType: string) => {
    const num = Number(BigInt(value)) / 1e7;
    if (dataType === 'weather' || dataType === 'rainfall') return `${num.toFixed(2)} mm`;
    if (dataType === 'temperature') return `${num.toFixed(2)} °C`;
    if (dataType === 'flight') return `${Math.round(num)} min delay`;
    if (dataType === 'defi') return num === 1 ? 'Exploit detected' : 'No exploit';
    return num.toFixed(4);
  },
  formatDateTime: (ts: number) => new Date(ts * 1000).toLocaleString(),
}));

vi.mock('@/lib/oracle', () => ({
  oracleKeyLabel: (key: string) => `Label for ${key}`,
  confidenceLabel: (c: number) => (c >= 90 ? 'High' : c >= 70 ? 'Medium' : 'Low'),
  confidenceColour: (c: number) => (c >= 90 ? 'text-emerald-400' : c >= 70 ? 'text-amber-400' : 'text-red-400'),
  parseOracleKey: (key: string) => {
    if (key.startsWith('rainfall:')) return { dataType: 'rainfall' };
    if (key.startsWith('temperature:')) return { dataType: 'temperature' };
    if (key.startsWith('flight:')) return { dataType: 'flight' };
    if (key.startsWith('defi')) return { dataType: 'defi' };
    return { dataType: 'unknown' };
  },
}));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div role="status">Loading</div>,
}));

import { useOracleReading } from '@/hooks/useOracle';
const mockUseOracleReading = vi.mocked(useOracleReading);

describe('OracleDataWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when loading', () => {
    mockUseOracleReading.mockReturnValue({
      reading: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('Loading');
  });

  it('shows error message when fetch fails', () => {
    const refetch = vi.fn();
    mockUseOracleReading.mockReturnValue({
      reading: null,
      loading: false,
      error: 'Network error',
      refetch,
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('Network error');
    expect(html).toContain('Retry');
  });

  it('shows "No oracle data" when reading is null', () => {
    mockUseOracleReading.mockReturnValue({
      reading: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('No oracle data');
  });

  it('displays rainfall value with mm unit', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'rainfall:1,1:2025-01',
        value: '324000000',
        confidence: 95,
        timestamp: 1720000000,
        source: 'NOAA',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('mm');
  });

  it('displays temperature value with °C unit', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'temperature:1,1:2025-01',
        value: '250000000',
        confidence: 85,
        timestamp: 1720000000,
        source: 'WMO',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="temperature:1,1:2025-01" />);
    expect(html).toContain('°C');
  });

  it('displays flight delay in minutes', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'flight:AA123:2025-07-25',
        value: '1200000000',
        confidence: 100,
        timestamp: 1720000000,
        source: 'FlightAware',
        dataType: 'flight',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="flight:AA123:2025-07-25" />);
    expect(html).toContain('min delay');
  });

  it('displays defi exploit detected when value is 1', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'defi',
        value: '10000000',
        confidence: 100,
        timestamp: 1720000000,
        source: 'On-chain',
        dataType: 'defi',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="defi" />);
    expect(html).toContain('Exploit detected');
  });

  it('displays "No exploit" when defi value is 0', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'defi',
        value: '0',
        confidence: 100,
        timestamp: 1720000000,
        source: 'On-chain',
        dataType: 'defi',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="defi" />);
    expect(html).toContain('No exploit');
  });

  it('shows "High" confidence for ≥90', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'rainfall:1,1:2025-01',
        value: '10000000',
        confidence: 92,
        timestamp: 1720000000,
        source: 'NOAA',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('High confidence');
  });

  it('shows "Medium" confidence for 70-89', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'rainfall:1,1:2025-01',
        value: '10000000',
        confidence: 75,
        timestamp: 1720000000,
        source: 'NOAA',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('Medium confidence');
  });

  it('shows "Low" confidence for <70', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'rainfall:1,1:2025-01',
        value: '10000000',
        confidence: 50,
        timestamp: 1720000000,
        source: 'NOAA',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('Low confidence');
  });

  it('displays oracle reading label and source', () => {
    mockUseOracleReading.mockReturnValue({
      reading: {
        key: 'rainfall:1,1:2025-01',
        value: '10000000',
        confidence: 90,
        timestamp: 1720000000,
        source: 'NOAA',
        dataType: 'weather',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<OracleDataWidget oracleKey="rainfall:1,1:2025-01" />);
    expect(html).toContain('Oracle Reading');
    expect(html).toContain('NOAA');
  });
});
