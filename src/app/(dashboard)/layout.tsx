import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-13rem)]">
      {children}
    </div>
  );
}