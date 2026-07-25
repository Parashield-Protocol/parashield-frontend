import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryFilter } from '../components/CategoryFilter';

describe('CategoryFilter', () => {
  it('renders all category buttons including "All products"', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="all" onChange={onChange} />);
    expect(html).toContain('All products');
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(6);
  });

  it('sets aria-pressed true only on the selected button', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="crop" onChange={onChange} />);
    const pressedCount = (html.match(/aria-pressed="true"/g) || []).length;
    expect(pressedCount).toBe(1);
    expect(html).toContain('Crop Insurance');
  });

  it('sets aria-pressed false on non-selected buttons', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<CategoryFilter value="crop" onChange={onChange} />);
    const falseCount = (html.match(/aria-pressed="false"/g) || []).length;
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
});
