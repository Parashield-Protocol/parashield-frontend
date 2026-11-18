import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parashield — Parametric Insurance on Stellar',
    short_name: 'Parashield',
    description: 'Automatic payouts triggered by real-world data. No claims adjuster. Powered by Soroban smart contracts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#14b8a6',
    icons: [
      {
        src: '/assets/parashield-logo-dark.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/parashield-logo-dark.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
