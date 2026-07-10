import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateReadinessScores } from '@/lib/scoring';
import { autoCreateFindingsForAssessment } from '@/lib/findings-helper';

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

    // Verify assessment exists
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: { advisor: true }
    });

    if (!existingAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
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
      currentPhase,
      
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

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

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

    // Update related Advisor details
    await prisma.advisor.update({
      where: { id: existingAssessment.advisorId },
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

    // Update Assessment details
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        notes,
        ...scoreInputs,
        ...calculatedScores,
        currentPhase: currentPhase || existingAssessment.currentPhase,
        lastUpdatedBy: userFullName
      },
    });

    // Track Phase Change Activity
    if (currentPhase && currentPhase !== existingAssessment.currentPhase) {
      await prisma.activityLog.create({
        data: {
          advisorId: existingAssessment.advisorId,
          action: 'Update',
          objectAffected: 'Phase',
          description: `Assessment phase changed from "${existingAssessment.currentPhase}" to "${currentPhase}" by ${userFullName}`,
          previousValue: existingAssessment.currentPhase,
          newValue: currentPhase,
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    }

    // Track Score Recalculation Activity
    if (calculatedScores.overallReadinessScore !== existingAssessment.overallReadinessScore) {
      await prisma.activityLog.create({
        data: {
          advisorId: existingAssessment.advisorId,
          action: 'Recalculate',
          objectAffected: 'Score',
          description: `Readiness score recalculated: ${existingAssessment.overallReadinessScore}% → ${calculatedScores.overallReadinessScore}% by ${userFullName}`,
          previousValue: `${existingAssessment.overallReadinessScore}%`,
          newValue: `${calculatedScores.overallReadinessScore}%`,
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    }

    await autoCreateFindingsForAssessment(updatedAssessment.id, notes);

    return NextResponse.json({ success: true, id: updatedAssessment.id });
  } catch (error) {
    console.error('Update Assessment API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!existingAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    await prisma.assessment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Assessment API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
