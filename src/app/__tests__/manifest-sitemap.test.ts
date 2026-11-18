import { describe, expect, it, vi } from 'vitest';

// next/og's ImageResponse needs the edge renderer; the manifest only needs the
// icon paths and sizes, so stub it out.
vi.mock('next/og', () => ({ ImageResponse: vi.fn() }));

import manifest from '../manifest';
import sitemap from '../sitemap';

describe('manifest icons (#897)', () => {
  it('declares a distinct, correctly sized icon for each size', () => {
    const icons = manifest().icons ?? [];

    expect(icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
    expect(new Set(icons.map((icon) => icon.src)).size).toBe(icons.length);
    for (const icon of icons) {
      expect(icon.src).not.toContain('parashield-logo');
      expect(icon.src).toContain(icon.sizes?.split('x')[0]);
    }
  });
});

describe('sitemap lastModified (#898)', () => {
  it('uses the generation time instead of a hardcoded date', () => {
    const before = Date.now();
    const entries = sitemap();
    const after = Date.now();

    for (const entry of entries) {
      const modified = new Date(entry.lastModified as Date).getTime();
      expect(modified).toBeGreaterThanOrEqual(before);
      expect(modified).toBeLessThanOrEqual(after);
    }
  });
});
