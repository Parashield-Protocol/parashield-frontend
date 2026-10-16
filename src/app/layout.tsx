import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { ToastContainer } from '@/components/Toast';
import { NetworkBanner } from '@/components/NetworkBanner';
import { WalletProvider } from '@/context/WalletContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Analytics } from '@/components/Analytics';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateConfig } from '@/lib/constants';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import Link from 'next/link';
import { LogoWordmark } from '@/components/Logo';

validateConfig();

// Self-hosted at build time by next/font (#780): no render-blocking request to
// a font CDN, the woff2 is preloaded, and `swap` paints immediately with a
// metric-adjusted fallback so the late swap doesn't shift layout.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://parashield.app'),
  title:       'Parashield — Parametric Insurance on Stellar',
  description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
  manifest:    '/manifest.webmanifest',
  icons: {
    icon: '/assets/parashield-logo-dark.png',
  },
  openGraph: {
    title:       'Parashield',
    description: 'Parametric insurance on Stellar. Pay out in seconds, not weeks.',
    type:        'website',
    images: [
      {
        url:    '/opengraph-image',
        width:  1200,
        height: 630,
        alt:    'Parashield — Parametric Insurance on Stellar',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Parashield — Parametric Insurance on Stellar',
    description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
    images:      ['/opengraph-image'],
  },
};

const CURRENT_YEAR = new Date().getFullYear();

const NavBarFallback = (
  <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
      <Link href="/">
        <LogoWordmark size={28} />
      </Link>
    </div>
  </nav>
);

const FooterFallback = (
  <footer className="border-t border-gray-200 dark:border-white/10 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
    © {CURRENT_YEAR} Parashield · Built on Stellar · Powered by Soroban
  </footer>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-gray-950 text-white dark:bg-gray-950 dark:text-white bg-white text-gray-950 antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-teal-500 focus:px-4 focus:py-2 focus:text-white">Skip to main content</a>
        <Analytics />
        <ThemeProvider>
        <WalletProvider>
          <ToastProvider>
            <NetworkBanner />
            <ErrorBoundaryWrapper fallback={NavBarFallback}>
              <NavBar />
            </ErrorBoundary>
            <main id="main-content">
              <ErrorBoundaryWrapper>
                {children}
              </ErrorBoundaryWrapper>
            </main>
            <ErrorBoundaryWrapper fallback={null}>
              <ToastContainer />
            </ErrorBoundary>
          </ToastProvider>
        </WalletProvider>
        </ThemeProvider>
        <ErrorBoundaryWrapper fallback={FooterFallback}>
          <footer className="border-t border-gray-200 dark:border-white/10 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
            © {CURRENT_YEAR} Parashield · Built on Stellar · Powered by Soroban
          </footer>
        </ErrorBoundary>
      </body>
    </html>
  );
}
