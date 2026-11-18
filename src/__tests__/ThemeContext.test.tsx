import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { STORAGE_KEYS } from '../lib/storageKeys';

function ThemeDisplay() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  it('provides dark theme by default', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(html).toContain('dark');
  });

  // #905 — no module-level cache: a remounted provider reads storage again.
  it('re-reads the stored theme on each provider mount', () => {
    const render = () =>
      renderToStaticMarkup(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );

    localStorage.setItem(STORAGE_KEYS.theme, 'light');
    expect(render()).toContain('>light<');

    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    expect(render()).toContain('>dark<');
  });

  it('provides useTheme hook', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(html).toContain('Toggle');
  });
});
