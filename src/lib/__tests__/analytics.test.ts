import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import { page, resetPageviewTracking, setPostHogReady, trackPageview } from '@/lib/analytics';

// Mock posthog capture
// analytics.ts uses the default export (`import posthog from 'posthog-js'`).
vi.mock('posthog-js', () => {
  const capture = vi.fn();
  return { default: { capture }, capture };
});

beforeEach(() => {
  // Reset mocks and global state
  vi.mocked(posthog.capture).mockReset();
  // Ensure analytics is not ready before each test
  setPostHogReady(false);
});

describe('analytics page buffering', () => {
  it('buffers a pageview when not ready and flushes on ready', () => {
    // Ensure not ready initially
    setPostHogReady(false);
    page('home');
    expect(posthog.capture).not.toHaveBeenCalled();
    // Now set ready, should flush buffered pageview
    setPostHogReady(true);
    expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: window.location.href,
    });
  });

  it('buffers every pageview queued before ready and flushes them in order', () => {
    setPostHogReady(false);
    page('first',  { route: '/first'  });
    page('second', { route: '/second' });
    page('third',  { route: '/third'  });
    expect(posthog.capture).not.toHaveBeenCalled();

    setPostHogReady(true);

    expect(posthog.capture).toHaveBeenCalledTimes(3);
    expect(vi.mocked(posthog.capture).mock.calls.map(([, props]) => (props as { route: string }).route))
      .toEqual(['/first', '/second', '/third']);
  });

  it('does not re-send buffered pageviews on a second ready flip', () => {
    setPostHogReady(false);
    page('home');
    setPostHogReady(true);
    expect(posthog.capture).toHaveBeenCalledTimes(1);

    setPostHogReady(true);
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it('captures the URL at page() time, not at flush time', () => {
    setPostHogReady(false);
    const originalHref = window.location.href;
    page('first');

    window.history.pushState({}, '', '/later-route');
    setPostHogReady(true);

    expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: originalHref,
    });
    window.history.pushState({}, '', originalHref);
  });

  it('drops newest entry when buffer is full (MAX_BUFFERED_PAGEVIEWS = 50)', () => {
    setPostHogReady(false);
    // Fill the buffer to capacity
    for (let i = 0; i < 50; i++) {
      window.history.pushState({}, '', `/route-${i}`);
      page(`route-${i}`);
    }
    // This 51st call should be silently dropped
    window.history.pushState({}, '', '/dropped');
    page('overflow');

    setPostHogReady(true);

    expect(posthog.capture).toHaveBeenCalledTimes(50);
    const urls = vi.mocked(posthog.capture).mock.calls.map(([, props]) => (props as { $current_url: string }).$current_url);
    expect(urls.some(u => u.includes('/dropped'))).toBe(false);
    expect(urls[0]).toContain('/route-0');
  });

  // #926 — overflow is reported once per fill instead of dropping silently.
  it('warns once when the buffer overflows, and again after a flush refills it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setPostHogReady(false);
    for (let i = 0; i < 53; i++) page(`route-${i}`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('dropping further pageviews');

    setPostHogReady(true);
    setPostHogReady(false);
    for (let i = 0; i < 51; i++) page(`again-${i}`);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('setPostHogReady(false) allows the buffer to be populated again', () => {
    setPostHogReady(true);
    setPostHogReady(false);
    page('after-reset');
    expect(posthog.capture).not.toHaveBeenCalled();

    setPostHogReady(true);
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});

describe('analytics track', () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockReset();
    setPostHogReady(false);
  });

  it('calls posthog.capture with the event name and properties', () => {
    setPostHogReady(true);
    track('wallet_connect', { network: 'testnet' });
    expect(posthog.capture).toHaveBeenCalledWith('wallet_connect', { network: 'testnet' });
  });

  it('truncates wallet address to first 8 chars', () => {
    setPostHogReady(true);
    track('wallet_connect', { wallet: 'GABCDEFGHIJKLMNOP' });
    const [, props] = vi.mocked(posthog.capture).mock.calls[0];
    expect((props as { wallet: string }).wallet).toBe('GABCDEFG');
  });
});

describe('trackPageview deduplication (#711)', () => {
  beforeEach(() => {
    resetPageviewTracking();
    setPostHogReady(true);
    vi.mocked(posthog.capture).mockReset();
  });

  const pageviews = () =>
    vi.mocked(posthog.capture).mock.calls.filter(([event]) => event === '$pageview').length;

  it('records one pageview when the same route is reported twice', () => {
    trackPageview('/policies');
    trackPageview('/policies'); // e.g. Strict Mode re-running the effect
    expect(pageviews()).toBe(1);
  });

  it('records exactly one pageview per navigation', () => {
    trackPageview('/');
    trackPageview('/policies');
    trackPageview('/policies');
    trackPageview('/claims');
    trackPageview('/');
    expect(pageviews()).toBe(4);
  });
});
