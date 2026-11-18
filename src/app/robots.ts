import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // '/policies/' also covers detail pages, as defence in depth behind
        // their per-page noindex metadata (#912).
        disallow: ['/dashboard', '/policies', '/policies/', '/claims'],
      },
    ],
    sitemap: 'https://parashield.app/sitemap.xml',
  };
}
