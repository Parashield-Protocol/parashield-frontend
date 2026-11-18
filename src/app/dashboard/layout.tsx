import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Parashield',
  description: 'View your active insurance policies, track coverage, and monitor claims status on Parashield.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
