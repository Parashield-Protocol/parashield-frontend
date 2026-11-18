import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const { validateConfigMock } = vi.hoisted(() => ({ validateConfigMock: vi.fn() }));

vi.mock('@/lib/constants', () => ({ validateConfig: validateConfigMock }));

import { ConfigValidator } from '@/components/ConfigValidator';

// #931 — validateConfig must run once at app start in the browser, not at
// layout.tsx module load (which `next build` evaluates once per static route).
describe('ConfigValidator', () => {
  beforeEach(() => {
    validateConfigMock.mockReset();
  });

  it('does not validate at import time', () => {
    expect(validateConfigMock).not.toHaveBeenCalled();
  });

  it('validates exactly once on mount and renders nothing', () => {
    const { container, rerender } = render(<ConfigValidator />);
    rerender(<ConfigValidator />);

    expect(validateConfigMock).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('');
  });
});
