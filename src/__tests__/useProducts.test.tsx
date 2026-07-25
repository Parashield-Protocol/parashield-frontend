import { useProducts } from '../hooks/useProducts';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Product } from '../types';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchProducts }));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Weather Protection',
    description: 'Weather insurance product',
    minCoverage: '1000000',
    maxCoverage: '100000000',
    minPremium: '10000',
    riskLevel: 'Low',
    ...overrides,
  };
}

describe('useProducts', () => {
  beforeEach(() => {
    fetchProducts.mockReset();
  });

  it('loads products and exposes refetch', async () => {
    const products = [makeProduct()];
    fetchProducts.mockResolvedValue(products);

    const hook = renderHook(() => useProducts());
    expect(hook.current.loading).toBe(true);
    expect(hook.current.error).toBeNull();

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.products).toEqual(products);
    expect(hook.current.error).toBeNull();
    expect(typeof hook.current.refetch).toBe('function');
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchProducts.mockRejectedValue(new Error('network error'));

    const hook = renderHook(() => useProducts());
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('network error');
    expect(hook.current.products).toEqual([]);
  });

  it('refetch loads products again', async () => {
    const initialProducts = [makeProduct({ id: 'product-1' })];
    fetchProducts.mockResolvedValue(initialProducts);

    const hook = renderHook(() => useProducts());
    await flushMicrotasks();
    expect(hook.current.products).toEqual(initialProducts);

    const updatedProducts = [
      makeProduct({ id: 'product-1' }),
      makeProduct({ id: 'product-2' }),
    ];
    fetchProducts.mockResolvedValue(updatedProducts);

    await hook.current.refetch();

    expect(hook.current.products).toEqual(updatedProducts);
    expect(hook.current.error).toBeNull();
  });

  it('returns empty products array on initial load before data arrives', () => {
    fetchProducts.mockImplementation(
      () => new Promise(() => {}),
    );

    const hook = renderHook(() => useProducts());

    expect(hook.current.products).toEqual([]);
    expect(hook.current.loading).toBe(true);
  });
});
