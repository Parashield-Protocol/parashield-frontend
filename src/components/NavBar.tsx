'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { LogoWordmark } from './Logo';
import { WalletButton } from './WalletButton';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { KeyboardShortcutHelpModal } from './KeyboardShortcutHelpModal';
import { useTheme } from '@/context/ThemeContext';

const NAV_LINKS = [
  { href: '/',          label: 'Products'  },
  { href: '/policies',  label: 'My Policies' },
  { href: '/dashboard', label: 'Dashboard'   },
  { href: '/oracle',    label: 'Oracle'      },
  { href: '/pools',     label: 'Risk Pools'  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const mobileMenuRef = useFocusTrap(mobileMenuOpen);

  useKeyboardShortcut('Escape', () => {
    if (shortcutsOpen) setShortcutsOpen(false);
    else setMobileMenuOpen(false);
  });
  useKeyboardShortcut('?', () => setShortcutsOpen(true));

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <LogoWordmark size={28} />
        </Link>

        <div className="hidden items-center gap-6 text-sm md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? 'page' : undefined}
              className={`transition-colors hover:text-gray-950 dark:hover:text-white ${
                isActive(pathname, href)
                  ? 'text-gray-950 dark:text-white border-b-2 border-teal-400 pb-0.5'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="relative w-5 h-5 inline-block">
              {theme === 'dark' ? (
                <svg key="sun" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute animate-fade-in" style={{animation: 'fadeInRotate 300ms ease-in-out'}}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg key="moon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute animate-fade-in" style={{animation: 'fadeInRotate 300ms ease-in-out'}}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </div>
          </button>
          <WalletButton />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-nav" ref={mobileMenuRef} className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-gray-950">
          <div className="px-6 py-4 space-y-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(pathname, href) ? 'page' : undefined}
                className={`block py-2 text-sm transition-colors hover:text-gray-950 dark:hover:text-white ${
                  isActive(pathname, href)
                    ? 'text-gray-950 dark:text-white border-b-2 border-teal-400 pb-0.5'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <KeyboardShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </nav>
  );
}
