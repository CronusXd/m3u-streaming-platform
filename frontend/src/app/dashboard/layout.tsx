'use client';

import NetflixLayout from '@/components/layouts/NetflixLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NetflixLayout>
      {children}
    </NetflixLayout>
  );
}
