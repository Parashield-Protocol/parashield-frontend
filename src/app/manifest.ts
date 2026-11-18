import type { MetadataRoute } from 'next';
import { PWA_ICON_SIZES, pwaIconPath } from '@/lib/pwa-icon';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parashield — Parametric Insurance on Stellar',
    short_name: 'Parashield',
    description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#14b8a6',
    // Each entry points at an icon rendered at exactly its declared size
    // (#897), not at the 1680x600 wordmark logo.
    icons: PWA_ICON_SIZES.map((size) => ({
      src: pwaIconPath(size),
      sizes: `${size}x${size}`,
      type: 'image/png',
    })),
  };
}
