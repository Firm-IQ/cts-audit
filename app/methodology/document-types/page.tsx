import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import DocumentTypesClient from '@/components/DocumentTypesClient';

export const dynamic = 'force-dynamic';

export default async function DocumentTypesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch document types from database
  const docTypes = await prisma.documentType.findMany({
    orderBy: { displayOrder: 'asc' }
  });

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} role={session.role} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#d4af37]">Methodology Catalog</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
              Document Types
            </h1>
            <p className="text-xs text-slate-400">
              Manage the directory of regulatory, banking, and ownership validation documents.
            </p>
          </div>
        </div>

        <DocumentTypesClient 
          initialDocTypes={JSON.parse(JSON.stringify(docTypes))} 
          userRole={session.role || 'Read Only'}
        />
      </main>
    </div>
  );
}
