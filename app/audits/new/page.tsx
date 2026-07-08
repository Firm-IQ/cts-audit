import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Navbar } from '@/components/ui';
import AuditForm from '@/components/AuditForm';

interface NewAssessmentPageProps {
  searchParams: Promise<{ advisorId?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function NewAssessmentPage(props: NewAssessmentPageProps) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const { advisorId } = await props.searchParams;
  let initialData = {};

  if (advisorId) {
    const advisor = await prisma.advisor.findUnique({
      where: { id: advisorId }
    });
    if (advisor) {
      initialData = {
        advisorId: advisor.id,
        advisorName: advisor.name,
        firmName: advisor.firmName,
        email: advisor.email,
        phone: advisor.phone,
        currentFirm: advisor.currentFirm,
        currentCustodian: advisor.currentCustodian,
        futureCustodian: advisor.futureCustodian,
        businessModel: advisor.businessModel,
        protocolStatus: advisor.protocolStatus,
        totalAum: advisor.totalAum,
        annualRevenue: advisor.annualRevenue,
        households: advisor.households,
        accounts: advisor.accounts,
        staffCount: advisor.staffCount,
        crm: advisor.crm,
      };
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} />
      
      <main className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto">
        <AuditForm initialData={JSON.parse(JSON.stringify(initialData))} reviewerName={session.name || ''} />
      </main>
    </div>
  );
}
