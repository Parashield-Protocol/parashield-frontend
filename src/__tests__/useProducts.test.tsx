import { act } from 'react';
import { useProducts } from '../hooks/useProducts';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Product } from '../types';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchProducts }));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Crop Cover',
    category: 'crop',
    triggerType: 'Threshold',
    threshold: '100',
    comparison: 'LessThan',
    coverageMin: '1000000',
    coverageMax: '10000000',
    premiumRate: 500,
    maxDuration: 30,
    status: 'Active',
    ...overrides,
  };
}

describe('useProducts', () => {
  beforeEach(() => fetchProducts.mockReset());

  it('starts in a loading state and populates products on success', async () => {
    const products = [makeProduct()];
    fetchProducts.mockResolvedValue(products);

    const hook = renderHook(() => useProducts());
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.products).toEqual(products);
    expect(hook.current.error).toBeNull();
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchProducts.mockRejectedValue(new Error('service unavailable'));

    const hook = renderHook(() => useProducts());
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('service unavailable');
    expect(hook.current.products).toEqual([]);
  });

  it('refetch re-runs the load and clears a previous error on success', async () => {
    fetchProducts.mockRejectedValueOnce(new Error('first failure'));
    const hook = renderHook(() => useProducts());
    await flushMicrotasks();
    expect(hook.current.error).toBe('first failure');

    const products = [makeProduct({ id: 'product-2' })];
    fetchProducts.mockResolvedValueOnce(products);
    await act(async () => {
      await hook.current.refetch();
    });

    expect(hook.current.error).toBeNull();
    expect(hook.current.products).toEqual(products);
  });
});
