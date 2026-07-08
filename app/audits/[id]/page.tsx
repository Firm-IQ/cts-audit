import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import AuditDetailClient from '@/components/AuditDetailClient';

interface AuditDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AssessmentDetailPage(props: AuditDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await props.params;

  // Fetch the assessment details from database including related advisor
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { advisor: true }
  });

  if (!assessment) {
    notFound();
  }

  // Map advisor relations flat to keep Detail UI completely compatible
  const mappedAudit = {
    ...assessment,
    advisorName: assessment.advisor.name,
    firmName: assessment.advisor.firmName,
    email: assessment.advisor.email,
    phone: assessment.advisor.phone,
    currentFirm: assessment.advisor.currentFirm,
    currentCustodian: assessment.advisor.currentCustodian,
    futureCustodian: assessment.advisor.futureCustodian,
    businessModel: assessment.advisor.businessModel,
    protocolStatus: assessment.advisor.protocolStatus,
    totalAum: assessment.advisor.totalAum,
    annualRevenue: assessment.advisor.annualRevenue,
    households: assessment.advisor.households,
    accounts: assessment.advisor.accounts,
    staffCount: assessment.advisor.staffCount,
    crm: assessment.advisor.crm,
  };

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} />
      
      <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto space-y-8">
        <AuditDetailClient audit={JSON.parse(JSON.stringify(mappedAudit))} />
      </main>
    </div>
  );
}
