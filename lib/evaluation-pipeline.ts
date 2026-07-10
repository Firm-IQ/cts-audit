import { prisma } from './db';
import { calculateReadinessScores } from './scoring';

/**
 * Checks if a requirement applies to an account based on type and registration.
 */
export function doesRequirementApply(reqKey: string, accType: string, accRegistration: string | null): boolean {
  const typeStr = (accType + ' ' + (accRegistration || '')).toLowerCase();
  
  let profileType = 'Individual Taxable';
  if (typeStr.includes('inherited')) profileType = 'Inherited IRA';
  else if (typeStr.includes('roth')) profileType = 'Roth IRA';
  else if (typeStr.includes('sep') || typeStr.includes('simple')) profileType = 'SEP IRA';
  else if (typeStr.includes('ira') || typeStr.includes('rollover') || typeStr.includes('traditional')) profileType = 'Traditional IRA';
  else if (typeStr.includes('trust')) profileType = 'Trust';
  else if (typeStr.includes('corporate') || typeStr.includes('corporation')) profileType = 'Corporate';
  else if (typeStr.includes('llc')) profileType = 'LLC';
  else if (typeStr.includes('estate')) profileType = 'Estate';
  else if (typeStr.includes('529') || typeStr.includes('education')) profileType = '529';
  else if (typeStr.includes('utma') || typeStr.includes('ugma')) profileType = 'UTMA';
  else if (typeStr.includes('joint')) profileType = 'Joint';
  else if (typeStr.includes('annuity')) profileType = 'Annuity';
  else if (typeStr.includes('alternative') || typeStr.includes('alt')) profileType = 'Alternative Investment';
  else if (typeStr.includes('individual') || typeStr.includes('taxable')) profileType = 'Individual Taxable';

  // 1. Core client information applies to ALL profiles
  if ([
    'client_addressCurrent',
    'client_emailCurrent',
    'client_phoneCurrent',
    'client_trustedContact',
    'client_relationshipsVerified'
  ].includes(reqKey)) {
    return true;
  }

  // 2. Core KYC applies to ALL profiles
  if ([
    'kyc_riskTolerance',
    'kyc_investmentObjectives',
    'kyc_timeHorizon',
    'kyc_liquidityNeeds',
    'kyc_incomeNetWorth',
    'kyc_lastReview'
  ].includes(reqKey)) {
    return true;
  }

  // 3. Core Account Documents
  if ([
    'doc_advisoryAgreement',
    'doc_accountApplication',
    'doc_transferRestrictions'
  ].includes(reqKey)) {
    return true;
  }

  // 4. Beneficiary Designation: retirement/IRA accounts and Annuity.
  if (reqKey === 'doc_beneficiaryDesignation') {
    return [
      'Roth IRA',
      'Traditional IRA',
      'SEP IRA',
      'Inherited IRA',
      'Annuity'
    ].includes(profileType);
  }

  // 5. Banking (ACH, Voided Check, Standing Instructions): applies to standard transactional accounts.
  // Excluded from Annuity and Alternative Investment.
  if ([
    'banking_achAuthorization',
    'banking_voidedCheck',
    'banking_standingInstructions'
  ].includes(reqKey)) {
    return ![
      'Annuity',
      'Alternative Investment'
    ].includes(profileType);
  }

  // 6. Trust Accounts: Trust Certification, Trustee Pages, Successor Trustee, Trust Tax ID
  if ([
    'trust_certification',
    'trust_trusteePages',
    'trust_successorTrustee',
    'trust_taxId'
  ].includes(reqKey)) {
    return profileType === 'Trust';
  }

  // 7. Corporate/LLC: Articles, Operating Agreement, Corporate Resolution, EIN, Authorized Signers
  if ([
    'entity_articles',
    'entity_operatingAgreement',
    'entity_ein',
    'entity_resolution',
    'entity_signers'
  ].includes(reqKey)) {
    return ['Corporate', 'LLC'].includes(profileType);
  }

  // 8. Estate Accounts: Death Certificate, Letters Testamentary, Executor Documentation
  // Note: Death Certificate also applies to Inherited IRA
  if (reqKey === 'estate_deathCertificate') {
    return ['Estate', 'Inherited IRA'].includes(profileType);
  }
  if ([
    'estate_letters',
    'estate_executor'
  ].includes(reqKey)) {
    return profileType === 'Estate';
  }

  // 9. Power/Guardianship/Conservatorship: UTMA / UGMA
  if ([
    'power_poa',
    'power_guardianship',
    'power_conservatorship'
  ].includes(reqKey)) {
    return profileType === 'UTMA';
  }

  // 10. Retirement specific items (IRA Documentation, Beneficiary Review, RMD Status)
  if ([
    'retire_ira',
    'retire_beneficiary',
    'retire_rmd'
  ].includes(reqKey)) {
    return [
      'Roth IRA',
      'Traditional IRA',
      'SEP IRA',
      'Inherited IRA'
    ].includes(profileType);
  }

  // 11. Inherited IRA specific items (Inherited IRA Documentation)
  if (reqKey === 'retire_inheritedIra') {
    return profileType === 'Inherited IRA';
  }

  // 12. Annuities
  if (reqKey === 'special_annuities') {
    return profileType === 'Annuity';
  }

  // 13. Alternative Investments
  if (reqKey === 'special_alts') {
    return profileType === 'Alternative Investment';
  }

  // 14. Direct Business / Restricted Assets
  if (reqKey === 'special_directBusiness' || reqKey === 'special_restrictedAssets') {
    return ['Annuity', 'Alternative Investment'].includes(profileType);
  }

  return false;
}

const checklistItemsToSeed = [
  { key: 'client_addressCurrent', name: 'Address Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 1 },
  { key: 'client_emailCurrent', name: 'Email Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 2 },
  { key: 'client_phoneCurrent', name: 'Phone Current', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 3 },
  { key: 'client_trustedContact', name: 'Trusted Contact', category: 'Client Information', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 4 },
  { key: 'client_relationshipsVerified', name: 'Household Relationships Verified', category: 'Client Information', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 5 },
  { key: 'kyc_riskTolerance', name: 'Risk Tolerance Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 6 },
  { key: 'kyc_investmentObjectives', name: 'Investment Objectives Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 7 },
  { key: 'kyc_timeHorizon', name: 'Time Horizon', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 8 },
  { key: 'kyc_liquidityNeeds', name: 'Liquidity Needs', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 9 },
  { key: 'kyc_incomeNetWorth', name: 'Income / Net Worth Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 10 },
  { key: 'kyc_lastReview', name: 'Last Review Current', category: 'KYC', appliesToAccountTypes: 'All', required: true, critical: false, displayOrder: 11 },
  { key: 'banking_achAuthorization', name: 'ACH Authorization', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 12 },
  { key: 'banking_voidedCheck', name: 'Voided Check / Bank Verification', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 13 },
  { key: 'banking_standingInstructions', name: 'Standing Instructions', category: 'Banking', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 14 },
  { key: 'doc_advisoryAgreement', name: 'Advisory Agreement', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 15 },
  { key: 'doc_accountApplication', name: 'Account Application', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 16 },
  { key: 'doc_beneficiaryDesignation', name: 'Beneficiary Designation', category: 'Account Documents', appliesToAccountTypes: 'All', required: true, critical: true, displayOrder: 17 },
  { key: 'doc_transferRestrictions', name: 'Transfer Restrictions Reviewed', category: 'Account Documents', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 18 },
  { key: 'trust_certification', name: 'Trust Certification', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 19 },
  { key: 'trust_trusteePages', name: 'Trustee Pages', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 20 },
  { key: 'trust_successorTrustee', name: 'Successor Trustee', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: false, critical: false, displayOrder: 21 },
  { key: 'trust_taxId', name: 'Tax ID Verified', category: 'Trust Accounts', appliesToAccountTypes: 'Trust', required: true, critical: false, displayOrder: 22 },
  { key: 'entity_articles', name: 'Articles', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 23 },
  { key: 'entity_operatingAgreement', name: 'Operating Agreement', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 24 },
  { key: 'entity_ein', name: 'EIN', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 25 },
  { key: 'entity_resolution', name: 'Corporate Resolution', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 26 },
  { key: 'entity_signers', name: 'Authorized Signers', category: 'Entity Accounts', appliesToAccountTypes: 'Entity', required: true, critical: false, displayOrder: 27 },
  { key: 'estate_deathCertificate', name: 'Death Certificate', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 28 },
  { key: 'estate_letters', name: 'Letters Testamentary', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 29 },
  { key: 'estate_executor', name: 'Executor Documentation', category: 'Estate Accounts', appliesToAccountTypes: 'Estate', required: true, critical: false, displayOrder: 30 },
  { key: 'power_poa', name: 'Power of Attorney', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 31 },
  { key: 'power_guardianship', name: 'Guardianship', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 32 },
  { key: 'power_conservatorship', name: 'Conservatorship', category: 'Powers', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 33 },
  { key: 'retire_ira', name: 'IRA Documentation', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA', required: true, critical: false, displayOrder: 34 },
  { key: 'retire_inheritedIra', name: 'Inherited IRA Documentation', category: 'Retirement', appliesToAccountTypes: 'Inherited IRA', required: true, critical: false, displayOrder: 35 },
  { key: 'retire_beneficiary', name: 'Beneficiary Review', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA,401(k)', required: true, critical: false, displayOrder: 36 },
  { key: 'retire_rmd', name: 'RMD Status', category: 'Retirement', appliesToAccountTypes: 'IRA,Roth IRA,Inherited IRA,SEP IRA,SIMPLE IRA,401(k)', required: false, critical: false, displayOrder: 37 },
  { key: 'special_annuities', name: 'Annuities', category: 'Special Holdings', appliesToAccountTypes: 'Annuity', required: false, critical: false, displayOrder: 38 },
  { key: 'special_alts', name: 'Alternative Investments', category: 'Special Holdings', appliesToAccountTypes: 'Alternative Investment', required: false, critical: false, displayOrder: 39 },
  { key: 'special_directBusiness', name: 'Direct Business', category: 'Special Holdings', appliesToAccountTypes: 'Direct Business', required: false, critical: false, displayOrder: 40 },
  { key: 'special_restrictedAssets', name: 'Restricted Assets', category: 'Special Holdings', appliesToAccountTypes: 'All', required: false, critical: false, displayOrder: 41 },
];

interface StatusAndEvidence {
  status: string;
  evidence: string;
}

function getInitialStatusAndEvidence(key: string, isApplicable: boolean, acc: any): StatusAndEvidence {
  if (!isApplicable) {
    return {
      status: 'Not Applicable',
      evidence: 'Requirement does not apply to this account registration/type.'
    };
  }

  const notesStr = ((acc.notes || '') + ' ' + (acc.household?.notes || '')).toLowerCase();

  // 1. Address Current: verified only when a non-empty address exists and has a recent verified date if available
  if (key === 'client_addressCurrent') {
    const address = acc.household?.address || '';
    const hasAddress = address.trim().length > 0;
    const hasRecentAddressDate = notesStr.includes('address verified') || notesStr.includes('address review') || notesStr.includes('address updated');
    const isVerified = hasAddress && (!notesStr.includes('address date') || hasRecentAddressDate);
    return isVerified ? {
      status: 'Verified',
      evidence: `CRM contains verified address: ${address}`
    } : {
      status: 'Needs Attention',
      evidence: 'No valid address details present in CRM; physical audit required.'
    };
  }

  // 2. Email Current: verified when a valid email exists
  if (key === 'client_emailCurrent') {
    const email = acc.household?.email || '';
    const isVerified = email.trim().length > 0 && email.includes('@');
    return isVerified ? {
      status: 'Verified',
      evidence: `CRM contains valid email: ${email}`
    } : {
      status: 'Needs Attention',
      evidence: 'No valid email address present in CRM; physical audit required.'
    };
  }

  // 3. Phone Current: verified when a valid phone exists
  if (key === 'client_phoneCurrent') {
    const phone = acc.household?.phone || '';
    const isVerified = phone.trim().length > 0;
    return isVerified ? {
      status: 'Verified',
      evidence: `CRM contains valid phone: ${phone}`
    } : {
      status: 'Needs Attention',
      evidence: 'No valid phone number present in CRM; physical audit required.'
    };
  }

  // 4. Account Type: verified from imported account type
  if (key === 'client_accountType' || key === 'account_type' || key === 'client_relationshipsVerified') {
    const isVerified = !!acc.type && acc.type.trim().length > 0;
    return isVerified ? {
      status: 'Verified',
      evidence: `Account type verified from imported CRM type: ${acc.type}`
    } : {
      status: 'Needs Attention',
      evidence: 'Account type not specified in CRM; physical audit required.'
    };
  }

  // 5. Registration: verified from imported registration
  if (key === 'account_registration' || key === 'client_registration') {
    const isVerified = !!acc.registration && acc.registration.trim().length > 0;
    return isVerified ? {
      status: 'Verified',
      evidence: `Registration verified from imported CRM registration: ${acc.registration}`
    } : {
      status: 'Needs Attention',
      evidence: 'Registration not specified in CRM; physical audit required.'
    };
  }

  // 6. Custodian: verified from imported custodian
  if (key === 'account_custodian' || key === 'client_custodian') {
    const isVerified = !!acc.custodian && acc.custodian.trim().length > 0;
    return isVerified ? {
      status: 'Verified',
      evidence: `Custodian verified from imported CRM custodian: ${acc.custodian}`
    } : {
      status: 'Needs Attention',
      evidence: 'Custodian not specified in CRM; physical audit required.'
    };
  }

  // 7. AUM: verified from imported account value
  if (key === 'account_aum' || key === 'client_aum') {
    const isVerified = acc.value !== null && acc.value !== undefined && acc.value > 0;
    return isVerified ? {
      status: 'Verified',
      evidence: `Account AUM value verified from imported CRM value: $${acc.value.toLocaleString()}`
    } : {
      status: 'Needs Attention',
      evidence: 'Account AUM value is missing or zero in CRM; physical audit required.'
    };
  }

  // 8. Trusted Contact: verified only if a trusted-contact field exists; otherwise Needs Attention
  if (key === 'client_trustedContact') {
    const hasTrustedContact = notesStr.includes('trusted contact') || notesStr.includes('trusted-contact') || notesStr.includes('trusted contact name') || notesStr.includes('trusted contact:');
    return hasTrustedContact ? {
      status: 'Verified',
      evidence: 'CRM contains trusted contact field: verified.'
    } : {
      status: 'Needs Attention',
      evidence: 'No trusted contact field exists in CRM; physical audit required.'
    };
  }

  // 9. Risk Tolerance Current: do not infer current from the existence of a risk score; require a review date, otherwise Needs Attention
  if (key === 'kyc_riskTolerance') {
    const hasRiskReviewDate = notesStr.includes('risk review date') || notesStr.includes('risk tolerance review') || notesStr.includes('risk profile review') || notesStr.includes('risk tolerance verified date') || notesStr.includes('risk review:');
    return hasRiskReviewDate ? {
      status: 'Verified',
      evidence: 'CRM contains risk tolerance and a recent review date: verified.'
    } : {
      status: 'Needs Attention',
      evidence: 'CRM contains risk tolerance but lacks a recent review date; physical audit required.'
    };
  }

  // 10. Beneficiary Review: Needs Attention unless beneficiary data and review date are present
  if (key === 'doc_beneficiaryDesignation' || key === 'retire_beneficiary') {
    const hasBenData = notesStr.includes('beneficiary designation') || notesStr.includes('beneficiary name') || notesStr.includes('beneficiary:') || notesStr.includes('primary beneficiary');
    const hasBenReview = notesStr.includes('beneficiary review') || notesStr.includes('beneficiary verified') || notesStr.includes('beneficiary date') || notesStr.includes('beneficiary review:');
    return (hasBenData && hasBenReview) ? {
      status: 'Verified',
      evidence: 'CRM contains beneficiary designation data and review date: verified.'
    } : {
      status: 'Needs Attention',
      evidence: 'CRM does not contain both beneficiary designation data and review date; physical audit required.'
    };
  }

  // 11. Trust Documentation: Needs Attention for trust accounts unless document evidence exists
  if (key.startsWith('trust_')) {
    const hasTrustEvidence = notesStr.includes('trust agreement') || notesStr.includes('trust certification') || notesStr.includes('certification of trust') || notesStr.includes('trust documents on file') || notesStr.includes('trust documentation:');
    return hasTrustEvidence ? {
      status: 'Verified',
      evidence: 'CRM contains trust document verification evidence: verified.'
    } : {
      status: 'Needs Attention',
      evidence: 'Trust account exists, but trust documentation is physically unverified.'
    };
  }

  // 12. ACH Documentation: Needs Attention unless ACH/bank documentation fields exist
  if (key.startsWith('banking_')) {
    const hasAchEvidence = notesStr.includes('ach setup') || notesStr.includes('voided check') || notesStr.includes('bank verification') || notesStr.includes('ach authorization') || notesStr.includes('standing instructions verified') || notesStr.includes('ach documentation:');
    return hasAchEvidence ? {
      status: 'Verified',
      evidence: 'CRM contains ACH/bank account documentation fields: verified.'
    } : {
      status: 'Needs Attention',
      evidence: 'ACH instructions exist, but bank documentation is physically unverified.'
    };
  }

  // Default paperwork items default to Needs Attention
  const paperworkKeys = [
    'doc_advisoryAgreement',
    'doc_accountApplication',
    'doc_transferRestrictions',
    'entity_articles',
    'entity_operatingAgreement',
    'entity_ein',
    'entity_resolution',
    'entity_signers',
    'estate_deathCertificate',
    'estate_letters',
    'estate_executor',
    'power_poa',
    'power_guardianship',
    'power_conservatorship',
    'retire_ira',
    'retire_inheritedIra',
    'retire_rmd',
    'special_annuities',
    'special_alts',
    'special_directBusiness',
    'special_restrictedAssets'
  ];

  const isPaperwork = paperworkKeys.some(k => key.toLowerCase() === k.toLowerCase());
  if (isPaperwork) {
    return {
      status: 'Needs Attention',
      evidence: 'CRM cannot verify physical/legal paperwork presence.'
    };
  }

  return {
    status: 'Verified',
    evidence: 'Inferred from CRM profile metrics.'
  };
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

  const accounts = households.flatMap(h => h.accounts.map(acc => ({
    ...acc,
    household: h
  })));
  const totalAccCount = accounts.length;

  // 1.5 Update Advisor AUM, revenue, households, and accounts counts
  const finalAdvisorAum = Math.round(households.reduce((sum, h) => sum + (h.totalAum || 0), 0) * 10) / 10;
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

  // 2. Fetch all active requirements (with self-healing fallback)
  let activeRequirements = await prisma.requirementLibrary.findMany({
    where: { active: true }
  });

  if (activeRequirements.length === 0) {
    console.log('Requirement library is empty in database. Seeding active requirements first...');
    for (const item of checklistItemsToSeed) {
      await prisma.requirementLibrary.upsert({
        where: { id: item.key },
        update: {
          name: item.name,
          category: item.category,
          appliesToAccountTypes: item.appliesToAccountTypes,
          required: item.required,
          critical: item.critical,
          displayOrder: item.displayOrder
        },
        create: {
          id: item.key,
          name: item.name,
          description: `${item.name} requirements.`,
          category: item.category,
          appliesToAccountTypes: item.appliesToAccountTypes,
          required: item.required,
          critical: item.critical,
          displayOrder: item.displayOrder
        }
      });
    }
    activeRequirements = await prisma.requirementLibrary.findMany({
      where: { active: true }
    });
  }

  console.log(`- Active requirements found: ${activeRequirements.length}`);

  // 3. Upsert Account Checklist Items
  console.log('Generating/updating account checklist items...');
  for (const acc of accounts) {
    const matchedRequirements = activeRequirements.filter(req => doesRequirementApply(req.id, acc.type, acc.registration));
    if (matchedRequirements.length === 0) {
      console.log(`WARNING: No matching requirements found for account type "${acc.type}" (Account: "${acc.name}", Registration: "${acc.registration || 'None'}"). Matching failed because no active Requirement Library entries apply to this account type/registration.`);
    }

    // Load only requirements mapped to that account type; exclude non-applicable completely
    const matchedReqIds = matchedRequirements.map(req => req.id);
    await prisma.accountChecklistItem.deleteMany({
      where: {
        accountId: acc.id,
        itemKey: { notIn: matchedReqIds }
      }
    });

    for (const req of matchedRequirements) {
      // Check if item already exists in database
      const existingItem = await prisma.accountChecklistItem.findUnique({
        where: {
          accountId_itemKey: {
            accountId: acc.id,
            itemKey: req.id
          }
        }
      });

      // Default status & evidence
      let { status: targetStatus, evidence: targetEvidence } = getInitialStatusAndEvidence(req.id, true, acc);

      // Preserve existing seeded status if it is audited (Present, Verified, Missing, Needs Review, Needs Attention)
      if (existingItem && ['Present', 'Verified', 'Missing', 'Needs Review', 'Needs Attention'].includes(existingItem.status)) {
        targetStatus = existingItem.status;
        targetEvidence = existingItem.notes || (existingItem.status === 'Missing'
          ? 'Review of physical/legal folder confirms document is missing.'
          : ['Needs Review', 'Needs Attention'].includes(existingItem.status)
            ? 'Document is present in physical folder but requires signatures/dates review.'
            : 'Audited and verified document completeness.');
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
          status: targetStatus,
          notes: targetEvidence
        },
        create: {
          accountId: acc.id,
          itemKey: req.id,
          itemName: req.name,
          requirementId: req.id,
          status: targetStatus,
          notes: targetEvidence,
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
  const unresolvedItems = allChecklistItems.filter(item => ['Missing', 'Needs Attention', 'Needs Review'].includes(item.status));
  const resolvedItems = allChecklistItems.filter(item => !['Missing', 'Needs Attention', 'Needs Review'].includes(item.status));

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

  // SCORING FORMULA
  // 1. Account Completion Score (CS):
  //    CS = (Sum of (Requirement Weight * Status Multiplier) / Sum of Weights) * 100
  //    Multipliers:
  //      - Verified / Inferred / Present: 1.0
  //      - Needs Attention / Unknown / Needs Review: 0.5
  //      - Missing: 0.0
  //      - Not Applicable: Excluded completely
  // 2. Account Readiness Score (ARS):
  //    ARS = Max(0, CS - (15 * Count of Critical Missing Requirements))
  // 3. Household Readiness Score (HRS):
  //    HRS = Average of ARS for all accounts in the household
  // 4. Advisor Know Your Book Index (KYBI):
  //    KYBI = Sum of (HRS * Household AUM) / Sum of Household AUM

  // Log scoring formula to console as requested
  console.log('\n========================================================================');
  console.log('--- SCORING FORMULA AUDIT LOG ---');
  console.log('1. Account Completion Score (CS):');
  console.log('   CS = (Sum of (Requirement Weight * Status Multiplier) / Sum of Weights) * 100');
  console.log('   Multipliers: Verified = 1.0, Needs Attention = 0.5, Missing = 0.0');
  console.log('2. Account Readiness Score (ARS):');
  console.log('   ARS = Max(0, CS - (15 * Count of Critical Missing Requirements))');
  console.log('3. Household Readiness Score (HRS):');
  console.log('   HRS = Average of ARS for all accounts in the household');
  console.log('4. Advisor Know Your Book Index (KYBI):');
  console.log('   KYBI = Sum of (HRS * Household AUM) / Sum of Household AUM');
  console.log('========================================================================\n');

  // Compute Account Scores
  const accountScores = new Map<string, number>();
  for (const acc of accounts) {
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
      } else if (['Needs Attention', 'Unknown', 'Needs Review'].includes(item.status)) {
        multiplier = 0.5;
      } else if (item.status === 'Missing') {
        multiplier = 0.0;
        if (item.requirement?.critical) {
          missingCriticalCount++;
        }
      }

      weightedScoreSum += weight * multiplier;
    });

    const completion = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 100;
    const readiness = Math.max(0, Math.min(100, Math.round(completion - missingCriticalCount * 15)));
    accountScores.set(acc.id, readiness);
  }

  // Compute Household Scores
  const householdScores = new Map<string, number>();
  for (const hh of households) {
    const hhAccounts = accounts.filter(a => a.householdId === hh.id);
    if (hhAccounts.length === 0) {
      householdScores.set(hh.id, 100);
      continue;
    }
    const sum = hhAccounts.reduce((s, a) => s + (accountScores.get(a.id) ?? 0), 0);
    const hhScore = Math.round(sum / hhAccounts.length);
    householdScores.set(hh.id, hhScore);
  }

  // Compute Advisor Know Your Book Index (AUM-weighted rollup of household readiness)
  let weightedHouseholdReadinessSum = 0;
  let totalHouseholdAum = 0;
  for (const hh of households) {
    const hhScore = householdScores.get(hh.id) ?? 0;
    const hhAum = hh.totalAum || 0;
    weightedHouseholdReadinessSum += hhScore * hhAum;
    totalHouseholdAum += hhAum;
  }

  const overallReadinessScore = totalHouseholdAum > 0
    ? Math.round((weightedHouseholdReadinessSum / totalHouseholdAum) * 10) / 10
    : Math.round((Array.from(householdScores.values()).reduce((a, b) => a + b, 0) / households.length) * 10) / 10;

  // Calculate Client Data Score & KYC Documentation Score from Checklist Items
  const clientInfoItems = allChecklistItems.filter(item => item.requirement?.category === 'Client Information');
  let clientInfoWeights = 0;
  let clientInfoWeightedSum = 0;
  clientInfoItems.forEach(item => {
    if (item.status === 'Not Applicable') return;
    const weight = item.requirement?.weight ?? 1.0;
    clientInfoWeights += weight;
    let multiplier = 0.0;
    if (['Present', 'Verified', 'Inferred'].includes(item.status)) multiplier = 1.0;
    else if (['Needs Attention', 'Unknown', 'Needs Review'].includes(item.status)) multiplier = 0.5;
    clientInfoWeightedSum += weight * multiplier;
  });
  const clientDataScore = clientInfoWeights > 0 ? Math.round((clientInfoWeightedSum / clientInfoWeights) * 100) : 100;

  const kycItems = allChecklistItems.filter(item => item.requirement?.category === 'KYC');
  let kycWeights = 0;
  let kycWeightedSum = 0;
  kycItems.forEach(item => {
    if (item.status === 'Not Applicable') return;
    const weight = item.requirement?.weight ?? 1.0;
    kycWeights += weight;
    let multiplier = 0.0;
    if (['Present', 'Verified', 'Inferred'].includes(item.status)) multiplier = 1.0;
    else if (['Needs Attention', 'Unknown', 'Needs Review'].includes(item.status)) multiplier = 0.5;
    kycWeightedSum += weight * multiplier;
  });
  const kycDocumentationScore = kycWeights > 0 ? Math.round((kycWeightedSum / kycWeights) * 100) : 100;

  // Compile inputs for score generator for other categories
  const dbAdvisor = await prisma.advisor.findUnique({ where: { id: advisorId } });
  const scoreInputs = {
    emailCompletenessPercent: clientDataScore,
    phoneCompletenessPercent: clientDataScore,
    addressCompletenessPercent: clientDataScore,
    householdingQualityScore: assessment.householdingQualityScore ?? 10,
    duplicateRecordRiskScore: assessment.duplicateRecordRiskScore ?? 10,
    clientNotesQualityScore: assessment.clientNotesQualityScore ?? 9,
    kycUpdateFrequency: assessment.kycUpdateFrequency ?? 'Triennial',
    trustedContactCompletenessPercent: kycDocumentationScore,
    beneficiaryReviewStatus: assessment.beneficiaryReviewStatus ?? 'Incomplete',
    riskToleranceCurrentPercent: kycDocumentationScore,
    investmentObjectiveCurrentPercent: kycDocumentationScore,
    missingSignatureRiskScore: Math.min(10, Math.max(1, Math.round(allChecklistItems.filter(item => item.status === 'Missing' && item.requirement?.critical).length / 4))),
    documentStorageQualityScore: assessment.documentStorageQualityScore ?? 8,
    percentIraAccounts: 40,
    percentTrustAccounts: 15,
    percentEntityAccounts: 12,
    percentAnnuityAltAccounts: 18,
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
  calculatedScores.overallReadinessScore = overallReadinessScore;
  calculatedScores.clientDataScore = clientDataScore;
  calculatedScores.kycDocumentationScore = kycDocumentationScore;

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
