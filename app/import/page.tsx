import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import CRMImportClient from '@/components/CRMImportClient';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch list of advisors to select as import target
  const advisors = await prisma.advisor.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} role={session.role} />
      
      <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto space-y-8">
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            CRM Import Engine
          </h1>
          <p className="text-xs text-slate-400">
            Upload client export data in CSV format, map schema fields, and automatically construct client books.
          </p>
        </div>

        <CRMImportClient initialAdvisors={JSON.parse(JSON.stringify(advisors))} />
      </main>
    </div>
  );
}
