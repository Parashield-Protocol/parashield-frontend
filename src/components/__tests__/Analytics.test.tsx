import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

const pathname = { current: '/' };
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn(), init: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ setPostHogReady: vi.fn(), trackPageview: vi.fn() }));

import { trackPageview } from '@/lib/analytics';
import { Analytics } from '../Analytics';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('<Analytics /> (#711)', () => {
  it('reports each route through trackPageview, the single pageview source', () => {
    const root = createRoot(document.createElement('div'));
    act(() => root.render(<StrictMode><Analytics /></StrictMode>));

    pathname.current = '/policies';
    act(() => root.render(<StrictMode><Analytics /></StrictMode>));

    const routes = vi.mocked(trackPageview).mock.calls.map(([p]) => p);
    // Strict Mode may report a route more than once; trackPageview dedupes it.
    expect(new Set(routes)).toEqual(new Set(['/', '/policies']));
    act(() => root.unmount());
  });
});
