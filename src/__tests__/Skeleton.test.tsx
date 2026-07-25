import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonText } from '../components/Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toBeTruthy();
  });

  it('applies the pulse animation class', () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain('animate-pulse');
  });

  it('applies a custom className', () => {
    const html = renderToStaticMarkup(<Skeleton className="h-8 w-8 rounded-full" />);
    expect(html).toContain('h-8 w-8 rounded-full');
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const html = renderToStaticMarkup(<SkeletonCard />);
    expect(html).toBeTruthy();
  });

  it('renders the expected number of placeholder elements', () => {
    const html = renderToStaticMarkup(<SkeletonCard />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(6);
  });
});

describe('SkeletonTable', () => {
  it('renders a header placeholder plus the default number of rows', () => {
    const html = renderToStaticMarkup(<SkeletonTable />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(1 + 5);
  });

  it('renders a header placeholder plus a custom number of rows', () => {
    const html = renderToStaticMarkup(<SkeletonTable rows={3} />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(1 + 3);
  });

  it('renders only the header placeholder when rows is 0', () => {
    const html = renderToStaticMarkup(<SkeletonTable rows={0} />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(1);
  });
});

describe('SkeletonText', () => {
  it('renders the default number of lines', () => {
    const html = renderToStaticMarkup(<SkeletonText />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(3);
  });

  it('renders a custom number of lines', () => {
    const html = renderToStaticMarkup(<SkeletonText count={5} />);
    const count = (html.match(/animate-pulse/g) || []).length;
    expect(count).toBe(5);
  });

  it('makes the last line narrower than the others', () => {
    const html = renderToStaticMarkup(<SkeletonText count={2} />);
    expect(html).toContain('w-full');
    expect(html).toContain('w-2/3');
  });
});
