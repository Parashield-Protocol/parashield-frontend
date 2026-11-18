import type { Metadata } from 'next';
import PolicyDetailClient from './policy-detail-client';

export function generateStaticParams() {
  return [];
}

/**
 * Static metadata built from the id in the URL (#919). Policy pages are
 * authenticated and not indexed, so the title only labels the user's browser
 * tab; fetching the policy here cost a backend call (with retries) on every
 * request, and ran server-side without the user's session anyway.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const label = id.length > 12 ? `${id.slice(0, 8)}…` : id;
  const title = `Policy ${label} — Parashield`;
  const description = 'View parametric insurance policy details on Parashield.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PolicyDetailClient params={params} />;
}
