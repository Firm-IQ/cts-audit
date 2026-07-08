import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch all advisors from database with their assessments to calculate overall metrics
  const advisors = await prisma.advisor.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assessments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        <DashboardClient initialAdvisors={JSON.parse(JSON.stringify(advisors))} />
      </main>
    </div>
  );
}
