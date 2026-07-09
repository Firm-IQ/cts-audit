import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import SettingsClient from '@/components/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'Super Admin') {
    return (
      <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
        <Navbar userName={session.name} email={session.email} role={session.role} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-[#1c2541] border border-slate-700/60 p-8 rounded-lg shadow-xl">
            <h1 className="text-2xl font-black text-rose-400 mb-2 animate-pulse">Access Denied</h1>
            <p className="text-slate-300 text-sm">
              You must have a <span className="font-semibold text-[#d4af37]">Super Admin</span> role to access this section.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 1. Fetch all users sorted by creation date desc
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // 2. Fetch Document Types
  const documentTypes = await prisma.documentType.findMany({
    orderBy: { displayOrder: 'asc' }
  });

  // 3. Fetch Requirement Library
  const requirementLibrary = await prisma.requirementLibrary.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      documentTypes: true
    }
  });

  // 4. Fetch Requirement Profiles
  const requirementProfiles = await prisma.requirementProfile.findMany({
    orderBy: { name: 'asc' },
    include: {
      profileRequirements: {
        include: {
          requirement: true
        }
      }
    }
  });

  // 5. Fetch Account Types
  const accountTypes = await prisma.accountType.findMany({
    orderBy: { displayOrder: 'asc' }
  });

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col">
      <Navbar userName={session.name} email={session.email} role={session.role} />
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        <SettingsClient 
          initialUsers={JSON.parse(JSON.stringify(users))}
          currentUser={session}
          initialDocumentTypes={JSON.parse(JSON.stringify(documentTypes))}
          initialRequirementLibrary={JSON.parse(JSON.stringify(requirementLibrary))}
          initialRequirementProfiles={JSON.parse(JSON.stringify(requirementProfiles))}
          initialAccountTypes={JSON.parse(JSON.stringify(accountTypes))}
        />
      </main>
    </div>
  );
}
