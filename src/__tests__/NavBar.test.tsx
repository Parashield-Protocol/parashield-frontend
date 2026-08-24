import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NavBar } from '../components/NavBar';

const mockUsePathname = vi.fn().mockReturnValue('/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/useKeyboardShortcut', () => ({
  useKeyboardShortcut: vi.fn(),
}));

vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn().mockReturnValue(null),
  getConnectedAddress: vi.fn().mockReturnValue(null),
  signAuthMessage: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

vi.mock('@/lib/api', () => ({
  fetchChallenge: vi.fn(),
  login: vi.fn(),
  setAuthErrorHandler: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  default: {
    getSession: vi.fn().mockReturnValue(null),
    setSession: vi.fn(),
    removeSession: vi.fn(),
  },
}));

vi.mock('@/components/Logo', () => ({
  Logo: () => <span>Logo</span>,
  LogoWordmark: () => <span>Logo</span>,
}));

vi.mock('@/components/WalletButton', () => ({
  WalletButton: () => <span>Wallet</span>,
}));

vi.mock('@/components/KeyboardShortcutHelpModal', () => ({
  KeyboardShortcutHelpModal: () => <div data-testid="shortcut-modal" />,
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ theme: 'dark', toggle: vi.fn() })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets aria-current="page" on the matching link', () => {
    mockUsePathname.mockReturnValue('/policies');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('aria-current="page"');
  });

  it('does not highlight "/" for sub-paths like "/policies/123"', () => {
    mockUsePathname.mockReturnValue('/policies/123');
    const html = renderToStaticMarkup(<NavBar />);
    const homeLinkMatch = html.match(/href="\/"[^>]*aria-current/);
    expect(homeLinkMatch).toBeNull();
  });

  it('renders all navigation links', () => {
    mockUsePathname.mockReturnValue('/');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/policies"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/oracle"');
    expect(html).toContain('href="/pools"');
  });

  it('has a mobile menu toggle button', () => {
    mockUsePathname.mockReturnValue('/');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('aria-expanded');
    expect(html).toContain('aria-controls="mobile-nav"');
  });

  it('includes logo and wallet button', () => {
    mockUsePathname.mockReturnValue('/');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('Logo');
    expect(html).toContain('Wallet');
  });

  it('renders the sticky nav container', () => {
    mockUsePathname.mockReturnValue('/');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('sticky');
    expect(html).toContain('nav');
  });

  it('renders the keyboard shortcut help modal', () => {
    mockUsePathname.mockReturnValue('/');
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('shortcut-modal');
  });
});
