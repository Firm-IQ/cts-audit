import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import HouseholdsDashboardClient from '@/components/HouseholdsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function HouseholdsPage() {
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

  // Fetch all households with their advisor, accounts, checklist items, and findings
  const households = await prisma.household.findMany({
    orderBy: { name: 'asc' },
    include: {
      advisor: true,
      accounts: {
        orderBy: { name: 'asc' },
        include: {
          checklistItems: {
            include: {
              requirement: true
            }
          },
        },
      },
      findings: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Fetch all findings in the system to calculate overall dashboard metrics
  const allFindings = await prisma.finding.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Fetch active requirement profiles with assignments (profileRequirements) to load scoring rules
  const activeProfiles = await prisma.requirementProfile.findMany({
    where: { active: true },
    include: {
      profileRequirements: {
        include: {
          requirement: true
        }
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} role={session.role} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        <HouseholdsDashboardClient 
          initialHouseholds={JSON.parse(JSON.stringify(households))} 
          initialFindings={JSON.parse(JSON.stringify(allFindings))}
          userName={session.name || 'CTS Auditor'}
          activeProfiles={JSON.parse(JSON.stringify(activeProfiles))}
        />
      </main>
    </div>
  );
}
