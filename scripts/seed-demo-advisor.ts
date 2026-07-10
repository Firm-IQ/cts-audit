import { PrismaClient } from '@prisma/client';
import { calculateReadinessScores } from '../lib/scoring';
import { runEvaluationPipeline } from '../lib/evaluation-pipeline';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting synthetic demonstration advisor seeding...');

  // 1. Delete existing advisor to maintain idempotency
  const existingAdvisor = await prisma.advisor.findFirst({
    where: { name: 'Michael Bennett', firmName: 'Bennett Wealth Partners' }
  });

  if (existingAdvisor) {
    console.log('Found existing advisor "Michael Bennett". Deleting to ensure idempotency...');
    await prisma.advisor.delete({
      where: { id: existingAdvisor.id }
    });
  }

  // 2. Resolve User
  const adminUser = await prisma.user.findFirst({
    where: { email: 'curt@gocontinuity.com' }
  });
  const createdById = adminUser ? adminUser.id : null;

  if (!createdById) {
    throw new Error('User curt@gocontinuity.com not found. Please run the standard seed first.');
  }

  // 3. Create Advisor Michael Bennett
  const advisor = await prisma.advisor.create({
    data: {
      name: 'Michael Bennett',
      firmName: 'Bennett Wealth Partners',
      businessModel: 'Independent RIA',
      currentCustodian: 'Fidelity',
      futureCustodian: 'Schwab',
      totalAum: 75.0, // $75,000,000
      annualRevenue: 825000, // $825,000
      households: 148,
      accounts: 350,
      staffCount: 3,
      crm: 'Redtail',
      createdById
    }
  });
  console.log(`Created Advisor: ${advisor.name} (${advisor.id})`);

  // 4. Load Requirements Library
  const activeRequirements = await prisma.requirementLibrary.findMany({
    where: { active: true }
  });

  console.log(`Loaded ${activeRequirements.length} active requirements.`);

  // 5. Define Households and Accounts
  // We need exactly 148 households and 350 accounts.
  // 5 Showcase Households (10 accounts)
  // 143 General Households (340 accounts)
  // Value sum must be exactly $75,000,000.

  // Showcase Households data definitions
  const showcaseHhDefs = [
    {
      name: 'Morgan Family Trust',
      aum: 2800000,
      accounts: [
        { name: 'Morgan Family Trust Account', type: 'Trust', val: 2000000 },
        { name: 'Morgan Family Individual Account', type: 'Individual Taxable', val: 800000 }
      ]
    },
    {
      name: 'Carter Household',
      aum: 950000,
      accounts: [
        { name: 'Carter Roth IRA Account', type: 'Roth IRA', val: 450000 },
        { name: 'Carter Individual Account', type: 'Individual Taxable', val: 500000 }
      ]
    },
    {
      name: 'Reynolds Household',
      aum: 1600000,
      accounts: [
        { name: 'Reynolds Traditional IRA Account', type: 'Traditional / Rollover IRA', val: 1000000 },
        { name: 'Reynolds Joint Account', type: 'Joint Taxable', val: 600000 }
      ]
    },
    {
      name: 'Patel Household',
      aum: 3400000,
      accounts: [
        { name: 'Patel Holdings LLC Account', type: 'Entity', val: 2400000 },
        { name: 'Patel Alternative Assets Account', type: 'Alternative Investment', val: 1000000 }
      ]
    },
    {
      name: 'Thompson Household',
      aum: 720000,
      accounts: [
        { name: 'Thompson Inherited IRA Account', type: 'Inherited IRA', val: 420000 },
        { name: 'Thompson Estate Account', type: 'Estate', val: 300000 }
      ]
    }
  ];

  const showcaseAumSum = showcaseHhDefs.reduce((sum, hh) => sum + hh.aum, 0);
  const remainingAum = 75000000 - showcaseAumSum; // Exactly $65,530,000

  // Mix breakdown for the remaining 340 accounts:
  // Individual Taxable: 112 total. Showcase has 2. Remainder: 110.
  // Joint Taxable: 48 total. Showcase has 1. Remainder: 47.
  // Traditional / Rollover IRA: 72 total. Showcase has 1. Remainder: 71.
  // Roth IRA: 34 total. Showcase has 1. Remainder: 33.
  // Inherited IRA: 12 total. Showcase has 1. Remainder: 11.
  // Trust: 28 total. Showcase has 1. Remainder: 27.
  // SEP / SIMPLE IRA: 8 total. Showcase has 0. Remainder: 8.
  // Entity: 7 total. Showcase has 1. Remainder: 6.
  // 529 / Education: 18 total. Showcase has 0. Remainder: 18.
  // Annuity: 6 total. Showcase has 0. Remainder: 6.
  // Alternative Investment: 3 total. Showcase has 1. Remainder: 2.
  // Estate: 2 total. Showcase has 1. Remainder: 1.
  const remainingAccountTypes: string[] = [];
  const addTypes = (type: string, count: number) => {
    for (let i = 0; i < count; i++) {
      remainingAccountTypes.push(type);
    }
  };
  addTypes('Individual Taxable', 110);
  addTypes('Joint Taxable', 47);
  addTypes('Traditional / Rollover IRA', 71);
  addTypes('Roth IRA', 33);
  addTypes('Inherited IRA', 11);
  addTypes('Trust', 27);
  addTypes('SEP / SIMPLE IRA', 8);
  addTypes('Entity', 6);
  addTypes('529 / Education', 18);
  addTypes('Annuity', 6);
  addTypes('Alternative Investment', 2);
  addTypes('Estate', 1);

  // Generate 143 general households names
  const firstNames = ['John', 'Mary', 'Robert', 'Patricia', 'James', 'Jennifer', 'David', 'Linda', 'Thomas', 'Barbara', 'Joseph', 'Susan', 'Charles', 'Jessica', 'Daniel', 'Sarah', 'Matthew', 'Karen', 'Christopher', 'Nancy'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

  const generatedHouseholds: { name: string; accountsCount: number }[] = [];
  for (let i = 0; i < 98; i++) {
    const name = `Gen ${lastNames[i % lastNames.length]} Household #${i + 1}`;
    generatedHouseholds.push({ name, accountsCount: 2 });
  }
  for (let i = 0; i < 42; i++) {
    const name = `Gen ${lastNames[(i + 98) % lastNames.length]} Family #${i + 1}`;
    generatedHouseholds.push({ name, accountsCount: 3 });
  }
  for (let i = 0; i < 3; i++) {
    const name = `Gen ${lastNames[(i + 140) % lastNames.length]} Group #${i + 1}`;
    generatedHouseholds.push({ name, accountsCount: 6 });
  }

  // Generate values for 340 accounts that sum up to exactly remainingAum ($65,530,000)
  const baseValue = Math.floor(remainingAum / 340);
  const accountValues: number[] = [];
  let sumValue = 0;
  for (let i = 0; i < 339; i++) {
    const val = baseValue + (i % 20 - 10) * 5000;
    accountValues.push(val);
    sumValue += val;
  }
  accountValues.push(remainingAum - sumValue); // Set last account to perfect balance

  // Create households and accounts records in DB
  const dbHouseholds = [];
  const dbAccounts: any[] = [];

  // Create Showcase households first
  for (const hhDef of showcaseHhDefs) {
    const hh = await prisma.household.create({
      data: {
        advisorId: advisor.id,
        name: hhDef.name,
        primaryClientName: hhDef.name.split(' ')[0],
        totalAum: hhDef.aum / 1000000,
        revenue: hhDef.aum * 0.0075,
        email: `${hhDef.name.toLowerCase().replace(/ /g, '')}@example.com`,
        phone: '555-0100',
        address: '123 Main St, Phoenix, AZ',
        readinessStatus: 'Not Reviewed'
      }
    });

    dbHouseholds.push(hh);

    for (const accDef of hhDef.accounts) {
      const acc = await prisma.account.create({
        data: {
          householdId: hh.id,
          name: accDef.name,
          type: accDef.type,
          value: accDef.val,
          custodian: 'Fidelity',
          registration: accDef.type,
          readinessStatus: 'Not Reviewed'
        }
      });
      dbAccounts.push(acc);
    }
  }

  // Create General households next
  let accIndex = 0;
  for (let i = 0; i < generatedHouseholds.length; i++) {
    const hhDef = generatedHouseholds[i];
    const hhAum = accountValues.slice(accIndex, accIndex + hhDef.accountsCount).reduce((sum, val) => sum + val, 0);

    const email = i % 24 === 0 ? null : `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@example.com`;
    const phone = i % 24 === 0 ? null : `555-0${100 + i}`;
    const address = i % 24 === 0 ? null : `${100 + i} Desert Road, Phoenix, AZ`;

    const hh = await prisma.household.create({
      data: {
        advisorId: advisor.id,
        name: hhDef.name,
        primaryClientName: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
        totalAum: hhAum / 1000000,
        revenue: hhAum * 0.0075,
        email,
        phone,
        address,
        readinessStatus: 'Not Reviewed'
      }
    });

    dbHouseholds.push(hh);

    for (let a = 0; a < hhDef.accountsCount; a++) {
      const accType = remainingAccountTypes[accIndex];
      const accVal = accountValues[accIndex];

      const acc = await prisma.account.create({
        data: {
          householdId: hh.id,
          name: `${hh.primaryClientName}'s ${accType}`,
          type: accType,
          value: accVal,
          custodian: 'Fidelity',
          registration: accType,
          readinessStatus: 'Not Reviewed'
        }
      });
      dbAccounts.push(acc);
      accIndex++;
    }
  }

  console.log(`Generated exactly ${dbHouseholds.length} households and ${dbAccounts.length} accounts.`);

  // 6. Generate Requirement Checklist
  console.log('Generating checklists for accounts...');
  const checklistItemsData: any[] = [];

  for (const acc of dbAccounts) {
    const applicableReqs = activeRequirements.filter(req => {
      const isAll = req.appliesToAccountTypes.toLowerCase() === 'all';
      const appliesList = req.appliesToAccountTypes.split(',').map(s => s.trim().toLowerCase());
      return isAll || appliesList.includes(acc.type.toLowerCase());
    });

    for (const req of activeRequirements) {
      const isApplicable = applicableReqs.some(ar => ar.id === req.id);
      checklistItemsData.push({
        accountId: acc.id,
        itemKey: req.id,
        itemName: req.name,
        status: isApplicable ? 'Present' : 'Not Applicable',
        notes: '',
        verifiedBy: 'System Auto-Seed',
        verifiedDate: '2026-07-09',
        requirementId: req.id
      });
    }
  }

  await prisma.accountChecklistItem.createMany({
    data: checklistItemsData
  });

  console.log(`Inserted ${checklistItemsData.length} checklist items.`);

  const allChecklistItems = await prisma.accountChecklistItem.findMany({
    where: {
      account: {
        household: {
          advisorId: advisor.id
        }
      }
    },
    include: {
      account: true
    }
  });

  // 7. Inject Specified realistic issues into the checklists
  console.log('Injecting realistic issues...');

  const reqTrustedContact = activeRequirements.find(r => r.name === 'Trusted Contact')?.id || '';
  const reqBeneficiary = activeRequirements.find(r => r.name === 'Beneficiary Review')?.id || '';
  const reqVoidedCheck = activeRequirements.find(r => r.name === 'Voided Check / Bank Verification')?.id || '';
  const reqTrustCertification = activeRequirements.find(r => r.name === 'Trust Certification')?.id || '';
  const reqTrusteePages = activeRequirements.find(r => r.name === 'Trustee Pages')?.id || '';
  const reqSuccessorTrustee = activeRequirements.find(r => r.name === 'Successor Trustee')?.id || '';
  const reqInheritedIraDoc = activeRequirements.find(r => r.name === 'Inherited IRA Documentation')?.id || '';
  const reqLastReview = activeRequirements.find(r => r.name === 'Last Review Current')?.id || '';
  const reqInvestmentObjectives = activeRequirements.find(r => r.name === 'Investment Objectives Current')?.id || '';
  const reqRiskTolerance = activeRequirements.find(r => r.name === 'Risk Tolerance Current')?.id || '';
  const reqResolution = activeRequirements.find(r => r.name === 'Corporate Resolution')?.id || '';
  const reqTransferRestrictions = activeRequirements.find(r => r.name === 'Transfer Restrictions Reviewed')?.id || '';
  const reqEmailCurrent = activeRequirements.find(r => r.name === 'Email Current')?.id || '';
  const reqPhoneCurrent = activeRequirements.find(r => r.name === 'Phone Current')?.id || '';
  const reqAlts = activeRequirements.find(r => r.name === 'Alternative Investments')?.id || '';
  const reqAnnuities = activeRequirements.find(r => r.name === 'Annuities')?.id || '';
  const reqAdvisoryAgreement = activeRequirements.find(r => r.name === 'Advisory Agreement')?.id || '';
  const reqRmdStatus = activeRequirements.find(r => r.name === 'RMD Status')?.id || '';
  const reqDeathCertificate = activeRequirements.find(r => r.name === 'Death Certificate')?.id || '';

  const updateQueue: { id: string; status: string; notes?: string }[] = [];

  // Issue 1: 24 households without a confirmed trusted contact
  const tcHhs = dbHouseholds.filter(h => h.name === 'Carter Household' || !showcaseHhDefs.some(sh => sh.name === h.name)).slice(0, 24);
  const tcHhIds = new Set(tcHhs.map(h => h.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqTrustedContact && tcHhIds.has(item.account.householdId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'No trusted contact person on file.' });
    }
  });

  // Issue 2: 17 retirement accounts with beneficiary information needing review
  const retAccounts = dbAccounts.filter(a => a.type.toLowerCase().includes('ira') || a.type.toLowerCase().includes('401(k)'));
  const carterRothIra = dbAccounts.find(a => a.name.includes('Carter Roth IRA'));
  const benAccs = [carterRothIra, ...retAccounts.filter(a => a.id !== carterRothIra?.id)].slice(0, 17);
  const benAccIds = new Set(benAccs.filter(Boolean).map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqBeneficiary && benAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Beneficiary designation requires verification or signature.' });
    }
  });

  // Issue 3: 11 accounts with ACH authorization but no current voided check or bank verification
  const reynoldsIra = dbAccounts.find(a => a.name.includes('Reynolds Traditional IRA'));
  const achAccs = [reynoldsIra, ...dbAccounts.filter(a => a.id !== reynoldsIra?.id)].slice(0, 11);
  const achAccIds = new Set(achAccs.filter(Boolean).map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqVoidedCheck && achAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'ACH setup requires voided check or bank letter verification.' });
    }
  });

  // Issue 4: 8 trust accounts missing one or more current trust documents
  const trustAccounts = dbAccounts.filter(a => a.type === 'Trust');
  const morganTrustAcc = dbAccounts.find(a => a.name.includes('Morgan Family Trust Account'));
  const docTrustAccs = trustAccounts.filter(a => a.id !== morganTrustAcc?.id).slice(0, 7);
  const docTrustIds = new Set(docTrustAccs.map(a => a.id));

  allChecklistItems.forEach(item => {
    if (item.accountId === morganTrustAcc?.id && item.requirementId === reqSuccessorTrustee && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Successor trustee page or designation is missing.' });
    }
    if (docTrustIds.has(item.accountId) && item.requirementId === reqTrustCertification && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Complete Certification of Trust missing from folder.' });
    }
  });

  // Issue 5: 4 inherited IRAs with incomplete inherited-account documentation
  const inhAccounts = dbAccounts.filter(a => a.type === 'Inherited IRA');
  const thompsonInh = dbAccounts.find(a => a.name.includes('Thompson Inherited IRA'));
  const inhAccs = [thompsonInh, ...inhAccounts.filter(a => a.id !== thompsonInh?.id)].slice(0, 4);
  const inhAccIds = new Set(inhAccs.filter(Boolean).map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqInheritedIraDoc && inhAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Incomplete inherited adoption or original owner documentation.' });
    }
  });

  // Issue 6: 9 households with outdated KYC information
  const kycHhs = dbHouseholds.filter(h => h.name === 'Reynolds Household' || !showcaseHhDefs.some(sh => sh.name === h.name)).slice(0, 9);
  const kycHhIds = new Set(kycHhs.map(h => h.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqLastReview && kycHhIds.has(item.account.householdId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'KYC last review date was more than 24 months ago.' });
    }
  });

  // Issue 7: 6 accounts with stale or unclear investment objectives
  const objectivesAccs = dbAccounts.slice(50, 56);
  const objAccIds = new Set(objectivesAccs.map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqInvestmentObjectives && objAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Stale risk profile or mismatch between holding asset allocation.' });
    }
  });

  // Issue 8: 5 entity accounts missing updated authority or beneficial ownership documentation
  const entAccounts = dbAccounts.filter(a => a.type === 'Entity');
  const patelEntity = dbAccounts.find(a => a.name.includes('Patel Holdings LLC'));
  const entAccs = [patelEntity, ...entAccounts.filter(a => a.id !== patelEntity?.id)].slice(0, 5);
  const entAccIds = new Set(entAccs.filter(Boolean).map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqResolution && entAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Corporate resolution or entity beneficial ownership registry missing or outdated.' });
    }
  });

  // Issue 9: 7 accounts with unresolved transfer restrictions or non-ACAT considerations
  const transferAccs = dbAccounts.slice(120, 127);
  const transAccIds = new Set(transferAccs.map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqTransferRestrictions && transAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Requires manual sponsor review or proprietary holding verification.' });
    }
  });

  // Issue 10: 6 households with incomplete or outdated contact information
  const contactHhs = dbHouseholds.filter(h => !showcaseHhDefs.some(sh => sh.name === h.name)).slice(40, 46);
  const contactHhIds = new Set(contactHhs.map(h => h.id));
  allChecklistItems.forEach(item => {
    if ((item.requirementId === reqPhoneCurrent || item.requirementId === reqEmailCurrent) && contactHhIds.has(item.account.householdId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Contact detail mismatch with current CRM master records.' });
    }
  });

  // Issue 11: 3 alternative investments requiring sponsor transfer review
  const altAccounts = dbAccounts.filter(a => a.type === 'Alternative Investment');
  const patelAlt = dbAccounts.find(a => a.name.includes('Patel Alternative Assets'));
  const altAccs = [patelAlt, ...altAccounts.filter(a => a.id !== patelAlt?.id)].slice(0, 3);
  const altAccIds = new Set(altAccs.filter(Boolean).map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqAlts && altAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Private placement sponsor transfer or assignment review required.' });
    }
  });

  // Issue 12: 4 annuities requiring contract or surrender review
  const annAccounts = dbAccounts.filter(a => a.type === 'Annuity').slice(0, 4);
  const annAccIds = new Set(annAccounts.map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqAnnuities && annAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Variable/fixed annuity contract copy or surrender fee review required.' });
    }
  });

  // Issue 13: 8 advisory agreements requiring confirmation or updated signature
  const advAccs = dbAccounts.slice(200, 208);
  const advAccIds = new Set(advAccs.map(a => a.id));
  allChecklistItems.forEach(item => {
    if (item.requirementId === reqAdvisoryAgreement && advAccIds.has(item.accountId) && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Missing', notes: 'Investment advisory agreement signature is incomplete or outdated.' });
    }
  });

  // Thompson specific showcases
  const thompsonEstate = dbAccounts.find(a => a.name.includes('Thompson Estate'));
  allChecklistItems.forEach(item => {
    if (item.accountId === thompsonEstate?.id && item.requirementId === reqDeathCertificate && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Present', notes: 'Death certificate copy uploaded and verified.' });
    }
    if (item.accountId === thompsonInh?.id && item.requirementId === reqRmdStatus && item.status !== 'Not Applicable') {
      updateQueue.push({ id: item.id, status: 'Needs Review', notes: 'Inherited IRA RMD schedule requires client confirmation.' });
    }
  });

  console.log(`Executing ${updateQueue.length} checklist status modifications...`);
  for (const up of updateQueue) {
    await prisma.accountChecklistItem.update({
      where: { id: up.id },
      data: {
        status: up.status,
        notes: up.notes || ''
      }
    });
  }

  // 8. Create the Assessment record
  const assessmentNotes = `[Assessment Status]
Stage: In Progress
Owner: CTS Consultant
Priority: High
Tags: Demo, Seeding

[General Notes]
Synthetic demonstration data for Michael Bennett (Bennett Wealth Partners) containing exactly 148 households and 350 accounts. Seeding completed successfully.`;

  const assessment = await prisma.assessment.create({
    data: {
      advisorId: advisor.id,
      notes: assessmentNotes,
      createdByUserId: createdById,
      emailCompletenessPercent: 0,
      phoneCompletenessPercent: 0,
      addressCompletenessPercent: 0,
      householdingQualityScore: 10,
      duplicateRecordRiskScore: 10,
      clientNotesQualityScore: 9,
      kycUpdateFrequency: 'Triennial',
      trustedContactCompletenessPercent: 0,
      beneficiaryReviewStatus: 'Incomplete',
      riskToleranceCurrentPercent: 0,
      investmentObjectiveCurrentPercent: 0,
      missingSignatureRiskScore: 1,
      documentStorageQualityScore: 8,
      percentIraAccounts: (126 / 350) * 100,
      percentTrustAccounts: (28 / 350) * 100,
      percentEntityAccounts: (7 / 350) * 100,
      percentAnnuityAltAccounts: (9 / 350) * 100,
      directBusinessAmount: 0,
      transferComplexityScore: 2,
      staffCapacityScore: 8,
      crmExportQualityScore: 9,
      taskManagementScore: 8,
      digitalSignatureReadinessScore: 9,
      communicationPlanScore: 8,
      employmentAgreementReviewed: true,
      nonSolicitNonCompeteConcerns: false,
      legalReviewStatus: 'Completed',
      overallReadinessScore: 0,
      clientDataScore: 0,
      kycDocumentationScore: 0,
      transferComplexityScoreVal: 0,
      operationalScore: 0,
      complianceProtocolScore: 0,
      communicationScore: 0,
      currentPhase: 'Initial Review',
      lastUpdatedBy: 'System Auto-Seed'
    }
  });

  // 9. Run evaluation pipeline to generate checklists, findings, and compute scores
  await runEvaluationPipeline(advisor.id, 'System Auto-Seed');

  // Load calculated assessment and counts for summary output
  const updatedAssessment = await prisma.assessment.findFirst({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: 'desc' }
  });

  const totalHhCount = dbHouseholds.length;
  const totalAccCount = dbAccounts.length;

  const readyHhsCount = await prisma.household.count({ where: { advisorId: advisor.id, readinessStatus: 'Ready' } });
  const cleanupHhsCount = await prisma.household.count({ where: { advisorId: advisor.id, readinessStatus: { in: ['Minor Cleanup', 'Significant Cleanup'] } } });
  const notReadyHhsCount = await prisma.household.count({ where: { advisorId: advisor.id, readinessStatus: 'Not Ready' } });

  const readyAccsCount = await prisma.account.count({ where: { household: { advisorId: advisor.id }, readinessStatus: 'Ready' } });
  const packetCompletionPercent = totalAccCount > 0 ? Math.round((readyAccsCount / totalAccCount) * 1000) / 10 : 0;

  const criticalCount = await prisma.finding.count({ where: { assessmentId: updatedAssessment?.id, severity: 'Critical' } });
  const highCount = await prisma.finding.count({ where: { assessmentId: updatedAssessment?.id, severity: 'High' } });
  const moderateCount = await prisma.finding.count({ where: { assessmentId: updatedAssessment?.id, severity: 'Moderate' } });
  const lowCount = await prisma.finding.count({ where: { assessmentId: updatedAssessment?.id, severity: 'Low' } });

  console.log('\n====================================================');
  console.log('SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');
  console.log(`Advisor Name:     ${advisor.name}`);
  console.log(`Firm Name:        ${advisor.firmName}`);
  console.log(`Total Households: ${totalHhCount}`);
  console.log(`Total Accounts:   ${totalAccCount}`);
  console.log(`Total AUM:        $${(await prisma.household.aggregate({ where: { advisorId: advisor.id }, _sum: { totalAum: true } }))._sum.totalAum?.toLocaleString()} USD\n`);
  console.log('====================================================');
  console.log('CALCULATED READINESS ENGINE METRICS');
  console.log('====================================================');
  console.log(`Know Your Book™ Index:                  ${updatedAssessment?.overallReadinessScore}%`);
  console.log(`- Client Data Category Score:            ${updatedAssessment?.clientDataScore}%`);
  console.log(`- KYC & Documentation Category Score:    ${updatedAssessment?.kycDocumentationScore}%`);
  console.log(`- Transfer Complexity Category Score:    ${updatedAssessment?.transferComplexityScoreVal}%`);
  console.log(`- Operational Category Score:            ${updatedAssessment?.operationalScore}%`);
  console.log(`- Compliance & Protocol Category Score:   ${updatedAssessment?.complianceProtocolScore}%`);
  console.log(`- Client Communication Category Score:   ${updatedAssessment?.communicationScore}%\n`);
  
  console.log('HOUSEHOLD READINESS BREAKDOWN');
  console.log(`- Transition Ready:    ${readyHhsCount} households`);
  console.log(`- Needs Cleanup:       ${cleanupHhsCount} households`);
  console.log(`- Not Ready:           ${notReadyHhsCount} households\n`);

  console.log('ACCOUNT PACKET COMPLETION');
  console.log(`- Fully Complete:      ${readyAccsCount} / ${totalAccCount} accounts (${packetCompletionPercent}%)\n`);

  console.log('SHOWCASE HOUSEHOLD METRICS');
  const showcases = await prisma.household.findMany({
    where: { advisorId: advisor.id, name: { in: ['Morgan Family Trust', 'Carter Household', 'Reynolds Household', 'Patel Household', 'Thompson Household'] } }
  });
  showcases.forEach(s => {
    console.log(`- ${s.name}: AUM = $${s.totalAum?.toLocaleString()} | Status = ${s.readinessStatus}`);
  });

  console.log('\nGENERATED FINDINGS COUNT BY SEVERITY');
  console.log(`- Critical:            ${criticalCount}`);
  console.log(`- High:                ${highCount}`);
  console.log(`- Moderate:            ${moderateCount}`);
  console.log(`- Low:                 ${lowCount}`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
