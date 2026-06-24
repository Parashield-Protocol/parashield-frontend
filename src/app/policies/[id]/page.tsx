import PolicyDetailClient from './policy-detail-client';

export function generateStaticParams() {
  return [{ id: 'dummy' }];
}

export const dynamicParams = false;

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <PolicyDetailClient params={params} />;
}
