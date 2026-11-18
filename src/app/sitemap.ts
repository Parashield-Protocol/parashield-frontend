import type { MetadataRoute } from 'next';

const LAST_CONTENT_UPDATE = new Date('2026-08-01T00:00:00.000Z');

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://parashield.app';

  return [
    {
      url: baseUrl,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pools`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/oracle`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];
}
