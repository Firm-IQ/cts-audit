import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateReadinessScores } from '@/lib/scoring';
import { autoCreateFindingsForAssessment } from '@/lib/findings-helper';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      advisorId: incomingAdvisorId,
      advisorName,
      firmName,
      email,
      phone,
      currentFirm,
      currentCustodian,
      futureCustodian,
      businessModel,
      protocolStatus,
      totalAum,
      annualRevenue,
      households,
      accounts,
      staffCount,
      crm,
      notes,
      
      // Client Data
      emailCompletenessPercent,
      phoneCompletenessPercent,
      addressCompletenessPercent,
      householdingQualityScore,
      duplicateRecordRiskScore,
      clientNotesQualityScore,

      // KYC
      kycUpdateFrequency,
      trustedContactCompletenessPercent,
      beneficiaryReviewStatus,
      riskToleranceCurrentPercent,
      investmentObjectiveCurrentPercent,
      missingSignatureRiskScore,
      documentStorageQualityScore,

      // Transfer Complexity
      percentIraAccounts,
      percentTrustAccounts,
      percentEntityAccounts,
      percentAnnuityAltAccounts,
      directBusinessAmount,
      heldAwayAssetsNotes,
      transferComplexityScore,

      // Operational
      staffCapacityScore,
      crmExportQualityScore,
      taskManagementScore,
      digitalSignatureReadinessScore,
      communicationPlanScore,

      // Compliance
      employmentAgreementReviewed,
      nonSolicitNonCompeteConcerns,
      legalReviewStatus,
      complianceRiskNotes,
    } = body;

    // Validate required fields
    if (!advisorName || !firmName) {
      return NextResponse.json(
        { error: 'Advisor Name and Firm Name are required' },
        { status: 400 }
      );
    }

    // Prepare inputs for scoring calculation
    const scoreInputs = {
      emailCompletenessPercent: Number(emailCompletenessPercent || 0),
      phoneCompletenessPercent: Number(phoneCompletenessPercent || 0),
      addressCompletenessPercent: Number(addressCompletenessPercent || 0),
      householdingQualityScore: Number(householdingQualityScore || 1),
      duplicateRecordRiskScore: Number(duplicateRecordRiskScore || 1),
      clientNotesQualityScore: Number(clientNotesQualityScore || 1),

      kycUpdateFrequency: kycUpdateFrequency || 'Ad-hoc',
      trustedContactCompletenessPercent: Number(trustedContactCompletenessPercent || 0),
      beneficiaryReviewStatus: beneficiaryReviewStatus || 'None',
      riskToleranceCurrentPercent: Number(riskToleranceCurrentPercent || 0),
      investmentObjectiveCurrentPercent: Number(investmentObjectiveCurrentPercent || 0),
      missingSignatureRiskScore: Number(missingSignatureRiskScore || 1),
      documentStorageQualityScore: Number(documentStorageQualityScore || 1),

      percentIraAccounts: Number(percentIraAccounts || 0),
      percentTrustAccounts: Number(percentTrustAccounts || 0),
      percentEntityAccounts: Number(percentEntityAccounts || 0),
      percentAnnuityAltAccounts: Number(percentAnnuityAltAccounts || 0),
      directBusinessAmount: Number(directBusinessAmount || 0),
      transferComplexityScore: Number(transferComplexityScore || 1),

      staffCapacityScore: Number(staffCapacityScore || 1),
      crmExportQualityScore: Number(crmExportQualityScore || 1),
      taskManagementScore: Number(taskManagementScore || 1),
      digitalSignatureReadinessScore: Number(digitalSignatureReadinessScore || 1),
      communicationPlanScore: Number(communicationPlanScore || 1),

      protocolStatus: protocolStatus || 'Unsure',
      employmentAgreementReviewed: Boolean(employmentAgreementReviewed),
      nonSolicitNonCompeteConcerns: Boolean(nonSolicitNonCompeteConcerns),
      legalReviewStatus: legalReviewStatus || 'None',
    };

    // Calculate dynamic scores
    const calculatedScores = calculateReadinessScores(scoreInputs);

    let advisorId = incomingAdvisorId;
    
    if (!advisorId) {
      // Look up existing advisor by name + firm
      const existingAdvisor = await prisma.advisor.findFirst({
        where: { name: advisorName, firmName }
      });

      if (existingAdvisor) {
        advisorId = existingAdvisor.id;
      } else {
        const advisor = await prisma.advisor.create({
          data: {
            name: advisorName,
            firmName,
            email,
            phone,
            currentFirm,
            currentCustodian,
            futureCustodian,
            businessModel: businessModel || 'Unknown',
            protocolStatus: protocolStatus || 'Unsure',
            totalAum: totalAum ? Number(totalAum) : null,
            annualRevenue: annualRevenue ? Number(annualRevenue) : null,
            households: households ? Number(households) : null,
            accounts: accounts ? Number(accounts) : null,
            staffCount: staffCount ? Number(staffCount) : null,
            crm,
            createdById: session.userId,
          }
        });
        advisorId = advisor.id;
      }
    } else {
      // Update existing advisor details
      await prisma.advisor.update({
        where: { id: advisorId },
        data: {
          name: advisorName,
          firmName,
          email,
          phone,
          currentFirm,
          currentCustodian,
          futureCustodian,
          businessModel: businessModel || 'Unknown',
          protocolStatus: protocolStatus || 'Unsure',
          totalAum: totalAum ? Number(totalAum) : null,
          annualRevenue: annualRevenue ? Number(annualRevenue) : null,
          households: households ? Number(households) : null,
          accounts: accounts ? Number(accounts) : null,
          staffCount: staffCount ? Number(staffCount) : null,
          crm,
        }
      });
    }

    const evaluatedRequirementsCount = await prisma.accountChecklistItem.count({
      where: {
        account: { household: { advisorId } },
        status: { in: ['Present', 'Verified', 'Inferred', 'Missing', 'Needs Review'] }
      }
    });

    if (evaluatedRequirementsCount === 0) {
      calculatedScores.overallReadinessScore = 0;
      calculatedScores.clientDataScore = 0;
      calculatedScores.kycDocumentationScore = 0;
      calculatedScores.transferComplexityScoreVal = 0;
      calculatedScores.operationalScore = 0;
      calculatedScores.complianceProtocolScore = 0;
      calculatedScores.communicationScore = 0;
    }

    const creatorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = creatorUser ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() : session.name;

    // Save Assessment to Database
    const { protocolStatus: _, ...scoreInputsForDb } = scoreInputs;
    const assessment = await prisma.assessment.create({
      data: {
        advisorId,
        notes,
        ...scoreInputsForDb,
        ...calculatedScores,
        createdByUserId: session.userId,
        lastUpdatedBy: userFullName
      },
    });

    // Log Recalculate Score Activity
    await prisma.activityLog.create({
      data: {
        advisorId,
        action: 'Recalculate',
        objectAffected: 'Score',
        description: `Readiness score initially calculated: ${calculatedScores.overallReadinessScore}% by ${userFullName}`,
        newValue: `${calculatedScores.overallReadinessScore}%`,
        createdByUserId: session.userId,
        createdByUserFullName: userFullName
      }
    });

    await autoCreateFindingsForAssessment(assessment.id, notes);

    return NextResponse.json({ id: assessment.id });
  } catch (error) {
    console.error('Create Assessment API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
