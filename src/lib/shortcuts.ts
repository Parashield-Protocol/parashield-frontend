/**
 * Single registry of the app's global keyboard shortcuts (#930). Components
 * register handlers through `useKeyboardShortcut` using these `key`s, and
 * `KeyboardShortcutHelpModal` renders this same list — so the help modal can't
 * drift from what is actually bound.
 */
export interface ShortcutDefinition {
  /** `KeyboardEvent.key` value passed to useKeyboardShortcut. */
  key: string;
  /** How the shortcut is shown to the user. */
  label: string;
  description: string;
}

export const SHORTCUTS = {
  focusSearch: { key: 'k', label: 'Ctrl+K', description: 'Focus search' },
  showHelp: { key: '?', label: '?', description: 'Show keyboard shortcuts' },
  close: { key: 'Escape', label: 'Esc', description: 'Close modal / menu' },
} as const satisfies Record<string, ShortcutDefinition>;

/** Display order for the help modal. */
export const SHORTCUT_LIST: readonly ShortcutDefinition[] = [
  SHORTCUTS.focusSearch,
  SHORTCUTS.showHelp,
  SHORTCUTS.close,
];

/**
 * Ctrl+K on Windows/Linux and Cmd+K on macOS both focus search, and they must
 * work even while another input has focus — so this replaces the hook's
 * default "skip editable targets" filter.
 */
export function isFocusSearchChord(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}
