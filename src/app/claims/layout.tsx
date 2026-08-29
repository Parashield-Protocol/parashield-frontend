import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claims | Parashield',
  description: 'Submit and manage your insurance claims on Parashield. Track claim status and receive automatic payouts.',
};

export default function ClaimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
