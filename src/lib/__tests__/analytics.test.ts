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

  it('buffers only the latest pageview when multiple calls before ready', () => {
    setPostHogReady(false);
    page('first');
    page('second');
    setPostHogReady(true);
    // Should capture only once with latest page view
    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: window.location.href,
    });
  });
});
