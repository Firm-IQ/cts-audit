import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import LiveReportClient from './LiveReportClient';

export default async function LiveReportPage(
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;

  // 1. Fetch Advisor, latest assessment, households, accounts, and checklist items
  const advisor = await prisma.advisor.findFirst({
    where: { reportToken: token },
    include: {
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: {
          findings: {
            include: {
              household: true,
              account: true
            }
          }
        }
      },
      householdRecords: {
        include: {
          accounts: {
            include: {
              checklistItems: true
            }
          }
        }
      }
    }
  });

  // 2. Validate Token and Active Status
  if (!advisor || !advisor.reportEnabled) {
    notFound();
  }

  // 3. Log view date
  await prisma.advisor.update({
    where: { id: advisor.id },
    data: { reportLastViewed: new Date() }
  });

  // 4. Fetch Requirement Library to map critical/category metadata
  const requirements = await prisma.requirementLibrary.findMany({
    where: { active: true }
  });

  // Security Sanitization: Mask SSNs, Tax IDs, and Full Account Numbers
  const maskSensitive = (str: string | null | undefined): string => {
    if (!str) return '';
    // Mask SSN patterns (xxx-xx-xxxx or xxx xx xxxx)
    let result = str.replace(/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, '***-**-****');
    // Mask EIN/Tax ID patterns (xx-xxxxxxx)
    result = result.replace(/\b\d{2}-\d{7}\b/g, '**-*******');
    // Mask full account numbers (sequences of 6 to 12 digits, keeping last 4 digits visible)
    result = result.replace(/\b\d{6,12}\b/g, (m) => '*'.repeat(m.length - 4) + m.slice(-4));
    return result;
  };

  const sanitizedAdvisor = {
    id: advisor.id,
    name: advisor.name,
    firmName: advisor.firmName,
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
    initialScore: advisor.initialScore ?? (advisor.assessments[0]?.overallReadinessScore || 0)
  };

  const latestAssessment = advisor.assessments[0] || null;
  const sanitizedAssessment = latestAssessment ? {
    id: latestAssessment.id,
    notes: maskSensitive(latestAssessment.notes),
    overallReadinessScore: latestAssessment.overallReadinessScore,
    clientDataScore: latestAssessment.clientDataScore,
    kycDocumentationScore: latestAssessment.kycDocumentationScore,
    transferComplexityScoreVal: latestAssessment.transferComplexityScoreVal,
    operationalScore: latestAssessment.operationalScore,
    complianceProtocolScore: latestAssessment.complianceProtocolScore,
    communicationScore: latestAssessment.communicationScore,
    updatedAt: latestAssessment.updatedAt,
    createdAt: latestAssessment.createdAt,
    lastUpdatedBy: latestAssessment.lastUpdatedBy || 'System',
    currentPhase: latestAssessment.currentPhase || 'Initial Review',
  } : null;

  // Fetch Visible Notes
  const notes = await prisma.note.findMany({
    where: {
      advisorId: advisor.id,
      visibility: 'Advisor Report Visible',
      deletedAt: null
    },
    include: {
      createdBy: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const sanitizedNotes = notes.map(n => ({
    id: n.id,
    noteType: n.noteType,
    noteBody: maskSensitive(n.noteBody),
    createdAt: n.createdAt.toISOString(),
    createdByFullName: n.createdBy ? `${n.createdBy.firstName || ''} ${n.createdBy.lastName || ''}`.trim() : 'System',
    householdId: n.householdId,
    accountId: n.accountId,
    findingId: n.findingId,
    checklistItemId: n.checklistItemId
  }));

  // Fetch Activities
  const activities = await prisma.activityLog.findMany({
    where: {
      advisorId: advisor.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const sanitizedActivities = activities.map(act => ({
    id: act.id,
    action: act.action,
    objectAffected: act.objectAffected,
    description: act.description,
    previousValue: act.previousValue,
    newValue: act.newValue,
    createdAt: act.createdAt.toISOString(),
    createdByUserFullName: act.createdByUserFullName || 'System'
  }));

  // Calculate Days Since Last Update
  const daysSinceLastUpdate = latestAssessment 
    ? Math.max(0, Math.floor((Date.now() - new Date(latestAssessment.updatedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate Progress Since Last Update (Summary of changes in last 7 days)
  const recentActivities = activities.filter(act => {
    const actTime = new Date(act.createdAt).getTime();
    return (Date.now() - actTime) <= (7 * 24 * 60 * 60 * 1000);
  });
  const verifiedCount = recentActivities.filter(act => act.action === 'Verify').length;
  const resolvedCount = recentActivities.filter(act => act.action === 'Resolve').length;
  const progressSummary = `${verifiedCount} requirements verified and ${resolvedCount} findings resolved over the last 7 days.`;

  const sanitizedHouseholds = advisor.householdRecords.map(hh => ({
    id: hh.id,
    name: hh.name,
    totalAum: hh.totalAum,
    primaryClientName: hh.primaryClientName,
    readinessStatus: hh.readinessStatus,
    accounts: hh.accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      value: acc.value,
      readinessStatus: acc.readinessStatus,
      registration: maskSensitive(acc.registration),
      checklistItems: acc.checklistItems.map(item => {
        // Match requirement metadata in memory
        const req = requirements.find(r => r.name === item.itemName || r.id === item.itemKey);
        return {
          id: item.id,
          itemName: item.itemName,
          status: item.status,
          notes: maskSensitive(item.notes),
          verifiedDate: item.verifiedDate,
          critical: req?.critical || false,
          category: req?.category || 'Other'
        };
      })
    }))
  }));

  // Exclude internal CTS reviewerNotes and evidenceSummary completely
  const sanitizedFindings = (latestAssessment?.findings || []).map(f => ({
    id: f.id,
    category: f.category,
    title: f.title,
    description: maskSensitive(f.description),
    severity: f.severity,
    status: f.status,
    recommendation: maskSensitive(f.recommendation),
    dueDate: f.dueDate ? f.dueDate.toISOString().split('T')[0] : null,
    assignedTo: f.assignedTo,
    householdName: f.household?.name || null,
    accountName: f.account?.name || null,
    accountType: f.account?.type || null
  }));

  return (
    <LiveReportClient
      advisor={sanitizedAdvisor}
      assessment={sanitizedAssessment}
      households={sanitizedHouseholds}
      findings={sanitizedFindings}
      notes={sanitizedNotes}
      activities={sanitizedActivities}
      daysSinceLastUpdate={daysSinceLastUpdate}
      progressSummary={progressSummary}
    />
  );
}
