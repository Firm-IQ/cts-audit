import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      householdId,
      name,
      type,
      value,
      custodian,
      registration,
      notes,
      readinessStatus,
    } = body;

    if (!householdId) {
      return NextResponse.json({ error: 'Household ID is required' }, { status: 400 });
    }
    if (!name || !type) {
      return NextResponse.json({ error: 'Account Name and Type are required' }, { status: 400 });
    }

    // 1. Create the account
    const account = await prisma.account.create({
      data: {
        householdId,
        name,
        type,
        value: value ? parseFloat(value) : null,
        custodian: custodian || '',
        registration: registration || '',
        notes: notes || '',
        readinessStatus: readinessStatus || 'Not Reviewed',
      },
    });

    // 2. Fetch the appropriate RequirementProfile
    // Search first for a custodian matching profile (e.g. Schwab, Fidelity)
    let profile = null;
    if (custodian) {
      profile = await prisma.requirementProfile.findFirst({
        where: {
          name: { equals: custodian.trim() },
          active: true
        },
        include: {
          profileRequirements: {
            include: {
              requirement: true
            }
          }
        }
      });
    }

    // Fall back to the CTS Master Requirements profile if none found
    if (!profile) {
      profile = await prisma.requirementProfile.findUnique({
        where: { name: 'CTS Master Requirements' },
        include: {
          profileRequirements: {
            include: {
              requirement: true
            }
          }
        }
      });
    }

    if (profile) {
      // 3. Map profileRequirements to checklist items, ignoring Hidden states
      const checklistData = profile.profileRequirements
        .filter(pr => pr.state !== 'Hidden' && pr.requirement.active)
        .map(pr => {
          const req = pr.requirement;
          const isAll = req.appliesToAccountTypes.toLowerCase() === 'all';
          const appliesList = req.appliesToAccountTypes.split(',').map(s => s.trim().toLowerCase());
          const isApplicable = isAll || appliesList.includes(type.trim().toLowerCase());

          return {
            accountId: account.id,
            itemKey: req.id,
            itemName: req.name,
            status: isApplicable ? 'Not Reviewed' : 'Not Applicable',
            notes: '',
            verifiedBy: '',
            verifiedDate: '',
            requirementId: req.id,
          };
        });

      // 4. Batch insert checklist items
      if (checklistData.length > 0) {
        await prisma.accountChecklistItem.createMany({
          data: checklistData,
        });
      }
    }

    const populatedAccount = await prisma.account.findUnique({
      where: { id: account.id },
      include: {
        checklistItems: {
          include: {
            requirement: true
          }
        },
      },
    });

    return NextResponse.json({ success: true, account: populatedAccount });
  } catch (error) {
    console.error('Create Account API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
