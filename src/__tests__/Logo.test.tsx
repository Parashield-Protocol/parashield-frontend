import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo, LogoWordmark } from '../components/Logo';

describe('Logo', () => {
  it('renders an img with the expected alt text', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('<img');
    expect(html).toContain('alt="ParaShield"');
  });

  it('defaults to size 32', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
  });

  it('applies a custom size', () => {
    const html = renderToStaticMarkup(<Logo size={64} />);
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
  });

  it('applies a custom className', () => {
    const html = renderToStaticMarkup(<Logo className="custom-class" />);
    expect(html).toContain('custom-class');
  });

  it('renders the dark and light variants without crashing', () => {
    expect(() => renderToStaticMarkup(<Logo variant="dark" />)).not.toThrow();
    expect(() => renderToStaticMarkup(<Logo variant="light" />)).not.toThrow();
  });
});

describe('LogoWordmark', () => {
  it('renders an img with the expected alt text', () => {
    const html = renderToStaticMarkup(<LogoWordmark />);
    expect(html).toContain('<img');
    expect(html).toContain('alt="ParaShield"');
  });

  it('renders the wordmark text', () => {
    const html = renderToStaticMarkup(<LogoWordmark />);
    expect(html).toContain('Para');
    expect(html).toContain('shield');
  });

  it('uses white text for the dark variant', () => {
    const html = renderToStaticMarkup(<LogoWordmark variant="dark" />);
    expect(html).toContain('text-white');
  });

  it('uses dark text for the light variant', () => {
    const html = renderToStaticMarkup(<LogoWordmark variant="light" />);
    expect(html).toContain('text-gray-900');
  });

  it('applies a custom className', () => {
    const html = renderToStaticMarkup(<LogoWordmark className="custom-class" />);
    expect(html).toContain('custom-class');
  });
});
