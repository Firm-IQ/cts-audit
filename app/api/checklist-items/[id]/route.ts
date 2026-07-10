import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

    const item = await prisma.accountChecklistItem.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            household: {
              include: {
                advisor: {
                  include: {
                    assessments: {
                      orderBy: { createdAt: 'desc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, verifiedBy, verifiedDate } = body;

    const updatedItem = await prisma.accountChecklistItem.update({
      where: { id },
      data: {
        status: status || 'Not Applicable',
        notes: notes || '',
        verifiedBy: verifiedBy || '',
        verifiedDate: verifiedDate || '',
      },
    });

    // Log checklist item state change activity
    if (status === 'Present' && item.status !== 'Present') {
      await prisma.activityLog.create({
        data: {
          advisorId: item.account.household.advisorId,
          householdId: item.account.householdId,
          accountId: item.accountId,
          checklistItemId: id,
          action: 'Verify',
          objectAffected: 'Requirement',
          description: `Requirement "${item.itemName}" verified by ${userFullName}`,
          previousValue: item.status,
          newValue: 'Present',
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    } else if (status !== item.status) {
      await prisma.activityLog.create({
        data: {
          advisorId: item.account.household.advisorId,
          householdId: item.account.householdId,
          accountId: item.accountId,
          checklistItemId: id,
          action: 'Update',
          objectAffected: 'Requirement',
          description: `Requirement "${item.itemName}" marked as ${status} by ${userFullName}`,
          previousValue: item.status,
          newValue: status,
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    }

    // Find latest assessment for this advisor
    const advisor = item.account.household.advisor;
    let assessmentId = advisor.assessments[0]?.id;

    if (!assessmentId) {
      // Create a default assessment for the advisor if one doesn't exist
      const defaultAssessment = await prisma.assessment.create({
        data: {
          advisorId: advisor.id,
          notes: '[Assessment Status]\nStage: Discovery Call Scheduled\n[General Notes]\nAuto-generated for checklist findings.',
        },
      });
      assessmentId = defaultAssessment.id;
    }

    // Touch parent assessment to record the meaningful change and last updated user
    if (assessmentId) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          lastUpdatedBy: userFullName,
          updatedAt: new Date()
        }
      });
    }

    if (status === 'Present' || status === 'Not Applicable') {
      // Find open findings to log them before auto-resolving
      const openFindings = await prisma.finding.findMany({
        where: {
          checklistItemId: id,
          status: 'Open',
        }
      });
      for (const f of openFindings) {
        await prisma.activityLog.create({
          data: {
            advisorId: item.account.household.advisorId,
            householdId: item.account.householdId,
            accountId: item.accountId,
            findingId: f.id,
            checklistItemId: id,
            action: 'Resolve',
            objectAffected: 'Finding',
            description: `Finding "${f.title}" auto-resolved (Checklist item marked as ${status})`,
            previousValue: 'Open',
            newValue: 'Resolved',
            createdByUserId: session.userId,
            createdByUserFullName: userFullName
          }
        });
      }

      // Auto-resolve any open findings associated with this checklist item
      await prisma.finding.updateMany({
        where: {
          checklistItemId: id,
          status: 'Open',
        },
        data: {
          status: 'Resolved',
          resolutionNotes: `Auto-resolved: Checklist item marked as ${status}.`,
          reviewerNotes: `Auto-resolved: Checklist item marked as ${status}.`,
        },
      });
    } else if (status === 'Missing' || status === 'Needs Review') {
      // Auto-create or update an open finding associated with this checklist item
      const existingFinding = await prisma.finding.findFirst({
        where: {
          checklistItemId: id,
          status: 'Open',
        },
      });

      if (!existingFinding) {
        const newFinding = await prisma.finding.create({
          data: {
            assessmentId,
            category: 'Documentation',
            title: `${item.account.household.name} - ${item.account.name} - ${item.itemName}`,
            description: `Checklist item "${item.itemName}" for account "${item.account.name}" in household "${item.account.household.name}" is marked as ${status}.${notes ? ' Notes: ' + notes : ''}`,
            severity: status === 'Missing' ? 'High' : 'Moderate',
            priority: status === 'Missing' ? 'High' : 'Normal',
            owner: 'Advisor',
            assignedTo: 'Advisor Staff',
            status: 'Open',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            householdId: item.account.householdId,
            accountId: item.accountId,
            checklistItemId: id,
            evidenceSummary: `Verified by: ${verifiedBy || 'N/A'}, Date: ${verifiedDate || 'N/A'}`,
          },
        });

        // Log Finding Creation Activity
        await prisma.activityLog.create({
          data: {
            advisorId: item.account.household.advisorId,
            householdId: item.account.householdId,
            accountId: item.accountId,
            findingId: newFinding.id,
            checklistItemId: id,
            action: 'Create',
            objectAffected: 'Finding',
            description: `Finding "${newFinding.title}" auto-created`,
            previousValue: null,
            newValue: 'Open',
            createdByUserId: session.userId,
            createdByUserFullName: userFullName
          }
        });
      } else {
        await prisma.finding.update({
          where: { id: existingFinding.id },
          data: {
            severity: status === 'Missing' ? 'High' : 'Moderate',
            priority: status === 'Missing' ? 'High' : 'Normal',
            description: `Checklist item "${item.itemName}" for account "${item.account.name}" in household "${item.account.household.name}" is marked as ${status}.${notes ? ' Notes: ' + notes : ''}`,
            evidenceSummary: `Verified by: ${verifiedBy || 'N/A'}, Date: ${verifiedDate || 'N/A'}`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, checklistItem: updatedItem });
  } catch (error) {
    console.error('Update Checklist Item API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
