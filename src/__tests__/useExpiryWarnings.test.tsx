import { useExpiryWarnings } from '../hooks/useExpiryWarnings';
import { expiryNotifiedStorageKey } from '../lib/storageKeys';
import { renderHook } from './renderHook';
import type { Policy } from '../types';

const nowSec = () => Math.floor(Date.now() / 1000);

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'policy-1',
    productId: 'product-1',
    policyholder: 'GWALLET',
    coverage: '10000000',
    premiumPaid: '500000',
    oracleKey: 'weather:lagos',
    startTime: nowSec() - 86_400,
    endTime: nowSec() + 3_600, // expires in 1h
    status: 'Active',
    ...overrides,
  };
}

describe('useExpiryWarnings (#532)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('warns once per expiring policy across re-renders and new showToast identities', () => {
    const toasts: string[] = [];
    let policies = [makePolicy()];
    let showToast = (m: string) => { toasts.push(m); };

    const hook = renderHook(() => useExpiryWarnings(policies, true, 'GWALLET', showToast));
    expect(toasts).toHaveLength(1);

    showToast = (m: string) => { toasts.push(m); }; // new identity
    policies = [makePolicy()];                       // polled refetch, new array
    hook.rerender();
    hook.rerender();

    expect(toasts).toHaveLength(1);
  });

  it('does not duplicate toasts when sessionStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const toasts: string[] = [];
    let policies = [makePolicy()];

    const hook = renderHook(() => useExpiryWarnings(policies, true, 'GWALLET', (m) => { toasts.push(m); }));
    policies = [makePolicy()];
    hook.rerender();

    expect(toasts).toHaveLength(1);
  });

  it('skips policies already recorded in sessionStorage', () => {
    sessionStorage.setItem(expiryNotifiedStorageKey('GWALLET'), JSON.stringify(['policy-1']));
    const toasts: string[] = [];

    renderHook(() => useExpiryWarnings([makePolicy()], true, 'GWALLET', (m) => { toasts.push(m); }));

    expect(toasts).toHaveLength(0);
  });

  it('ignores non-expiring, expired and inactive policies, and waits until ready', () => {
    const toasts: string[] = [];
    const policies = [
      makePolicy({ id: 'far', endTime: nowSec() + 7 * 86_400 }),
      makePolicy({ id: 'past', endTime: nowSec() - 60 }),
      makePolicy({ id: 'claimed', status: 'Claimed' }),
    ];
    let ready = false;
    const hook = renderHook(() => useExpiryWarnings([...policies, makePolicy({ id: 'soon' })], ready, 'GWALLET', (m) => { toasts.push(m); }));
    expect(toasts).toHaveLength(0);

    ready = true;
    hook.rerender();
    expect(toasts).toEqual(['Policy #soon expires within 24 hours']);
  });
});
