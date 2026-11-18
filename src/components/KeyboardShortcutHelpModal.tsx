import { Modal } from './Modal';
import { SHORTCUT_LIST } from '@/lib/shortcuts';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelpModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <ul className="space-y-3">
        {SHORTCUT_LIST.map(({ key, label, description }) => (
          <li key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{description}</span>
            <kbd className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-300">
              {label}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
