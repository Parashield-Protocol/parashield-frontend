import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

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

  it('provides useTheme hook', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(html).toContain('Toggle');
  });
});
