import { prisma } from './db';
import { calculateReadinessScores } from './scoring';

/**
 * Checks if a requirement applies to an account based on type and registration.
 */
function doesRequirementApply(appliesToAccountTypes: string, accType: string, accRegistration: string | null): boolean {
  const normalizedApplies = appliesToAccountTypes.trim().toLowerCase();
  if (normalizedApplies === 'all') return true;

  const appliesList = normalizedApplies.split(',').map(s => s.trim().toLowerCase());
  const typeMatch = appliesList.includes(accType.trim().toLowerCase());
  const regMatch = accRegistration ? appliesList.includes(accRegistration.trim().toLowerCase()) : false;

  return typeMatch || regMatch;
}

/**
 * Classifies requirement items into 'Verified', 'Inferred', 'Unknown', or 'Not Applicable'.
 */
function getInitialStatus(key: string, isApplicable: boolean): string {
  if (!isApplicable) return 'Not Applicable';

  const paperworkKeys = [
    'banking_achAuthorization',
    'banking_voidedCheck',
    'banking_standingInstructions',
    'doc_advisoryAgreement',
    'doc_accountApplication',
    'doc_beneficiaryDesignation',
    'trust_certification',
    'trust_trusteePages',
    'trust_successorTrustee',
    'entity_articles',
    'entity_operatingAgreement',
    'entity_resolution',
    'estate_deathCertificate',
    'estate_letters',
    'estate_executor',
    'power_poa',
    'power_guardianship',
    'power_conservatorship',
    'retire_ira',
    'retire_inheritedIra',
    'retire_beneficiary',
    'special_annuities',
    'special_alts',
    'special_directBusiness'
  ];

  const isPaperwork = paperworkKeys.some(k => key.toLowerCase() === k.toLowerCase());
  if (isPaperwork) return 'Unknown';

  const verifiedKeys = [
    'client_addressCurrent',
    'client_emailCurrent',
    'client_phoneCurrent',
    'client_relationshipsVerified',
    'trust_taxId',
    'entity_ein',
    'entity_signers'
  ];

  const isVerified = verifiedKeys.some(k => key.toLowerCase() === k.toLowerCase());
  return isVerified ? 'Verified' : 'Inferred';
}

/**
 * Runs the post-import/seed evaluation pipeline for an advisor.
 */
export async function runEvaluationPipeline(advisorId: string, authorFullName: string = 'System') {
  console.log(`Starting post-import evaluation pipeline for Advisor ${advisorId}...`);

  // 1. Fetch advisor households and accounts
  const households = await prisma.household.findMany({
    where: { advisorId },
    include: { accounts: true }
  });

  const totalHhCount = households.length;
  if (totalHhCount === 0) {
    console.log('No households found for advisor. Skipping pipeline.');
    return;
  }

  const accounts = households.flatMap(h => h.accounts);
  const totalAccCount = accounts.length;

  // 1.5 Update Advisor AUM, revenue, households, and accounts counts
  const finalAdvisorAum = households.reduce((sum, h) => sum + (h.totalAum || 0), 0);
  const finalAdvisorRev = households.reduce((sum, h) => sum + (h.revenue || 0), 0);
  await prisma.advisor.update({
    where: { id: advisorId },
    data: {
      totalAum: finalAdvisorAum,
      annualRevenue: finalAdvisorRev,
      households: totalHhCount,
      accounts: totalAccCount
    }
  });

  // 2. Fetch all active requirements
  const activeRequirements = await prisma.requirementLibrary.findMany({
    where: { active: true }
  });

  // 3. Upsert Account Checklist Items
  console.log('Generating/updating account checklist items...');
  for (const acc of accounts) {
    for (const req of activeRequirements) {
      const isApplicable = doesRequirementApply(req.appliesToAccountTypes, acc.type, acc.registration);

      // Check if item already exists in database
      const existingItem = await prisma.accountChecklistItem.findUnique({
        where: {
          accountId_itemKey: {
            accountId: acc.id,
            itemKey: req.id
          }
        }
      });

      // Default status
      let targetStatus = getInitialStatus(req.id, isApplicable);

      // Preserve existing seeded status if it is Missing or Needs Review
      if (existingItem && ['Missing', 'Needs Review'].includes(existingItem.status)) {
        targetStatus = existingItem.status;
      }

      await prisma.accountChecklistItem.upsert({
        where: {
          accountId_itemKey: {
            accountId: acc.id,
            itemKey: req.id
          }
        },
        update: {
          itemName: req.name,
          requirementId: req.id,
          status: targetStatus
        },
        create: {
          accountId: acc.id,
          itemKey: req.id,
          itemName: req.name,
          requirementId: req.id,
          status: targetStatus,
          verifiedBy: 'System Auto-Evaluation'
        }
      });
    }
  }

  // 4. Reload all checklist items for this advisor
  const allChecklistItems = await prisma.accountChecklistItem.findMany({
    where: {
      account: {
        household: {
          advisorId
        }
      }
    },
    include: {
      account: true,
      requirement: true
    }
  });

  // 5. Manage Assessment & Findings
  // Find or create assessment
  let assessment = await prisma.assessment.findFirst({
    where: { advisorId },
    orderBy: { createdAt: 'desc' }
  });

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        advisorId,
        notes: '[Assessment Status]\nstage=Initial Review\npriority=Normal\nowner=CTS\ntags=\n\n[Client Data Completeness Criteria]\n\n[General Notes]\nAuto-created during post-import evaluation pipeline.',
        overallReadinessScore: 0,
        lastUpdatedBy: authorFullName
      }
    });
  }

  // Create Findings for Missing/Needs Review items, and clean up resolved/present items
  console.log('Synchronizing findings...');
  const unresolvedItems = allChecklistItems.filter(item => ['Missing', 'Needs Review'].includes(item.status));
  const resolvedItems = allChecklistItems.filter(item => !['Missing', 'Needs Review'].includes(item.status));

  // Remove findings for items that are no longer Missing/Needs Review
  const resolvedItemIds = resolvedItems.map(item => item.id);
  if (resolvedItemIds.length > 0) {
    await prisma.finding.deleteMany({
      where: {
        checklistItemId: { in: resolvedItemIds }
      }
    });
  }

  // Create or update findings for unresolved items
  for (const item of unresolvedItems) {
    const existingFinding = await prisma.finding.findFirst({
      where: { checklistItemId: item.id }
    });

    if (!existingFinding) {
      const severity = item.requirement?.critical ? 'Critical' : 'High';
      await prisma.finding.create({
        data: {
          assessmentId: assessment.id,
          category: item.requirement?.category || 'General',
          title: item.itemName,
          description: item.notes || `Requirement "${item.itemName}" is ${item.status.toLowerCase()}.`,
          severity,
          impact: `Lack of valid ${item.itemName} might delay or block client account transfer.`,
          recommendation: `Collect and verify ${item.itemName} documents.`,
          owner: 'Advisor',
          status: 'Open',
          reviewerNotes: `Auto-generated from checklist status: ${item.status}`,
          householdId: item.account.householdId,
          accountId: item.accountId,
          checklistItemId: item.id
        }
      });
    }
  }

  // 6. Calculate Dynamic Completeness Percentages
  console.log('Calculating dynamic completeness scores...');
  const emailCompleteHh = households.filter(h => h.email !== null).length;
  const phoneCompleteHh = households.filter(h => h.phone !== null).length;
  const addressCompleteHh = households.filter(h => h.address !== null).length;

  const emailCompletenessPercent = totalHhCount > 0 ? (emailCompleteHh / totalHhCount) * 100 : 0;
  const phoneCompletenessPercent = totalHhCount > 0 ? (phoneCompleteHh / totalHhCount) * 100 : 0;
  const addressCompletenessPercent = totalHhCount > 0 ? (addressCompleteHh / totalHhCount) * 100 : 0;

  // Trusted Contact
  const tcChecklists = allChecklistItems.filter(item => item.itemKey === 'client_trustedContact');
  const incompleteTcHhIds = new Set(
    tcChecklists
      .filter(c => ['Missing', 'Needs Review', 'Unknown'].includes(c.status))
      .map(c => c.account.householdId)
  );
  const trustedContactCompletenessPercent = totalHhCount > 0 ? ((totalHhCount - incompleteTcHhIds.size) / totalHhCount) * 100 : 0;

  // Risk Tolerance
  const rtChecklists = allChecklistItems.filter(item => item.itemKey === 'kyc_riskTolerance');
  const presentRtCount = rtChecklists.filter(item => ['Present', 'Verified', 'Inferred'].includes(item.status)).length;
  const riskToleranceCurrentPercent = rtChecklists.length > 0 ? (presentRtCount / rtChecklists.length) * 100 : 0;

  // Investment Objectives
  const ioChecklists = allChecklistItems.filter(item => item.itemKey === 'kyc_investmentObjectives');
  const presentIoCount = ioChecklists.filter(item => ['Present', 'Verified', 'Inferred'].includes(item.status)).length;
  const investmentObjectiveCurrentPercent = ioChecklists.length > 0 ? (presentIoCount / ioChecklists.length) * 100 : 0;

  // Critical issues count for signature risk
  const criticalIssuesCount = allChecklistItems.filter(item =>
    ['Missing', 'Needs Review'].includes(item.status) && item.requirement?.critical
  ).length;
  const missingSignatureRiskScore = Math.min(10, Math.max(1, Math.round(criticalIssuesCount / 4)));

  // Account types ratios
  const iraCount = accounts.filter(a => a.type.toLowerCase().includes('ira') || a.type.toLowerCase().includes('401(k)')).length;
  const trustCount = accounts.filter(a => a.type === 'Trust').length;
  const entityCount = accounts.filter(a => a.type === 'Entity').length;
  const annuityAltCount = accounts.filter(a => ['Annuity', 'Alternative Investment'].includes(a.type)).length;

  const percentIraAccounts = totalAccCount > 0 ? (iraCount / totalAccCount) * 100 : 0;
  const percentTrustAccounts = totalAccCount > 0 ? (trustCount / totalAccCount) * 100 : 0;
  const percentEntityAccounts = totalAccCount > 0 ? (entityCount / totalAccCount) * 100 : 0;
  const percentAnnuityAltAccounts = totalAccCount > 0 ? (annuityAltCount / totalAccCount) * 100 : 0;

  // Compile inputs for score generator
  const dbAdvisor = await prisma.advisor.findUnique({ where: { id: advisorId } });
  const scoreInputs = {
    emailCompletenessPercent,
    phoneCompletenessPercent,
    addressCompletenessPercent,
    householdingQualityScore: assessment.householdingQualityScore ?? 10,
    duplicateRecordRiskScore: assessment.duplicateRecordRiskScore ?? 10,
    clientNotesQualityScore: assessment.clientNotesQualityScore ?? 9,
    kycUpdateFrequency: assessment.kycUpdateFrequency ?? 'Triennial',
    trustedContactCompletenessPercent,
    beneficiaryReviewStatus: assessment.beneficiaryReviewStatus ?? 'Incomplete',
    riskToleranceCurrentPercent,
    investmentObjectiveCurrentPercent,
    missingSignatureRiskScore,
    documentStorageQualityScore: assessment.documentStorageQualityScore ?? 8,
    percentIraAccounts,
    percentTrustAccounts,
    percentEntityAccounts,
    percentAnnuityAltAccounts,
    directBusinessAmount: assessment.directBusinessAmount ?? 0,
    transferComplexityScore: assessment.transferComplexityScore ?? 2,
    staffCapacityScore: assessment.staffCapacityScore ?? 8,
    crmExportQualityScore: assessment.crmExportQualityScore ?? 9,
    taskManagementScore: assessment.taskManagementScore ?? 8,
    digitalSignatureReadinessScore: assessment.digitalSignatureReadinessScore ?? 9,
    communicationPlanScore: assessment.communicationPlanScore ?? 8,
    protocolStatus: dbAdvisor?.protocolStatus || 'Yes',
    employmentAgreementReviewed: assessment.employmentAgreementReviewed ?? true,
    nonSolicitNonCompeteConcerns: assessment.nonSolicitNonCompeteConcerns ?? false,
    legalReviewStatus: assessment.legalReviewStatus ?? 'Completed'
  };

  const calculatedScores = calculateReadinessScores(scoreInputs);
  const { protocolStatus: _, ...scoreInputsForDb } = scoreInputs;

  // 7. Update Advisor & Assessment Scores
  const updatedAssessment = await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      ...scoreInputsForDb,
      ...calculatedScores,
      lastUpdatedBy: authorFullName
    }
  });

  // Log Score Recalculation
  if (updatedAssessment.overallReadinessScore !== assessment.overallReadinessScore) {
    await prisma.activityLog.create({
      data: {
        advisorId,
        action: 'Recalculate',
        objectAffected: 'Score',
        description: `Readiness score recalculated: ${assessment.overallReadinessScore}% → ${updatedAssessment.overallReadinessScore}% by ${authorFullName}`,
        previousValue: `${assessment.overallReadinessScore}%`,
        newValue: `${updatedAssessment.overallReadinessScore}%`,
        createdByUserId: assessment.createdByUserId,
        createdByUserFullName: authorFullName
      }
    });
  }

  // 8. Roll account scores into household readiness status
  console.log('Rolling up readiness statuses...');
  for (const hh of households) {
    const hhChecklist = allChecklistItems.filter(item => item.account.householdId === hh.id);

    const hasMissing = hhChecklist.some(c => c.status === 'Missing');
    const hasNeedsReview = hhChecklist.some(c => c.status === 'Needs Review');

    let status = 'Ready';
    if (hasMissing) {
      status = 'Significant Cleanup';
    } else if (hasNeedsReview) {
      status = 'Minor Cleanup';
    }

    await prisma.household.update({
      where: { id: hh.id },
      data: { readinessStatus: status }
    });
  }

  // 9. Roll checklist items into account readiness status
  for (const acc of accounts) {
    const accChecklist = allChecklistItems.filter(item => item.accountId === acc.id);

    const hasMissing = accChecklist.some(c => c.status === 'Missing');
    const hasNeedsReview = accChecklist.some(c => c.status === 'Needs Review');

    let status = 'Ready';
    if (hasMissing) {
      status = 'Missing Items';
    } else if (hasNeedsReview) {
      status = 'Needs Review';
    }

    await prisma.account.update({
      where: { id: acc.id },
      data: { readinessStatus: status }
    });
  }

  console.log(`Evaluation pipeline completed. Overall Readiness Score: ${updatedAssessment.overallReadinessScore}%`);
}
