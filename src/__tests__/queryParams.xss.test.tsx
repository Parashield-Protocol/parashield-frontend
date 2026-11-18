import { render, screen } from '@testing-library/react';
import {
  parseEnumParam,
  parsePageParam,
  sanitizeSearchParam,
  serializeJsonLd,
  MAX_SEARCH_QUERY_LENGTH,
} from '../lib/queryParams';
import PoliciesPage from '../app/policies/page';

const { useWallet, usePolicies, searchParams, replace } = vi.hoisted(() => ({
  useWallet: vi.fn(),
  usePolicies: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  replace: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({ useWallet }));
vi.mock('@/hooks/usePolicies', () => ({ usePolicies }));
vi.mock('@/components/PolicyCard', () => ({ PolicyCard: () => null }));
vi.mock('@/components/ConnectWalletPrompt', () => ({ ConnectWalletPrompt: () => null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.current,
  useRouter: () => ({ replace }),
  usePathname: () => '/policies',
}));

const XSS_PAYLOADS = [
  '<script>window.__xss = true</script>',
  '<img src=x onerror="window.__xss = true">',
  '"><svg onload="window.__xss = true">',
  'javascript:window.__xss=true',
];

describe('query param parsing', () => {
  it('only accepts whitelisted enum values', () => {
    const allowed = ['grid', 'list'] as const;
    expect(parseEnumParam('list', allowed, 'grid')).toBe('list');
    expect(parseEnumParam('<script>', allowed, 'grid')).toBe('grid');
    expect(parseEnumParam('LIST', allowed, 'grid')).toBe('grid');
    expect(parseEnumParam(null, allowed, 'grid')).toBe('grid');
  });

  it('rejects malformed page numbers', () => {
    expect(parsePageParam('3')).toBe(3);
    expect(parsePageParam('-1')).toBe(0);
    expect(parsePageParam('1.5')).toBe(0);
    expect(parsePageParam('1e3')).toBe(0);
    expect(parsePageParam('<script>')).toBe(0);
    expect(parsePageParam('99999999')).toBe(0);
    expect(parsePageParam(null)).toBe(0);
  });

  it('strips control and invisible characters and caps search length', () => {
    expect(sanitizeSearchParam('  abc\u0000\u202E\u200Bdef  ')).toBe('abcdef');
    expect(sanitizeSearchParam('x'.repeat(500))).toHaveLength(MAX_SEARCH_QUERY_LENGTH);
    expect(sanitizeSearchParam(null)).toBe('');
  });

  it('escapes JSON-LD so values cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>&' });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>&' });
  });
});

describe('PoliciesPage reflected XSS', () => {
  beforeEach(() => {
    delete (window as unknown as { __xss?: boolean }).__xss;
    useWallet.mockReturnValue({ address: 'GWALLET', connected: true });
    usePolicies.mockReturnValue({
      policies: [{ id: 'pol-1', status: 'Active' }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it.each(XSS_PAYLOADS)('renders ?q=%s as inert text', (payload) => {
    searchParams.current = new URLSearchParams({ q: payload });
    const { container } = render(<PoliciesPage />);

    expect(container.querySelector('script, img, svg[onload]')).toBeNull();
    expect(container.querySelector('[onerror], [onload]')).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();

    // Value is shown back to the user as text, not markup.
    expect((screen.getByLabelText('Search policies') as HTMLInputElement).value).toBe(payload);
    expect(screen.getByText(`No policies found matching "${payload}". Try a different search term.`)).toBeTruthy();
  });

  it('falls back to defaults for invalid status, sort, view and page params', () => {
    searchParams.current = new URLSearchParams({
      status: '<img src=x onerror=alert(1)>',
      sort: '"><script>',
      view: 'javascript:alert(1)',
      page: '-5',
    });
    render(<PoliciesPage />);

    expect(screen.getByRole('tab', { name: /^All/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('region').getAttribute('aria-label')).toBe('All policies grid');
    expect(document.querySelector('img')).toBeNull();
  });
});
