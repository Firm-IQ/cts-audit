const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function calculateReadinessScores(data) {
  const householdingVal = Math.min(10, Math.max(1, data.householdingQualityScore)) * 10;
  const duplicateRiskVal = (11 - Math.min(10, Math.max(1, data.duplicateRecordRiskScore))) * 10;
  const clientNotesVal = Math.min(10, Math.max(1, data.clientNotesQualityScore)) * 10;
  const clientDataScore = (
    data.emailCompletenessPercent +
    data.phoneCompletenessPercent +
    data.addressCompletenessPercent +
    householdingVal +
    duplicateRiskVal +
    clientNotesVal
  ) / 6;

  let kycFreqVal = 30;
  if (data.kycUpdateFrequency === "Annual") kycFreqVal = 100;
  else if (data.kycUpdateFrequency === "Triennial") kycFreqVal = 60;
  
  let benReviewVal = 0;
  if (data.beneficiaryReviewStatus === "Complete") benReviewVal = 100;
  else if (data.beneficiaryReviewStatus === "Incomplete") benReviewVal = 50;

  const missingSigRiskVal = (11 - Math.min(10, Math.max(1, data.missingSignatureRiskScore))) * 10;
  const docStorageVal = Math.min(10, Math.max(1, data.documentStorageQualityScore)) * 10;

  const kycDocumentationScore = (
    kycFreqVal +
    data.trustedContactCompletenessPercent +
    benReviewVal +
    data.riskToleranceCurrentPercent +
    data.investmentObjectiveCurrentPercent +
    missingSigRiskVal +
    docStorageVal
  ) / 7;

  const baseComplexityVal = (11 - Math.min(10, Math.max(1, data.transferComplexityScore))) * 10;
  let penalty = 0;
  if (data.percentAnnuityAltAccounts > 20) penalty += 10;
  if (data.directBusinessAmount > 1000000) penalty += 5;
  const transferComplexityScoreVal = Math.max(0, baseComplexityVal - penalty);

  const staffCapVal = Math.min(10, Math.max(1, data.staffCapacityScore)) * 10;
  const crmExportVal = Math.min(10, Math.max(1, data.crmExportQualityScore)) * 10;
  const taskMgmtVal = Math.min(10, Math.max(1, data.taskManagementScore)) * 10;
  const digSigVal = Math.min(10, Math.max(1, data.digitalSignatureReadinessScore)) * 10;
  const operationalScore = (staffCapVal + crmExportVal + taskMgmtVal + digSigVal) / 4;

  let protocolVal = 50;
  if (data.protocolStatus === "Yes") protocolVal = 100;
  else if (data.protocolStatus === "No") protocolVal = 30;

  const agreementVal = data.employmentAgreementReviewed ? 100 : 30;
  const nonSolicitVal = data.nonSolicitNonCompeteConcerns ? 20 : 100;

  let legalVal = 0;
  if (data.legalReviewStatus === "Completed") legalVal = 100;
  else if (data.legalReviewStatus === "Pending") legalVal = 50;

  const complianceProtocolScore = (protocolVal + agreementVal + nonSolicitVal + legalVal) / 4;

  const communicationScore = Math.min(10, Math.max(1, data.communicationPlanScore)) * 10;

  const overallReadinessScore = (
    clientDataScore * 0.20 +
    kycDocumentationScore * 0.25 +
    transferComplexityScoreVal * 0.15 +
    operationalScore * 0.15 +
    complianceProtocolScore * 0.15 +
    communicationScore * 0.10
  );

  return {
    clientDataScore: Math.round(clientDataScore * 10) / 10,
    kycDocumentationScore: Math.round(kycDocumentationScore * 10) / 10,
    transferComplexityScoreVal: Math.round(transferComplexityScoreVal * 10) / 10,
    operationalScore: Math.round(operationalScore * 10) / 10,
    complianceProtocolScore: Math.round(complianceProtocolScore * 10) / 10,
    communicationScore: Math.round(communicationScore * 10) / 10,
    overallReadinessScore: Math.round(overallReadinessScore * 10) / 10,
  };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cts.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
  
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      name: 'CTS Admin',
      password: hashedPassword
    }
  });

  console.log(`Admin user seeded: ${user.email}`);

  // Mock Advisor 1: Sarah Jenkins / Jenkins Wealth Advisors
  const advisor1 = await prisma.advisor.create({
    data: {
      name: 'Sarah Jenkins',
      firmName: 'Jenkins Wealth Advisors',
      email: 'sarah.jenkins@jenkinswealth.com',
      phone: '555-0199',
      currentFirm: 'LPL Financial',
      currentCustodian: 'LPL',
      futureCustodian: 'Schwab',
      businessModel: 'RIA',
      protocolStatus: 'Yes',
      totalAum: 420.0,
      annualRevenue: 3400000,
      households: 280,
      accounts: 740,
      staffCount: 4,
      crm: 'Wealthbox',
      createdById: user.id
    }
  });

  const audit1Data = {
    // Client Data
    emailCompletenessPercent: 98,
    phoneCompletenessPercent: 95,
    addressCompletenessPercent: 99,
    householdingQualityScore: 9,
    duplicateRecordRiskScore: 2,
    clientNotesQualityScore: 8,

    // KYC
    kycUpdateFrequency: 'Annual',
    trustedContactCompletenessPercent: 92,
    beneficiaryReviewStatus: 'Complete',
    riskToleranceCurrentPercent: 95,
    investmentObjectiveCurrentPercent: 97,
    missingSignatureRiskScore: 1,
    documentStorageQualityScore: 9,

    // Transfer Complexity
    percentIraAccounts: 45,
    percentTrustAccounts: 12,
    percentEntityAccounts: 5,
    percentAnnuityAltAccounts: 8,
    directBusinessAmount: 250000,
    heldAwayAssetsNotes: 'Minimal held away assets, small amount of direct mutual funds.',
    transferComplexityScore: 3,

    // Operational
    staffCapacityScore: 8,
    crmExportQualityScore: 9,
    taskManagementScore: 8,
    digitalSignatureReadinessScore: 9,
    communicationPlanScore: 8,

    // Compliance
    employmentAgreementReviewed: true,
    nonSolicitNonCompeteConcerns: false,
    legalReviewStatus: 'Completed',
    complianceRiskNotes: 'Employment agreement reviewed by external transition counsel. No active non-solicit flags.'
  };

  const scores1 = calculateReadinessScores({
    ...audit1Data,
    protocolStatus: advisor1.protocolStatus
  });

  await prisma.assessment.create({
    data: {
      advisorId: advisor1.id,
      notes: `
[Assessment Evidence]
Primary Source: CRM Export
Confidence: High
Reviewer: CTS Admin
Date: 2026-07-08
Notes: Seeding data
Documents: Seeding docs

[Advisor Profile]
Primary Contact: Sarah Jenkins
Title: Managing Partner
Email: sarah.jenkins@jenkinswealth.com
Mobile Phone: 555-0199
EA Name: Jane EA
EA Email: jane@jenkinswealth.com
EA Phone: 555-0200
Team Members: Mark Johnson, Emily Smith
Current Affiliation: Independent RIA
Years In Business: 15
Years At Current Firm: 8
Timeline: 3-6 Months
Reason: Scaling operations and changing custodian relationships.

[Assessment Status]
Stage: Discovery Complete
Owner: CTS Admin
Priority: Normal
Expected Completion Date: 2026-08-08
Tags: RIA, Protocol, High Priority
Internal Notes: Solid practice. Ready to transition.

[General Notes]
Well-structured team. High cleanliness of CRM data. Primary concern is moving 15 trust accounts with complex legal structures.
`.trim(),
      ...audit1Data,
      ...scores1,
      createdByUserId: user.id
    }
  });

  // Mock Advisor 2: Robert Chen
  const advisor2 = await prisma.advisor.create({
    data: {
      name: 'Robert Chen',
      firmName: 'Chen & Partners',
      email: 'robert@chenpartners.com',
      phone: '555-8822',
      currentFirm: 'Ameriprise',
      currentCustodian: 'Ameriprise',
      futureCustodian: 'Fidelity',
      businessModel: 'Hybrid',
      protocolStatus: 'No',
      totalAum: 185.0,
      annualRevenue: 1500000,
      households: 190,
      accounts: 520,
      staffCount: 2,
      crm: 'Salesforce',
      createdById: user.id
    }
  });

  const audit2Data = {
    // Client Data
    emailCompletenessPercent: 82,
    phoneCompletenessPercent: 78,
    addressCompletenessPercent: 85,
    householdingQualityScore: 6,
    duplicateRecordRiskScore: 5,
    clientNotesQualityScore: 6,

    // KYC
    kycUpdateFrequency: 'Triennial',
    trustedContactCompletenessPercent: 65,
    beneficiaryReviewStatus: 'Incomplete',
    riskToleranceCurrentPercent: 70,
    investmentObjectiveCurrentPercent: 75,
    missingSignatureRiskScore: 4,
    documentStorageQualityScore: 6,

    // Transfer Complexity
    percentIraAccounts: 55,
    percentTrustAccounts: 20,
    percentEntityAccounts: 8,
    percentAnnuityAltAccounts: 18,
    directBusinessAmount: 1200000,
    heldAwayAssetsNotes: 'Significant direct-to-fund annuities that must be re-registered or moved.',
    transferComplexityScore: 6,

    // Operational
    staffCapacityScore: 5,
    crmExportQualityScore: 6,
    taskManagementScore: 6,
    digitalSignatureReadinessScore: 7,
    communicationPlanScore: 5,

    // Compliance
    employmentAgreementReviewed: true,
    nonSolicitNonCompeteConcerns: true,
    legalReviewStatus: 'Pending',
    complianceRiskNotes: 'Broker-dealer is non-protocol. Legal review is in progress to draft non-solicit communications framework.'
  };

  const scores2 = calculateReadinessScores({
    ...audit2Data,
    protocolStatus: advisor2.protocolStatus
  });

  await prisma.assessment.create({
    data: {
      advisorId: advisor2.id,
      notes: `
[Assessment Evidence]
Primary Source: CRM Export
Confidence: Medium
Reviewer: CTS Admin
Date: 2026-07-08
Notes: Seeding data

[Advisor Profile]
Primary Contact: Robert Chen
Title: Founder
Email: robert@chenpartners.com
Mobile Phone: 555-8822
EA Name: None
EA Email: 
EA Phone: 
Team Members: 
Current Affiliation: Hybrid RIA
Years In Business: 12
Years At Current Firm: 6
Timeline: 6-12 Months
Reason: Moving to fee-only models.

[Assessment Status]
Stage: Assessment In Progress
Owner: CTS Admin
Priority: High
Expected Completion Date: 2026-09-08
Tags: Hybrid, Non-Protocol
Internal Notes: Legal compliance is key.

[General Notes]
Ameriprise transition requires careful legal protocol compliance. Salesforce contains duplicate entries that need merging before migration.
`.trim(),
      ...audit2Data,
      ...scores2,
      createdByUserId: user.id
    }
  });

  // Mock Advisor 3: James O'Connor
  const advisor3 = await prisma.advisor.create({
    data: {
      name: 'James O\'Connor',
      firmName: 'O\'Connor Capital Group',
      email: 'j.oconnor@oconnorcap.com',
      phone: '555-0911',
      currentFirm: 'Wells Fargo Advisors',
      currentCustodian: 'Wells Fargo',
      futureCustodian: 'LPL',
      businessModel: 'Broker Dealer',
      protocolStatus: 'Unsure',
      totalAum: 95.0,
      annualRevenue: 780000,
      households: 110,
      accounts: 310,
      staffCount: 1,
      crm: 'Redtail',
      createdById: user.id
    }
  });

  const audit3Data = {
    // Client Data
    emailCompletenessPercent: 48,
    phoneCompletenessPercent: 60,
    addressCompletenessPercent: 55,
    householdingQualityScore: 3,
    duplicateRecordRiskScore: 8,
    clientNotesQualityScore: 3,

    // KYC
    kycUpdateFrequency: 'Ad-hoc',
    trustedContactCompletenessPercent: 30,
    beneficiaryReviewStatus: 'None',
    riskToleranceCurrentPercent: 45,
    investmentObjectiveCurrentPercent: 40,
    missingSignatureRiskScore: 7,
    documentStorageQualityScore: 4,

    // Transfer Complexity
    percentIraAccounts: 40,
    percentTrustAccounts: 15,
    percentEntityAccounts: 12,
    percentAnnuityAltAccounts: 32,
    directBusinessAmount: 4200000,
    heldAwayAssetsNotes: 'High volume of annuities, alternative investments, and private placements.',
    transferComplexityScore: 9,

    // Operational
    staffCapacityScore: 2,
    crmExportQualityScore: 3,
    taskManagementScore: 2,
    digitalSignatureReadinessScore: 3,
    communicationPlanScore: 2,

    // Compliance
    employmentAgreementReviewed: false,
    nonSolicitNonCompeteConcerns: true,
    legalReviewStatus: 'None',
    complianceRiskNotes: 'Has not yet reviewed current employment agreement or engaged counsel. Non-protocol firm. Highly concerned about non-compete clauses.'
  };

  const scores3 = calculateReadinessScores({
    ...audit3Data,
    protocolStatus: advisor3.protocolStatus
  });

  await prisma.assessment.create({
    data: {
      advisorId: advisor3.id,
      notes: `
[Assessment Evidence]
Primary Source: Advisor Interview
Confidence: Low
Reviewer: CTS Admin
Date: 2026-07-08

[Advisor Profile]
Primary Contact: James O'Connor
Title: Owner
Email: j.oconnor@oconnorcap.com
Mobile Phone: 555-0911
EA Name: None
EA Email: 
EA Phone: 
Team Members: 
Current Affiliation: Wirehouse
Years In Business: 22
Years At Current Firm: 11
Timeline: Unknown
Reason: Seeking independence.

[Assessment Status]
Stage: Waiting on Advisor
Owner: CTS Admin
Priority: Urgent
Expected Completion Date: 2026-07-30
Tags: Wirehouse, Non-Protocol, Complex Trusts
Internal Notes: High risk profile.

[General Notes]
Sole practitioner with very limited staff capacity. CRM is highly unorganized. Massive compliance concerns and missing documents.
`.trim(),
      ...audit3Data,
      ...scores3,
      createdByUserId: user.id
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
