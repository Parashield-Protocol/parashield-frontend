import type { Metadata } from 'next';
import PolicyDetailClient from './policy-detail-client';
import { fetchPolicy } from '@/lib/api';

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const policy = await fetchPolicy(id);
    const productName = policy.product?.name ?? 'Policy';
    const statusLabel = policy.status;
    return {
      title: `${productName} — Policy ${statusLabel}`,
      description: `${productName} parametric insurance policy. Status: ${statusLabel}. Coverage on Parashield.`,
      openGraph: {
        title: `${productName} — Policy ${statusLabel}`,
        description: `${productName} parametric insurance policy on Parashield.`,
      },
      twitter: {
        title: `${productName} — Policy ${statusLabel}`,
        description: `${productName} parametric insurance policy on Parashield.`,
      },
    };
  } catch {
    return {
      title: 'Policy Details — Parashield',
      description: 'View parametric insurance policy details on Parashield.',
    };
  }
}

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PolicyDetailClient params={params} />;
}
