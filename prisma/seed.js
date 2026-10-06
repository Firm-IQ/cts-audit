const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const checklistItems = [
  // CLIENT INFORMATION
  { key: 'client_addressCurrent', name: 'Address Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 1 },
  { key: 'client_emailCurrent', name: 'Email Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 2 },
  { key: 'client_phoneCurrent', name: 'Phone Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 3 },
  { key: 'client_trustedContact', name: 'Trusted Contact', category: 'Client Information', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 4 },
  { key: 'client_relationshipsVerified', name: 'Household Relationships Verified', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 5 },
  // KYC
  { key: 'kyc_riskTolerance', name: 'Risk Tolerance Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 6 },
  { key: 'kyc_investmentObjectives', name: 'Investment Objectives Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 7 },
  { key: 'kyc_timeHorizon', name: 'Time Horizon', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 8 },
  { key: 'kyc_liquidityNeeds', name: 'Liquidity Needs', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 9 },
  { key: 'kyc_incomeNetWorth', name: 'Income / Net Worth Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 10 },
  { key: 'kyc_lastReview', name: 'Last Review Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 11 },
  // BANKING
  { key: 'banking_achAuthorization', name: 'ACH Authorization', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 12, documentTypeName: 'ACH Authorization' },
  { key: 'banking_voidedCheck', name: 'Voided Check / Bank Verification', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 13, documentTypeName: 'Voided Check' },
  { key: 'banking_standingInstructions', name: 'Standing Instructions', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 14 },
  // ACCOUNT DOCUMENTS
  { key: 'doc_advisoryAgreement', name: 'Advisory Agreement', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 15 },
  { key: 'doc_accountApplication', name: 'Account Application', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 16 },
  { key: 'doc_beneficiaryDesignation', name: 'Beneficiary Designation', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 17, documentTypeName: 'Beneficiary Designation' },
  { key: 'doc_transferRestrictions', name: 'Transfer Restrictions Reviewed', category: 'Account Documents', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 18 },
  // TRUST ACCOUNTS
  { key: 'trust_certification', name: 'Trust Certification', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 19, documentTypeName: 'Trust Certification' },
  { key: 'trust_trusteePages', name: 'Trustee Pages', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 20 },
  { key: 'trust_successorTrustee', name: 'Successor Trustee', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: false, critical: false, displayOrder: 21 },
  { key: 'trust_taxId', name: 'Tax ID Verified', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 22 },
  // ENTITY ACCOUNTS
  { key: 'entity_articles', name: 'Articles', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 23 },
  { key: 'entity_operatingAgreement', name: 'Operating Agreement', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 24, documentTypeName: 'Operating Agreement' },
  { key: 'entity_ein', name: 'EIN', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 25 },
  { key: 'entity_resolution', name: 'Corporate Resolution', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 26, documentTypeName: 'Corporate Resolution' },
  { key: 'entity_signers', name: 'Authorized Signers', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 27 },
  // ESTATE ACCOUNTS
  { key: 'estate_deathCertificate', name: 'Death Certificate', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 28, documentTypeName: 'Death Certificate' },
  { key: 'estate_letters', name: 'Letters Testamentary', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 29, documentTypeName: 'Letters Testamentary' },
  { key: 'estate_executor', name: 'Executor Documentation', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 30 },
  // POWERS
  { key: 'power_poa', name: 'Power of Attorney', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 31, documentTypeName: 'Power of Attorney' },
  { key: 'power_guardianship', name: 'Guardianship', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 32 },
  { key: 'power_conservatorship', name: 'Conservatorship', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 33 },
  // RETIREMENT
  { key: 'retire_ira', name: 'IRA Documentation', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA', required: true, critical: false, displayOrder: 34, documentTypeName: 'IRA Adoption Agreement' },
  { key: 'retire_inheritedIra', name: 'Inherited IRA Documentation', category: 'Retirement', appliesToAccountTypes: 'Inherited IRA', required: true, critical: false, displayOrder: 35, documentTypeName: 'Inherited IRA Documentation' },
  { key: 'retire_beneficiary', name: 'Beneficiary Review', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA,401(k)', required: true, critical: false, displayOrder: 36 },
  { key: 'retire_rmd', name: 'RMD Status', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA,401(k)', required: false, critical: false, displayOrder: 37 },
  // SPECIAL HOLDINGS
  { key: 'special_annuities', name: 'Annuities', category: 'Special Holdings', appliesToAccountTypes: 'Annuity', required: false, critical: false, displayOrder: 38 },
  { key: 'special_alts', name: 'Alternative Investments', category: 'Special Holdings', appliesToAccountTypes: 'Alternative Investment', required: false, critical: false, displayOrder: 39 },
  { key: 'special_directBusiness', name: 'Direct Business', category: 'Special Holdings', appliesToAccountTypes: 'Direct Business', required: false, critical: false, displayOrder: 40 },
  { key: 'special_restrictedAssets', name: 'Restricted Assets', category: 'Special Holdings', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 41 },
];

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
  console.log('Seeding database...');

  // 1. Seed DocumentType
  console.log('Seeding DocumentTypes...');
  const docTypes = [
    { name: 'ACH Authorization', documentKey: 'doc_achAuthorization', category: 'Banking', description: 'ACH Transfer authorization form', typicalAccountTypes: 'All', critical: false, active: true, displayOrder: 1, notes: '' },
    { name: 'Voided Check', documentKey: 'doc_voidedCheck', category: 'Banking', description: 'Voided check or bank verification letter', typicalAccountTypes: 'All', critical: false, active: true, displayOrder: 2, notes: '' },
    { name: 'Trust Certification', documentKey: 'doc_trustCertification', category: 'Trust Accounts', description: 'Certification of Trust documentation', typicalAccountTypes: 'Trust', critical: false, active: true, displayOrder: 3, notes: '' },
    { name: 'Beneficiary Designation', documentKey: 'doc_beneficiaryDesignation', category: 'Account Documents', description: 'Beneficiary designation form', typicalAccountTypes: 'IRA, Roth IRA, Inherited IRA', critical: true, active: true, displayOrder: 4, notes: '' },
    { name: 'Power of Attorney', documentKey: 'doc_powerOfAttorney', category: 'Powers', description: 'Power of Attorney documentation', typicalAccountTypes: 'All', critical: false, active: true, displayOrder: 5, notes: '' },
    { name: 'Death Certificate', documentKey: 'doc_deathCertificate', category: 'Estate Accounts', description: 'Certified copy of death certificate', typicalAccountTypes: 'Estate, Inherited IRA', critical: false, active: true, displayOrder: 6, notes: '' },
    { name: 'Letters Testamentary', documentKey: 'doc_lettersTestamentary', category: 'Estate Accounts', description: 'Letters testamentary or court letters', typicalAccountTypes: 'Estate', critical: false, active: true, displayOrder: 7, notes: '' },
    { name: 'Operating Agreement', documentKey: 'doc_operatingAgreement', category: 'Entity Accounts', description: 'Operating agreement or bylaws', typicalAccountTypes: 'Entity', critical: false, active: true, displayOrder: 8, notes: '' },
    { name: 'Corporate Resolution', documentKey: 'doc_corporateResolution', category: 'Entity Accounts', description: 'Corporate authorizing resolution', typicalAccountTypes: 'Entity', critical: false, active: true, displayOrder: 9, notes: '' },
    { name: 'IRA Adoption Agreement', documentKey: 'doc_iraAdoptionAgreement', category: 'Retirement', description: 'IRA Adoption agreement form', typicalAccountTypes: 'IRA, Roth IRA, SEP IRA, SIMPLE IRA', critical: false, active: true, displayOrder: 10, notes: '' },
    { name: 'Inherited IRA Documentation', documentKey: 'doc_inheritedIraDocumentation', category: 'Retirement', description: 'Inherited IRA adopt/verification documents', typicalAccountTypes: 'Inherited IRA', critical: false, active: true, displayOrder: 11, notes: '' },
  ];

  const seededDocTypes = new Map();
  for (const doc of docTypes) {
    const dbDoc = await prisma.documentType.upsert({
      where: { name: doc.name },
      update: {
        documentKey: doc.documentKey,
        category: doc.category,
        description: doc.description,
        typicalAccountTypes: doc.typicalAccountTypes,
        critical: doc.critical,
        active: doc.active,
        notes: doc.notes,
        displayOrder: doc.displayOrder
      },
      create: doc
    });
    seededDocTypes.set(doc.name, dbDoc);
  }

  // 2. Seed AccountType
  console.log('Seeding AccountTypes...');
  const accountTypesList = [
    'Individual', 'Joint', 'Trust', 'IRA', 'Roth IRA', 'Inherited IRA', 'SEP IRA', 'SIMPLE IRA', '401(k)', '529', 'Estate', 'Entity', 'Annuity', 'Alternative Investment', 'Direct Business', 'Other'
  ];

  for (let idx = 0; idx < accountTypesList.length; idx++) {
    const typeName = accountTypesList[idx];
    await prisma.accountType.upsert({
      where: { name: typeName },
      update: { active: true, displayOrder: idx },
      create: { name: typeName, description: `${typeName} Account Type`, active: true, displayOrder: idx }
    });
  }

  // 3. Seed RequirementProfile: CTS Master Requirements
  console.log('Seeding RequirementProfile...');
  const masterProfile = await prisma.requirementProfile.upsert({
    where: { name: 'CTS Master Requirements' },
    update: {},
    create: {
      name: 'CTS Master Requirements',
      description: 'The master base audit profile mapping 41 standard requirements across client accounts.'
    }
  });

  // 4. Seed RequirementLibrary and ProfileRequirement assignments
  console.log('Seeding RequirementLibrary & profile requirements...');
  for (const item of checklistItems) {
    const docTypeConnect = [];
    if (item.documentTypeName && seededDocTypes.has(item.documentTypeName)) {
      const targetDoc = seededDocTypes.get(item.documentTypeName);
      docTypeConnect.push({ id: targetDoc.id });
    }

    const dbReq = await prisma.requirementLibrary.upsert({
      where: { id: item.key },
      update: {
        name: item.name,
        category: item.category,
        appliesToAccountTypes: item.appliesToAccountTypes,
        required: item.required,
        critical: item.critical,
        displayOrder: item.displayOrder,
        documentTypes: docTypeConnect.length > 0 ? { set: docTypeConnect } : undefined
      },
      create: {
        id: item.key,
        name: item.name,
        description: `${item.name} requirements.`,
        category: item.category,
        appliesToAccountTypes: item.appliesToAccountTypes,
        required: item.required,
        critical: item.critical,
        displayOrder: item.displayOrder,
        documentTypes: docTypeConnect.length > 0 ? { connect: docTypeConnect } : undefined
      }
    });

    await prisma.profileRequirement.upsert({
      where: {
        profileId_requirementId: {
          profileId: masterProfile.id,
          requirementId: dbReq.id
        }
      },
      update: {
        state: item.required ? 'Required' : 'Optional'
      },
      create: {
        profileId: masterProfile.id,
        requirementId: dbReq.id,
        state: item.required ? 'Required' : 'Optional'
      }
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: 'curt@gocontinuity.com' }
  });

  let user = existingUser;
  if (!existingUser) {
    user = await prisma.user.create({
      data: {
        email: 'curt@gocontinuity.com',
        firstName: 'Curt',
        lastName: 'Kloc',
        role: 'Super Admin',
        active: true,
        password: '', // Empty password to initialize on first login
        mustChangePassword: true,
      }
    });
    console.log(`Admin user created: ${user.email}`);
  } else {
    console.log(`Admin user already exists, not resetting credentials.`);
  }

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

  console.log('Seeding households and accounts...');

  const mockHouseholds = [
    {
      advisorId: advisor1.id,
      name: 'The Robinson Family',
      primaryClientName: 'Arthur Robinson',
      secondaryClientName: 'Martha Robinson',
      totalAum: 4.2,
      revenue: 35000,
      email: 'arthur.robinson@example.com',
      phone: '555-1200',
      address: '742 Evergreen Terrace, Springfield',
      assignedConsultant: 'Jane Doe',
      notes: 'Arthur is transitioning from an active corporate officer role. Keep eyes on their retirement distributions.',
      readinessStatus: 'Minor Cleanup',
      accounts: [
        {
          name: 'Arthur Robinson Rollover IRA',
          type: 'IRA',
          value: 1200000,
          custodian: 'LPL',
          registration: 'Traditional IRA',
          notes: 'Standard Rollover.',
          readinessStatus: 'Ready',
          checklistStatus: {
            client_addressCurrent: 'Present',
            client_emailCurrent: 'Present',
            client_phoneCurrent: 'Present',
            kyc_riskTolerance: 'Present',
            kyc_investmentObjectives: 'Present',
            kyc_timeHorizon: 'Present',
            doc_advisoryAgreement: 'Present',
            doc_accountApplication: 'Present',
            retire_ira: 'Present',
          }
        },
        {
          name: 'Robinson Joint Trust',
          type: 'Trust',
          value: 3000000,
          custodian: 'LPL',
          registration: 'Living Trust',
          notes: 'Trust documents need certification verification.',
          readinessStatus: 'Needs Review',
          checklistStatus: {
            client_addressCurrent: 'Present',
            client_emailCurrent: 'Present',
            client_phoneCurrent: 'Present',
            kyc_riskTolerance: 'Present',
            kyc_investmentObjectives: 'Present',
            doc_advisoryAgreement: 'Present',
            doc_accountApplication: 'Needs Review',
            trust_certification: 'Missing',
            trust_trusteePages: 'Needs Review',
          }
        }
      ]
    },
    {
      advisorId: advisor2.id,
      name: 'Dr. Evelyn Martinez',
      primaryClientName: 'Evelyn Martinez',
      secondaryClientName: null,
      totalAum: 1.8,
      revenue: 16000,
      email: 'e.martinez@healthmed.org',
      phone: '555-8912',
      address: '109 Medical Plaza, Boston, MA',
      assignedConsultant: 'John Smith',
      notes: 'Busy orthopedic surgeon. Hard to reach, email preferred.',
      readinessStatus: 'Significant Cleanup',
      accounts: [
        {
          name: 'Martinez Ortho LLC 401(k)',
          type: '401(k)',
          value: 1800000,
          custodian: 'Ameriprise',
          registration: 'Solo 401k',
          notes: 'LLC operating agreements are missing signers page.',
          readinessStatus: 'Missing Items',
          checklistStatus: {
            client_addressCurrent: 'Present',
            client_emailCurrent: 'Present',
            kyc_riskTolerance: 'Needs Review',
            doc_advisoryAgreement: 'Missing',
            entity_articles: 'Present',
            entity_operatingAgreement: 'Missing',
          }
        }
      ]
    },
    {
      advisorId: advisor3.id,
      name: 'Estate of Thomas Shelby',
      primaryClientName: 'Arthur Shelby',
      secondaryClientName: 'Ada Thorne',
      totalAum: 2.5,
      revenue: 22000,
      email: 'arthur@shelbyco.uk',
      phone: '555-0900',
      address: 'Watery Lane, Birmingham',
      assignedConsultant: 'Jane Doe',
      notes: 'Complex estate account. Letters testamentary are old.',
      readinessStatus: 'Not Ready',
      accounts: [
        {
          name: 'Thomas Shelby Estate Account',
          type: 'Estate',
          value: 2500000,
          custodian: 'Wells Fargo',
          registration: 'Estate Account',
          notes: 'Awaiting death certificate certified copy.',
          readinessStatus: 'Not Ready',
          checklistStatus: {
            client_addressCurrent: 'Present',
            estate_deathCertificate: 'Missing',
            estate_letters: 'Needs Review',
            estate_executor: 'Missing',
          }
        }
      ]
    }
  ];

  for (const hhData of mockHouseholds) {
    const household = await prisma.household.create({
      data: {
        advisorId: hhData.advisorId,
        name: hhData.name,
        primaryClientName: hhData.primaryClientName,
        secondaryClientName: hhData.secondaryClientName,
        totalAum: hhData.totalAum,
        revenue: hhData.revenue,
        email: hhData.email,
        phone: hhData.phone,
        address: hhData.address,
        assignedConsultant: hhData.assignedConsultant,
        notes: hhData.notes,
        readinessStatus: hhData.readinessStatus,
      }
    });

    for (const accData of hhData.accounts) {
      const account = await prisma.account.create({
        data: {
          householdId: household.id,
          name: accData.name,
          type: accData.type,
          value: accData.value,
          custodian: accData.custodian,
          registration: accData.registration,
          notes: accData.notes,
          readinessStatus: accData.readinessStatus,
        }
      });

      // Generate 41 checklist items
      for (const item of checklistItems) {
        const isAll = item.appliesToAccountTypes.toLowerCase() === 'all';
        const appliesList = item.appliesToAccountTypes.split(',').map(s => s.trim().toLowerCase());
        const isApplicable = isAll || appliesList.includes(accData.type.toLowerCase());

        let itemStatus = 'Not Applicable';
        if (isApplicable) {
          itemStatus = accData.checklistStatus[item.key] || 'Not Reviewed';
        }
        
        const checklistItem = await prisma.accountChecklistItem.create({
          data: {
            accountId: account.id,
            itemKey: item.key,
            itemName: item.name,
            status: itemStatus,
            notes: itemStatus !== 'Not Applicable' ? `${item.name} seeded state.` : '',
            verifiedBy: itemStatus === 'Present' ? 'CTS Auditor' : '',
            verifiedDate: itemStatus === 'Present' ? '2026-07-08' : '',
            requirementId: item.key,
          }
        });

        // If checklist item is Missing or Needs Review, auto-create a Finding!
        if (itemStatus === 'Missing' || itemStatus === 'Needs Review') {
          // Find latest assessment for this advisor
          const assessments = await prisma.assessment.findMany({
            where: { advisorId: hhData.advisorId },
            orderBy: { createdAt: 'desc' }
          });
          const assessmentId = assessments[0]?.id;
          
          if (assessmentId) {
            await prisma.finding.create({
              data: {
                assessmentId,
                category: 'Documentation',
                title: `${household.name} - ${account.name} - ${item.name}`,
                description: `Seeded finding: Checklist item "${item.name}" is marked as "${itemStatus}".`,
                severity: itemStatus === 'Missing' ? 'High' : 'Moderate',
                priority: itemStatus === 'Missing' ? 'High' : 'Normal',
                owner: 'Advisor',
                assignedTo: 'Advisor Staff',
                status: 'Open',
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                householdId: household.id,
                accountId: account.id,
                checklistItemId: checklistItem.id,
                evidenceSummary: 'Seeded finding.'
              }
            });
          }
        }
      }
    }
  }

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
