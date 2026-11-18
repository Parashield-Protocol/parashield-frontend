import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Ctrl+K', description: 'Focus search' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal / menu' },
];

// Keyboard interactions that only apply while a specific widget has focus
// (#908): category filter tabs, listboxes, the export menu, policy cards and
// modals all follow their WAI-ARIA patterns.
export const CONTEXT_SHORTCUTS = [
  { context: 'Category filter tabs', key: '← → / Home End', description: 'Move between categories' },
  { context: 'Lists', key: '↑ ↓ / Home End', description: 'Move between options; type to jump' },
  { context: 'Export menu', key: '↑ ↓ / Home End', description: 'Move between items; Enter to select' },
  { context: 'Policy cards', key: 'Enter / Space', description: 'Open the policy' },
  { context: 'Modals', key: 'Tab / Shift+Tab', description: 'Cycle focus inside the dialog' },
];

const kbdClass =
  'rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-300';

export function KeyboardShortcutHelpModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <ul className="space-y-3">
        {SHORTCUTS.map(({ key, description }) => (
          <li key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{description}</span>
            <kbd className={kbdClass}>{key}</kbd>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        In menus, lists and dialogs
      </h3>
      <ul className="space-y-3">
        {CONTEXT_SHORTCUTS.map(({ context, key, description }) => (
          <li key={context} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-300">
              <span className="text-gray-400">{context}:</span> {description}
            </span>
            <kbd className={`${kbdClass} shrink-0`}>{key}</kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
