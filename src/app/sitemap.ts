import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://parashield.app';
  // Generation time rather than a hardcoded date (#898), so `lastModified`
  // tracks the deploy that produced the sitemap instead of going stale.
  const LAST_CONTENT_UPDATE = new Date();

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
