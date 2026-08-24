import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KeyboardShortcutHelpModal } from '../components/KeyboardShortcutHelpModal';

vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn(),
  getConnectedAddress: vi.fn(),
  signAuthMessage: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

describe('KeyboardShortcutHelpModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <KeyboardShortcutHelpModal open={false} onClose={vi.fn()} />
    );
    expect(html).not.toContain('dialog');
  });

  it('renders the modal with title when open', () => {
    const html = renderToStaticMarkup(
      <KeyboardShortcutHelpModal open={true} onClose={vi.fn()} />
    );
    expect(html).toContain('Keyboard Shortcuts');
  });

  it('lists the ? shortcut', () => {
    const html = renderToStaticMarkup(
      <KeyboardShortcutHelpModal open={true} onClose={vi.fn()} />
    );
    expect(html).toContain('?');
    expect(html).toContain('Show keyboard shortcuts');
  });

  it('lists the Escape shortcut', () => {
    const html = renderToStaticMarkup(
      <KeyboardShortcutHelpModal open={true} onClose={vi.fn()} />
    );
    expect(html).toContain('Esc');
    expect(html).toContain('Close modal');
  });
});
