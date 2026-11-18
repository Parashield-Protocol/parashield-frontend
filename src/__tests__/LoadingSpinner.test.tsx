import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadingSpinner, FullPageSpinner } from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toBeTruthy();
  });

  it('has role="status" and an accessible label', () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading"');
  });

  it('defaults to the md size classes', () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain('h-8');
    expect(html).toContain('w-8');
  });

  it('applies sm size classes', () => {
    const html = renderToStaticMarkup(<LoadingSpinner size="sm" />);
    expect(html).toContain('h-4');
    expect(html).toContain('w-4');
  });

  it('applies lg size classes', () => {
    const html = renderToStaticMarkup(<LoadingSpinner size="lg" />);
    expect(html).toContain('h-12');
    expect(html).toContain('w-12');
    expect(html).toContain('border-[3px]');
  });

  it('applies custom className alongside size classes', () => {
    const html = renderToStaticMarkup(<LoadingSpinner size="sm" className="custom-class" />);
    expect(html).toContain('custom-class');
    expect(html).toContain('h-4');
  });

  it('applies the spin animation class', () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);
    expect(html).toContain('animate-spin');
  });
});

describe('FullPageSpinner', () => {
  it('renders a large LoadingSpinner', () => {
    const html = renderToStaticMarkup(<FullPageSpinner />);
    expect(html).toContain('role="status"');
    expect(html).toContain('h-12');
    expect(html).toContain('w-12');
  });

  it('centers the spinner in a min-height container', () => {
    const html = renderToStaticMarkup(<FullPageSpinner />);
    expect(html).toContain('min-h-[400px]');
    expect(html).toContain('items-center');
    expect(html).toContain('justify-center');
  });
});
