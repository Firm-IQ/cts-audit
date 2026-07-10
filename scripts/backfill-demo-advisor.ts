import { PrismaClient } from '@prisma/client';
import { runEvaluationPipeline } from '../lib/evaluation-pipeline';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DEMO ADVISOR BACKFILL ROUTINE ---');

  // 1. Find existing Michael Bennett advisor
  const advisor = await prisma.advisor.findFirst({
    where: { name: 'Michael Bennett' }
  });

  if (!advisor) {
    console.log('No advisor named "Michael Bennett" found. Skipping backfill.');
    return;
  }

  // Check if backfill has already been run
  const sampleChecked = await prisma.accountChecklistItem.findFirst({
    where: {
      account: { household: { advisorId: advisor.id } },
      status: { in: ['Verified', 'Inferred'] }
    }
  });

  if (sampleChecked) {
    console.log('Backfill already executed previously. Skipped.');
    return;
  }

  console.log(`Found advisor: ${advisor.name} (${advisor.id})`);

  // Load households and accounts to map issues
  const dbHouseholds = await prisma.household.findMany({
    where: { advisorId: advisor.id },
    orderBy: { name: 'asc' }
  });

  const dbAccounts = await prisma.account.findMany({
    where: { household: { advisorId: advisor.id } },
    orderBy: { name: 'asc' }
  });

  console.log(`Loading accounts to process... Total accounts: ${dbAccounts.length}`);

  // Fetch requirement definitions
  const activeRequirements = await prisma.requirementLibrary.findMany({
    where: { active: true }
  });

  const reqTrustedContact = activeRequirements.find(r => r.name === 'Trusted Contact')?.id || '';
  const reqBeneficiary = activeRequirements.find(r => r.name === 'Beneficiary Review')?.id || '';
  const reqVoidedCheck = activeRequirements.find(r => r.name === 'Voided Check / Bank Verification')?.id || '';
  const reqSuccessorTrustee = activeRequirements.find(r => r.name === 'Successor Trustee')?.id || '';
  const reqTrustCertification = activeRequirements.find(r => r.name === 'Trust Certification')?.id || '';
  const reqInheritedIraDoc = activeRequirements.find(r => r.name === 'Inherited IRA Documentation')?.id || '';
  const reqLastReview = activeRequirements.find(r => r.name === 'Last Review Current')?.id || '';
  const reqInvestmentObjectives = activeRequirements.find(r => r.name === 'Investment Objectives Current')?.id || '';

  const showcaseNames = ['Morgan Family Trust', 'Carter Household', 'Reynolds Household', 'Patel Household', 'Thompson Household'];

  console.log('Injecting / reinforcing seeded demo statuses for Missing and Needs Review items...');

  // Issue 1: 24 households without trusted contact
  const tcHhs = dbHouseholds.filter(h => h.name === 'Carter Household' || !showcaseNames.includes(h.name)).slice(0, 24);
  const tcHhIds = new Set(tcHhs.map(h => h.id));

  // Issue 2: 17 retirement accounts with beneficiary review needed
  const retAccounts = dbAccounts.filter(a => a.type.toLowerCase().includes('ira') || a.type.toLowerCase().includes('401(k)'));
  const carterRothIra = dbAccounts.find(a => a.name.includes('Carter Roth IRA'));
  const benAccs = [carterRothIra, ...retAccounts.filter(a => a.id !== carterRothIra?.id)].slice(0, 17);
  const benAccIds = new Set(benAccs.filter((a): a is NonNullable<typeof a> => !!a).map(a => a.id));

  // Issue 3: 11 accounts with ACH but no voided check
  const reynoldsIra = dbAccounts.find(a => a.name.includes('Reynolds Traditional IRA'));
  const achAccs = [reynoldsIra, ...dbAccounts.filter(a => a.id !== reynoldsIra?.id)].slice(0, 11);
  const achAccIds = new Set(achAccs.filter((a): a is NonNullable<typeof a> => !!a).map(a => a.id));

  // Issue 4: trust accounts missing SUCCESSOR pages or trust certificates
  const trustAccounts = dbAccounts.filter(a => a.type === 'Trust');
  const morganTrustAcc = dbAccounts.find(a => a.name.includes('Morgan Family Trust Account'));
  const docTrustAccs = trustAccounts.filter(a => a.id !== morganTrustAcc?.id).slice(0, 7);
  const docTrustIds = new Set(docTrustAccs.map(a => a.id));

  // Issue 5: 4 inherited IRAs missing documentation
  const inhAccounts = dbAccounts.filter(a => a.type === 'Inherited IRA');
  const thompsonInh = dbAccounts.find(a => a.name.includes('Thompson Inherited IRA'));
  const inhAccs = [thompsonInh, ...inhAccounts.filter(a => a.id !== thompsonInh?.id)].slice(0, 4);
  const inhAccIds = new Set(inhAccs.filter((a): a is NonNullable<typeof a> => !!a).map(a => a.id));

  // Issue 6: 9 households with outdated KYC review
  const kycHhs = dbHouseholds.filter(h => h.name === 'Reynolds Household' || !showcaseNames.includes(h.name)).slice(0, 9);
  const kycHhIds = new Set(kycHhs.map(h => h.id));

  // Issue 7: 6 accounts with stale objectives
  const objectivesAccs = dbAccounts.slice(50, 56);
  const objAccIds = new Set(objectivesAccs.map(a => a.id));

  // Upsert the specific demo issues
  for (const acc of dbAccounts) {
    // 1. Trusted Contact (Missing)
    if (reqTrustedContact && tcHhIds.has(acc.householdId)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqTrustedContact } },
        update: { status: 'Missing', notes: 'No trusted contact person on file.' },
        create: { accountId: acc.id, itemKey: reqTrustedContact, itemName: 'Trusted Contact', requirementId: reqTrustedContact, status: 'Missing', notes: 'No trusted contact person on file.' }
      });
    }

    // 2. Beneficiary Review (Needs Review)
    if (reqBeneficiary && benAccIds.has(acc.id)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqBeneficiary } },
        update: { status: 'Needs Review', notes: 'Beneficiary designation requires verification or signature.' },
        create: { accountId: acc.id, itemKey: reqBeneficiary, itemName: 'Beneficiary Review', requirementId: reqBeneficiary, status: 'Needs Review', notes: 'Beneficiary designation requires verification or signature.' }
      });
    }

    // 3. Voided Check / Bank Verification (Missing)
    if (reqVoidedCheck && achAccIds.has(acc.id)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqVoidedCheck } },
        update: { status: 'Missing', notes: 'ACH setup requires voided check or bank letter verification.' },
        create: { accountId: acc.id, itemKey: reqVoidedCheck, itemName: 'Voided Check / Bank Verification', requirementId: reqVoidedCheck, status: 'Missing', notes: 'ACH setup requires voided check or bank letter verification.' }
      });
    }

    // 4. Trust succession / certificates (Missing)
    if (acc.id === morganTrustAcc?.id && reqSuccessorTrustee) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqSuccessorTrustee } },
        update: { status: 'Missing', notes: 'Successor trustee page or designation is missing.' },
        create: { accountId: acc.id, itemKey: reqSuccessorTrustee, itemName: 'Successor Trustee', requirementId: reqSuccessorTrustee, status: 'Missing', notes: 'Successor trustee page or designation is missing.' }
      });
    }
    if (docTrustIds.has(acc.id) && reqTrustCertification) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqTrustCertification } },
        update: { status: 'Missing', notes: 'Complete Certification of Trust missing from folder.' },
        create: { accountId: acc.id, itemKey: reqTrustCertification, itemName: 'Trust Certification', requirementId: reqTrustCertification, status: 'Missing', notes: 'Complete Certification of Trust missing from folder.' }
      });
    }

    // 5. Inherited IRA documentation (Missing)
    if (reqInheritedIraDoc && inhAccIds.has(acc.id)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqInheritedIraDoc } },
        update: { status: 'Missing', notes: 'Incomplete inherited adoption or original owner documentation.' },
        create: { accountId: acc.id, itemKey: reqInheritedIraDoc, itemName: 'Inherited IRA Documentation', requirementId: reqInheritedIraDoc, status: 'Missing', notes: 'Incomplete inherited adoption or original owner documentation.' }
      });
    }

    // 6. Outdated KYC (Needs Review)
    if (reqLastReview && kycHhIds.has(acc.householdId)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqLastReview } },
        update: { status: 'Needs Review', notes: 'KYC last review date was more than 24 months ago.' },
        create: { accountId: acc.id, itemKey: reqLastReview, itemName: 'Last Review Current', requirementId: reqLastReview, status: 'Needs Review', notes: 'KYC last review date was more than 24 months ago.' }
      });
    }

    // 7. Stale Objectives (Needs Review)
    if (reqInvestmentObjectives && objAccIds.has(acc.id)) {
      await prisma.accountChecklistItem.upsert({
        where: { accountId_itemKey: { accountId: acc.id, itemKey: reqInvestmentObjectives } },
        update: { status: 'Needs Review', notes: 'Stale risk profile or mismatch between holding asset allocation.' },
        create: { accountId: acc.id, itemKey: reqInvestmentObjectives, itemName: 'Investment Objectives Current', requirementId: reqInvestmentObjectives, status: 'Needs Review', notes: 'Stale risk profile or mismatch between holding asset allocation.' }
      });
    }
  }

  // 2. Run the evaluation pipeline
  await runEvaluationPipeline(advisor.id, 'Render Deploy Backfill');

  // 3. Query final stats for reporting
  const checklistItemsCount = await prisma.accountChecklistItem.count({
    where: { account: { household: { advisorId: advisor.id } } }
  });
  
  const assessment = await prisma.assessment.findFirst({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: 'desc' }
  });

  const findingsCount = await prisma.finding.count({
    where: { assessmentId: assessment?.id }
  });

  console.log('\n--- BACKFILL COMPLETED SUCCESSFULLY ---');
  console.log(`- Accounts Processed:    ${dbAccounts.length}`);
  console.log(`- Checklist Items:       ${checklistItemsCount}`);
  console.log(`- Findings Created:      ${findingsCount}`);
  console.log(`- Households Recalculated: ${dbHouseholds.length}`);
  console.log(`- Final Advisor Score:   ${assessment?.overallReadinessScore}%`);
  console.log('----------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('Backfill routine failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
