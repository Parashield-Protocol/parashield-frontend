import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { ToastContainer } from '@/components/Toast';
import { NetworkBanner } from '@/components/NetworkBanner';
import { WalletProvider } from '@/context/WalletContext';
import { ToastProvider } from '@/context/ToastContext';
import { Analytics } from '@/components/Analytics';

export const metadata: Metadata = {
  metadataBase: new URL('https://parashield.app'),
  title:       'Parashield — Parametric Insurance on Stellar',
  description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <WalletProvider>
          <ToastProvider>
            <Analytics />
            <NetworkBanner />
            <NavBar />
            {children}
            <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-600">
              © 2026 Parashield · Built on Stellar · Powered by Soroban
            </footer>
            <ToastContainer />
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
