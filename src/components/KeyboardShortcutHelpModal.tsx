import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal / menu' },
];

export function KeyboardShortcutHelpModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <ul className="space-y-3">
        {SHORTCUTS.map(({ key, description }) => (
          <li key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{description}</span>
            <kbd className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-300">
              {key}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
