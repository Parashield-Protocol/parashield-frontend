import { fireEvent, render, screen } from '@testing-library/react';
import ClaimsPage from '../app/claims/page';

const { useWallet, useClaims } = vi.hoisted(() => ({
  useWallet: vi.fn(),
  useClaims: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({ useWallet }));
vi.mock('@/hooks/useClaims', () => ({ useClaims }));
vi.mock('@/components/ClaimHistoryTable', () => ({ ClaimHistoryTable: () => null }));
vi.mock('@/components/Breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/ConnectWalletPrompt', () => ({ ConnectWalletPrompt: () => null }));
vi.mock('@/lib/claimsExport', () => ({ downloadClaimsCSV: vi.fn(), downloadClaimsJSON: vi.fn() }));

describe('ClaimsPage export dropdown (#546)', () => {
  beforeEach(() => {
    useWallet.mockReturnValue({ address: 'GWALLET', connected: true });
    useClaims.mockReturnValue({
      claims: [{ id: 'c1' }],
      loading: false,
      error: null,
      pollingError: null,
      refetch: vi.fn(),
      paused: false,
      togglePause: vi.fn(),
      secondsUntilRefresh: null,
      secondsSinceRefresh: null,
    });
  });

  it('opens a viewport-constrained menu anchored left on mobile', () => {
    render(<ClaimsPage />);
    const trigger = screen.getByRole('button', { name: /Export/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('max-w-[calc(100vw-3rem)]');
    expect(menu.className).toContain('left-0');
    expect(menu.className).toContain('sm:right-0');
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('closes the menu on Escape', () => {
    render(<ClaimsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    expect(screen.queryByRole('menu')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens from the keyboard and moves focus with arrow keys, Home and End', () => {
    render(<ClaimsPage />);
    const trigger = screen.getByRole('button', { name: /Export/ });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const [csv, json] = screen.getAllByRole('menuitem');
    expect(csv).toHaveFocus();

    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(json).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); // wraps
    expect(csv).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(json).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(csv).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' }); // wraps
    expect(json).toHaveFocus();
  });

  it('ArrowUp on the trigger opens on the last item', () => {
    render(<ClaimsPage />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Export/ }), { key: 'ArrowUp' });
    expect(screen.getByRole('menuitem', { name: /JSON/ })).toHaveFocus();
  });

  it('Escape closes the menu and returns focus to the trigger', () => {
    render(<ClaimsPage />);
    const trigger = screen.getByRole('button', { name: /Export/ });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
