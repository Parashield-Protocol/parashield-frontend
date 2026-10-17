import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilter } from '../components/CategoryFilter';

// Each tab reads CATEGORY_LABELS[cat] once per render, so counting reads
// through a proxy gives a per-tab render count (#590).
const labelReads = vi.hoisted(() => new Map<string, number>());
vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>();
  return {
    ...actual,
    CATEGORY_LABELS: new Proxy(actual.CATEGORY_LABELS, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') labelReads.set(prop, (labelReads.get(prop) ?? 0) + 1);
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

describe('CategoryFilter', () => {
  it('renders all category buttons including "All policies"', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('All policies');
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(6);
  });

  it('sets aria-selected true only on the selected tab', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="crop" onChange={onChange} />);
    const pressedCount = (html.match(/aria-selected="true"/g) || []).length;
    expect(pressedCount).toBe(1);
    expect(html).toContain('Crop Insurance');
  });

  it('sets aria-selected false on non-selected tabs', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="crop" onChange={onChange} />);
    const falseCount = (html.match(/aria-selected="false"/g) || []).length;
    expect(falseCount).toBe(5);
  });

  it('renders Flight button with correct label', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('Flight Delay');
  });

  it('renders Disaster button with correct label', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('Disaster');
  });

  it('renders Health button with correct label', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('Health');
  });

  it('renders DeFi button with correct label', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('DeFi Cover');
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} className="custom" />);
    expect(html).toContain('custom');
  });

  describe('keyboard navigation', () => {
    function KeyboardHarness() {
      const [value, setValue] = useState<'all' | 'crop' | 'flight' | 'disaster' | 'health' | 'defi'>('all');
      return <CategoryFilter value={value} onChange={setValue} />;
    }

    it('moves selection and focus with ArrowDown/ArrowUp as well as Left/Right, wrapping', () => {
      render(<KeyboardHarness />);
      const all = screen.getByRole('tab', { name: /all policies/i });

      fireEvent.keyDown(all, { key: 'ArrowDown' });
      const crop = screen.getByRole('tab', { name: /crop/i });
      expect(crop).toHaveAttribute('aria-selected', 'true');
      expect(crop).toHaveFocus();

      fireEvent.keyDown(crop, { key: 'ArrowUp' });
      expect(all).toHaveFocus();
      fireEvent.keyDown(all, { key: 'ArrowUp' });
      expect(screen.getByRole('tab', { name: /defi/i })).toHaveFocus();
    });

    it('jumps to the ends with Home/End', () => {
      render(<KeyboardHarness />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /all policies/i }), { key: 'End' });
      const defi = screen.getByRole('tab', { name: /defi/i });
      expect(defi).toHaveFocus();
      fireEvent.keyDown(defi, { key: 'Home' });
      expect(screen.getByRole('tab', { name: /all policies/i })).toHaveFocus();
    });
  });

  describe('re-rendering (#590)', () => {
    beforeEach(() => labelReads.clear());

    function Harness() {
      const [value, setValue] = useState<'all' | 'crop' | 'flight' | 'disaster' | 'health' | 'defi'>('crop');
      // Inline handler: a new function every render, as real callers pass.
      return <CategoryFilter value={value} onChange={(v) => setValue(v)} />;
    }

    it('re-renders only the previously and newly selected tabs', () => {
      render(<Harness />);
      labelReads.clear();

      fireEvent.click(screen.getByRole('tab', { name: /flight/i }));

      expect(screen.getByRole('tab', { name: /flight/i })).toHaveAttribute('aria-selected', 'true');
      expect(labelReads.get('crop')).toBe(1);
      expect(labelReads.get('flight')).toBe(1);
      for (const cat of ['disaster', 'health', 'defi']) {
        expect(labelReads.get(cat)).toBeUndefined();
      }
    });

    it('calls the latest onChange after the parent passes a new one', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(<CategoryFilter value="all" onChange={first} />);
      rerender(<CategoryFilter value="all" onChange={second} />);

      fireEvent.click(screen.getByRole('tab', { name: /health/i }));
      fireEvent.keyDown(screen.getByRole('tab', { name: /all policies/i }), { key: 'End' });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenNthCalledWith(1, 'health');
      expect(second).toHaveBeenNthCalledWith(2, 'defi');
    });
  });
});
