import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/ui';
import HouseholdsDashboardClient from '@/components/HouseholdsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function HouseholdsPage() {
  redirect('/dashboard');
}
