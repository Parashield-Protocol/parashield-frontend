import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';
import { SHORTCUT_LIST, SHORTCUTS, isFocusSearchChord } from '../lib/shortcuts';

describe('shortcut registry (#930)', () => {
  it('lists every registered shortcut once, with a label and description', () => {
    expect(SHORTCUT_LIST).toEqual([SHORTCUTS.focusSearch, SHORTCUTS.showHelp, SHORTCUTS.close]);
    const keys = SHORTCUT_LIST.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const shortcut of SHORTCUT_LIST) {
      expect(shortcut.label).not.toBe('');
      expect(shortcut.description).not.toBe('');
    }
  });

  it('treats both Ctrl and Cmd as the focus-search chord', () => {
    expect(isFocusSearchChord(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))).toBe(true);
    expect(isFocusSearchChord(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))).toBe(true);
    expect(isFocusSearchChord(new KeyboardEvent('keydown', { key: 'k' }))).toBe(false);
  });
});

describe('SearchBar focus-search shortcut (#930)', () => {
  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
  ])('%s+K focuses the search input', (_name, modifier) => {
    render(<SearchBar onSearch={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveFocus();

    fireEvent.keyDown(window, { key: SHORTCUTS.focusSearch.key, ...modifier });

    expect(input).toHaveFocus();
  });

  it('works even while another input has focus', () => {
    render(
      <>
        <input aria-label="other" />
        <SearchBar onSearch={vi.fn()} />
      </>,
    );
    const other = screen.getByLabelText('other');
    other.focus();

    fireEvent.keyDown(other, { key: 'k', ctrlKey: true });

    expect(screen.getByPlaceholderText('Search…')).toHaveFocus();
  });

  it('ignores a bare k keypress', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'k' });

    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });
});
