import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn(),
  getConnectedAddress: vi.fn(),
  signAuthMessage: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

const product: Product = {
  id: 'product-1',
  name: 'Crop Insurance',
  category: 'crop',
  triggerType: 'Threshold',
  threshold: '30',
  comparison: 'LessThan',
  coverageMin: '1000000',
  coverageMax: '10000000',
  premiumRate: 500,
  maxDuration: 30,
  status: 'Active',
};

describe('ProductCard compare control (#668)', () => {
  it('is a named, focusable native checkbox', () => {
    render(<ProductCard product={product} onCompareToggle={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: 'Compare Crop Insurance' });
    expect(box.tagName).toBe('INPUT');
    expect(box.tabIndex).toBe(0);
    box.focus();
    expect(document.activeElement).toBe(box);
    expect(box.className).toContain('focus-visible:outline-teal-400');
  });

  it('is not nested inside a role="button" (whose children are presentational)', () => {
    render(<ProductCard product={product} onCompareToggle={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: 'Compare Crop Insurance' });
    expect(box.closest('[role="button"]')).toBeNull();
  });

  it('reflects compareSelected in its checked state', () => {
    const { rerender } = render(
      <ProductCard product={product} onCompareToggle={vi.fn()} compareSelected={false} />,
    );
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.checked).toBe(false);

    rerender(<ProductCard product={product} onCompareToggle={vi.fn()} compareSelected />);
    expect(box.checked).toBe(true);
  });

  it('toggles comparison without opening the buy modal', () => {
    const onCompareToggle = vi.fn();
    render(<ProductCard product={product} onCompareToggle={onCompareToggle} />);

    // Space on a focused native checkbox dispatches a click.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare Crop Insurance' }));

    expect(onCompareToggle).toHaveBeenCalledWith(product);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
