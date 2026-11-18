import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompareModal, compareSummary } from '../components/CompareModal';
import type { Product } from '../types';

const product = (id: string, name: string) =>
  ({
    id, name, category: 'crop', triggerType: 'Threshold', threshold: '30', comparison: 'LessThan',
    coverageMin: '1000000', coverageMax: '10000000', premiumRate: 500, maxDuration: 30, status: 'Active',
  }) as unknown as Product;

describe('CompareModal aria-describedby (#678)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('points the dialog at a live summary of the comparison', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const products = [product('p1', 'Crop Insurance'), product('p2', 'Flight Delay')];
    act(() => {
      root = createRoot(container!);
      root.render(<CompareModal products={products} onClose={vi.fn()} />);
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    const describedBy = dialog!.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const summary = document.getElementById(describedBy!);
    expect(summary).toBeTruthy();
    expect(summary!.getAttribute('aria-live')).toBe('polite');
    expect(summary!.textContent).toBe(compareSummary(products));
    expect(summary!.textContent).toContain('Comparing 2 products: Crop Insurance, Flight Delay');
  });

  it('summarises an empty comparison', () => {
    expect(compareSummary([])).toBe('No products selected to compare.');
    expect(compareSummary([product('p1', 'Crop Insurance')])).toMatch(/^Comparing 1 product: Crop Insurance\./);
  });
});
