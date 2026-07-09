import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import AdvisorWorkspaceClient from '@/components/AdvisorWorkspaceClient';

interface AdvisorPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdvisorWorkspacePage(props: AdvisorPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await props.params;

  // Query advisor details including assessments (with findings), contacts, and journal entries
  const advisor = await prisma.advisor.findUnique({
    where: { id },
    include: {
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: {
          findings: {
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      contacts: {
        orderBy: { createdAt: 'desc' }
      },
      journalEntries: {
        orderBy: { date: 'desc' }
      },
      householdRecords: {
        orderBy: { name: 'asc' },
        include: {
          accounts: {
            orderBy: { name: 'asc' },
            include: {
              checklistItems: {
                include: {
                  requirement: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!advisor) {
    notFound();
  }

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
      
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        <AdvisorWorkspaceClient 
          advisor={JSON.parse(JSON.stringify(advisor))} 
          activeProfiles={JSON.parse(JSON.stringify(activeProfiles))}
        />
      </main>
    </div>
  );
}
