import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'Parashield — Parametric Insurance on Stellar',
  description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
  openGraph: {
    title:       'Parashield',
    description: 'Parametric insurance on Stellar. Pay out in seconds, not weeks.',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <nav className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-400">Para</span>
              <span className="text-xl font-bold text-white">shield</span>
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a href="/"          className="text-gray-400 hover:text-white transition-colors">Products</a>
              <a href="/policies"  className="text-gray-400 hover:text-white transition-colors">My Policies</a>
              <a href="/pools"     className="text-gray-400 hover:text-white transition-colors">Risk Pools</a>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-600">
          © 2026 Parashield · Built on Stellar · Powered by Soroban
        </footer>
      </body>
    </html>
  );
}
