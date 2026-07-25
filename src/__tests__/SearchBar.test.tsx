import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchBar } from '../components/SearchBar';

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    const onSearch = vi.fn();
    const html = renderToStaticMarkup(<SearchBar onSearch={onSearch} />);
    expect(html).toContain('placeholder="Search…"');
  });

  it('renders with custom placeholder', () => {
    const onSearch = vi.fn();
    const html = renderToStaticMarkup(<SearchBar onSearch={onSearch} placeholder="Find policies" />);
    expect(html).toContain('placeholder="Find policies"');
  });

  it('applies custom className', () => {
    const onSearch = vi.fn();
    const html = renderToStaticMarkup(<SearchBar onSearch={onSearch} className="my-class" />);
    expect(html).toContain('my-class');
  });

  it('renders search input element', () => {
    const onSearch = vi.fn();
    const html = renderToStaticMarkup(<SearchBar onSearch={onSearch} />);
    expect(html).toContain('<input');
    expect(html).toContain('type="text"');
  });

  it('does not render clear button when query is empty', () => {
    const onSearch = vi.fn();
    const html = renderToStaticMarkup(<SearchBar onSearch={onSearch} />);
    expect(html).not.toContain('Clear search');
  });
});
