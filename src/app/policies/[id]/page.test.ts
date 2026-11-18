import { describe, it, expect, vi } from 'vitest';

const mockFetchPolicy = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchPolicy: (...args: unknown[]) => mockFetchPolicy(...args),
}));

vi.mock('./policy-detail-client', () => ({
  default: () => null,
}));

const { generateMetadata } = await import('./page');

describe('policy page metadata (#919)', () => {
  it('builds the title from the id without fetching the policy', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: 'policy-42' }) });

    expect(metadata.title).toBe('Policy policy-42 — Parashield');
    expect(mockFetchPolicy).not.toHaveBeenCalled();
  });

  it('shortens long ids in the title', async () => {
    const id = 'a1b2c3d4e5f6a7b8c9d0';
    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });

    expect(metadata.title).toBe('Policy a1b2c3d4… — Parashield');
  });

  it('keeps policy pages out of search indexes', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: 'p1' }) });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
