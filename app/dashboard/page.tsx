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

  // Automatically evaluate existing Michael Bennett demo advisor if pending/not evaluated
  const bennett = await prisma.advisor.findFirst({
    where: { name: 'Michael Bennett' }
  });
  if (bennett) {
    const hasRun = await prisma.accountChecklistItem.findFirst({
      where: {
        account: { household: { advisorId: bennett.id } },
        status: { in: ['Verified', 'Inferred'] }
      }
    });
    if (!hasRun) {
      const { runEvaluationPipeline } = require('@/lib/evaluation-pipeline');
      await runEvaluationPipeline(bennett.id, 'System Auto-Evaluation');
    }
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
      <Navbar userName={session.name} email={session.email} role={session.role} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        <DashboardClient initialAdvisors={JSON.parse(JSON.stringify(advisors))} />
      </main>
    </div>
  );
}
