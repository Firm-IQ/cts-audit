import { PrismaClient } from '@prisma/client';
import { runEvaluationPipeline, doesRequirementApply } from '../lib/evaluation-pipeline';

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

  // Fetch active requirement definitions
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

  console.log('Cleaning up existing checklist items for Michael Bennett to rebuild distribution...');
  await prisma.accountChecklistItem.deleteMany({
    where: { account: { household: { advisorId: advisor.id } } }
  });

  // 1. Run pipeline first to dynamically evaluate CRM fields
  console.log('Running initial evaluation pipeline to evaluate CRM fields...');
  await runEvaluationPipeline(advisor.id, 'Render Deploy Backfill');

  // 2. Fetch the newly created checklist items
  const newlyCreatedItems = await prisma.accountChecklistItem.findMany({
    where: { account: { household: { advisorId: advisor.id } } }
  });

  console.log('Applying realistic deficiency injections and group scoring distributions...');
  for (let idx = 0; idx < dbAccounts.length; idx++) {
    const acc = dbAccounts[idx];
    const accItems = newlyCreatedItems.filter(item => item.accountId === acc.id);

    // Determine deficiency membership
    const hasTcDef = tcHhIds.has(acc.householdId);
    const hasBenDef = benAccIds.has(acc.id);
    const hasAchDef = achAccIds.has(acc.id);
    const hasMorganDef = acc.id === morganTrustAcc?.id;
    const hasTrustCertDef = docTrustIds.has(acc.id);
    const hasInhDef = inhAccIds.has(acc.id);
    const hasKycDef = kycHhIds.has(acc.householdId);
    const hasObjDef = objAccIds.has(acc.id);
    const isDeficient = hasTcDef || hasBenDef || hasAchDef || hasMorganDef || hasTrustCertDef || hasInhDef || hasKycDef || hasObjDef;

    // Seeding distribution strategy:
    // - Group 1: 45% (idx % 10 < 4.5) -> Fully Complete (100% Score)
    // - Group 2: 35% (idx % 10 >= 4.5 && idx % 10 < 8) -> Mostly Complete (80-99% Score)
    // - Group 3: 20% (idx % 10 >= 8) -> Unreviewed/Default (50-79% Score)
    const isGroup1 = !isDeficient && (idx % 10 < 4.5);
    const isGroup2 = !isDeficient && (idx % 10 >= 4.5 && idx % 10 < 8);

    for (const item of accItems) {
      let status = item.status;
      let notes = item.notes || '';

      // Set initial state based on CRM check rules
      const paperworkKeys = [
        'banking_achAuthorization', 'banking_voidedCheck', 'banking_standingInstructions',
        'doc_advisoryAgreement', 'doc_accountApplication', 'doc_beneficiaryDesignation', 'doc_transferRestrictions',
        'trust_certification', 'trust_trusteePages', 'trust_successorTrustee', 'trust_taxId',
        'entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers',
        'estate_deathCertificate', 'estate_letters', 'estate_executor', 'power_poa', 'power_guardianship', 'power_conservatorship',
        'retire_ira', 'retire_inheritedIra', 'retire_beneficiary', 'retire_rmd', 'special_annuities', 'special_alts', 'special_directBusiness', 'special_restrictedAssets'
      ];
      const isPaperwork = paperworkKeys.some(k => item.itemKey.toLowerCase() === k.toLowerCase());

      // Injected deficiencies
      let isOverridden = false;
      if (item.itemKey === reqTrustedContact && hasTcDef) {
        status = 'Missing';
        notes = 'No trusted contact person on file.';
        isOverridden = true;
      } else if (item.itemKey === reqBeneficiary && hasBenDef) {
        status = 'Needs Review';
        notes = 'Beneficiary designation requires verification or signature.';
        isOverridden = true;
      } else if (item.itemKey === reqVoidedCheck && hasAchDef) {
        status = 'Missing';
        notes = 'ACH setup requires voided check or bank letter verification.';
        isOverridden = true;
      } else if (hasMorganDef && item.itemKey === reqSuccessorTrustee) {
        status = 'Missing';
        notes = 'Successor trustee page or designation is missing.';
        isOverridden = true;
      } else if (hasTrustCertDef && item.itemKey === reqTrustCertification) {
        status = 'Missing';
        notes = 'Complete Certification of Trust missing from folder.';
        isOverridden = true;
      } else if (item.itemKey === reqInheritedIraDoc && hasInhDef) {
        status = 'Missing';
        notes = 'Incomplete inherited adoption or original owner documentation.';
        isOverridden = true;
      } else if (item.itemKey === reqLastReview && hasKycDef) {
        status = 'Needs Review';
        notes = 'KYC last review date was more than 24 months ago.';
        isOverridden = true;
      } else if (item.itemKey === reqInvestmentObjectives && hasObjDef) {
        status = 'Needs Review';
        notes = 'Stale risk profile or mismatch between holding asset allocation.';
        isOverridden = true;
      }

      // Group distribution formatting if not overridden by deficiencies
      if (!isOverridden) {
        if (isGroup1) {
          if (isPaperwork) {
            status = 'Verified';
            notes = 'Audited and verified document completeness.';
          }
        } else if (isGroup2) {
          if (isPaperwork) {
            if (item.itemKey === 'doc_advisoryAgreement') {
              status = 'Unknown';
              notes = 'CRM cannot verify physical/legal paperwork presence.';
            } else {
              status = 'Verified';
              notes = 'Audited and verified document completeness.';
            }
          }
        } else if (isDeficient) {
          // Deficient account, but other checklist items can be Verified to avoid complete crash of score
          if (isPaperwork) {
            status = 'Verified';
            notes = 'Audited and verified document completeness.';
          }
        }
      }

      if (status !== item.status || notes !== item.notes) {
        await prisma.accountChecklistItem.update({
          where: { id: item.id },
          data: { status, notes }
        });
      }
    }
  }

  // 3. Run pipeline a second time to calculate and persist correct rollups and findings
  console.log('Running final evaluation pipeline to calculate scores and findings...');
  await runEvaluationPipeline(advisor.id, 'Render Deploy Backfill');

  // 3. Query final stats for reporting
  const allChecklistItems = await prisma.accountChecklistItem.findMany({
    where: { account: { household: { advisorId: advisor.id } } },
    include: { requirement: true, account: true }
  });

  const checklistItemsCount = allChecklistItems.length;

  const assessment = await prisma.assessment.findFirst({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: 'desc' }
  });

  const findingsCount = await prisma.finding.count({
    where: { assessmentId: assessment?.id }
  });

  // Calculate matched requirements per account type
  const matchStats: Record<string, number> = {};
  for (const acc of dbAccounts) {
    const accMatches = activeRequirements.filter(req => {
      const normalizedApplies = req.appliesToAccountTypes.trim().toLowerCase();
      if (normalizedApplies === 'all') return true;
      const appliesList = normalizedApplies.split(',').map(s => s.trim().toLowerCase());
      return appliesList.some(appType => 
        acc.type.toLowerCase().includes(appType) || appType.includes(acc.type.toLowerCase())
      ) || (acc.registration ? appliesList.some(appReg => 
        acc.registration!.toLowerCase().includes(appReg) || appReg.includes(acc.registration!.toLowerCase())
      ) : false);
    }).length;
    matchStats[acc.type] = (matchStats[acc.type] || 0) + accMatches;
  }

  // Calculate checklist items by status
  const statusStats: Record<string, number> = {};
  for (const item of allChecklistItems) {
    statusStats[item.status] = (statusStats[item.status] || 0) + 1;
  }

  // Calculate score distribution
  let count100 = 0;
  let count90to99 = 0;
  let count80to89 = 0;
  let count70to79 = 0;
  let count60to69 = 0;
  let countBelow60 = 0;

  const accountScores = new Map<string, number>();
  for (const acc of dbAccounts) {
    const accChecklist = allChecklistItems.filter(item => item.accountId === acc.id);
    let totalWeight = 0;
    let weightedScoreSum = 0;
    let missingCriticalCount = 0;

    accChecklist.forEach(item => {
      if (item.status === 'Not Applicable') return;
      const weight = item.requirement?.weight ?? 1.0;
      totalWeight += weight;

      let multiplier = 0.0;
      if (['Present', 'Verified', 'Inferred'].includes(item.status)) {
        multiplier = 1.0;
      } else if (item.status === 'Unknown') {
        multiplier = 0.5;
      } else if (item.status === 'Needs Review') {
        multiplier = 0.25;
      } else if (item.status === 'Missing') {
        multiplier = 0.0;
        if (item.requirement?.critical) {
          missingCriticalCount++;
        }
      }
      weightedScoreSum += weight * multiplier;
    });

    const completion = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 100;
    const score = Math.max(0, Math.min(100, Math.round(completion - missingCriticalCount * 15)));
    accountScores.set(acc.id, score);

    if (score === 100) count100++;
    else if (score >= 90) count90to99++;
    else if (score >= 80) count80to89++;
    else if (score >= 70) count70to79++;
    else if (score >= 60) count60to69++;
    else countBelow60++;
  }

  console.log('\n========================================');
  console.log('--- PRODUCTION BACKFILL EVALUATION LOGS ---');
  console.log('========================================');
  console.log(`- accounts processed: ${dbAccounts.length}`);
  
  console.log('\n- checklist items updated by status:');
  for (const [status, count] of Object.entries(statusStats)) {
    console.log(`  * ${status}: ${count}`);
  }

  console.log('\n- account scores calculated:');
  for (const [accId, score] of accountScores.entries()) {
    const acc = dbAccounts.find(a => a.id === accId);
    console.log(`  * ${acc?.name || accId}: ${score}%`);
  }

  console.log('\n- household scores calculated:');
  for (const hh of dbHouseholds) {
    const hhAccounts = dbAccounts.filter(a => a.householdId === hh.id);
    const hhScore = hhAccounts.length > 0
      ? Math.round(hhAccounts.reduce((sum, a) => sum + (accountScores.get(a.id) ?? 0), 0) / hhAccounts.length)
      : 100;
    console.log(`  * ${hh.name}: ${hhScore}%`);
  }

  console.log(`\n- Findings Created:            ${findingsCount}`);
  console.log(`- Households Recalculated:     ${dbHouseholds.length}`);
  console.log(`\n- final advisor score: ${assessment?.overallReadinessScore}%`);
  console.log('========================================\n');

  // Log Carter Household calculations
  const carterHh = dbHouseholds.find(h => h.name === 'Carter Household');
  if (carterHh) {
    console.log('========================================================================');
    console.log('--- EVIDENCE AND SCORE CALCULATIONS FOR CARTER HOUSEHOLD ---');
    console.log(`Household: "${carterHh.name}" (Total AUM: $${((carterHh.totalAum || 0) * 1000000).toLocaleString()})`);
    
    let totalAccScoreSum = 0;
    const carterAccounts = dbAccounts.filter(a => a.householdId === carterHh.id);
    for (const acc of carterAccounts) {
      const accChecklist = allChecklistItems.filter(item => item.accountId === acc.id);
      console.log(`\n  * Account: "${acc.name}" (Type: ${acc.type}, Registration: ${acc.registration}, Custodian: ${acc.custodian}, AUM: $${(acc.value || 0).toLocaleString()})`);
      console.log('    Checklist Items Evidence:');
      
      let totalWeight = 0;
      let weightedScoreSum = 0;
      let missingCriticalCount = 0;

      accChecklist.forEach(item => {
        if (item.status === 'Not Applicable') return;
        const weight = item.requirement?.weight ?? 1.0;
        totalWeight += weight;

        let multiplier = 0.0;
        if (['Present', 'Verified', 'Inferred'].includes(item.status)) {
          multiplier = 1.0;
        } else if (item.status === 'Unknown') {
          multiplier = 0.5;
        } else if (item.status === 'Needs Review') {
          multiplier = 0.25;
        } else if (item.status === 'Missing') {
          multiplier = 0.0;
          if (item.requirement?.critical) {
            missingCriticalCount++;
          }
        }
        weightedScoreSum += weight * multiplier;
        console.log(`      - [${item.status}] ${item.itemName} (Weight: ${weight})`);
        console.log(`        Evidence: "${item.notes}"`);
      });

      const completion = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 100;
      const score = Math.max(0, Math.min(100, Math.round(completion - missingCriticalCount * 15)));
      totalAccScoreSum += score;
      console.log(`    Account Completion Score: ${completion.toFixed(1)}%`);
      console.log(`    Account Readiness Score: ${score}% (Critical Missing Penalty Count: ${missingCriticalCount})`);
    }

    const calculatedHhScore = carterAccounts.length > 0
      ? Math.round(totalAccScoreSum / carterAccounts.length)
      : 100;
    console.log(`\n  * Household Readiness Score: ${calculatedHhScore}% (Average of its accounts)`);
    console.log('========================================================================\n');
  }
}

main()
  .catch((e) => {
    console.error('Backfill routine failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
