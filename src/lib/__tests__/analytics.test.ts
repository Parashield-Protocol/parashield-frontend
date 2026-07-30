import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import { page, setPostHogReady } from '@/lib/analytics';

// Mock posthog capture
vi.mock('posthog-js', () => {
  return {
    capture: vi.fn(),
  };
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
});
