import { doesRequirementApply } from '../lib/evaluation-pipeline';

interface TestResult {
  accountType: string;
  registration: string | null;
  passed: boolean;
  errors: string[];
}

function runApplicabilityTests(): TestResult[] {
  const requirements = [
    // Core
    { key: 'client_addressCurrent', name: 'Address Current' },
    { key: 'client_emailCurrent', name: 'Email Current' },
    { key: 'client_phoneCurrent', name: 'Phone Current' },
    // Trust
    { key: 'trust_certification', name: 'Trust Certification' },
    { key: 'trust_trusteePages', name: 'Trustee Pages' },
    { key: 'trust_successorTrustee', name: 'Successor Trustee' },
    { key: 'trust_taxId', name: 'Trust Tax ID' },
    // Entity
    { key: 'entity_articles', name: 'Articles' },
    { key: 'entity_operatingAgreement', name: 'Operating Agreement' },
    { key: 'entity_ein', name: 'EIN' },
    { key: 'entity_resolution', name: 'Corporate Resolution' },
    { key: 'entity_signers', name: 'Authorized Signers' },
    // Estate
    { key: 'estate_deathCertificate', name: 'Death Certificate' },
    { key: 'estate_letters', name: 'Letters Testamentary' },
    { key: 'estate_executor', name: 'Executor Documentation' },
    // Retirement
    { key: 'retire_ira', name: 'IRA Documentation' },
    { key: 'retire_inheritedIra', name: 'Inherited IRA Documentation' },
    { key: 'retire_beneficiary', name: 'Beneficiary Review' },
    { key: 'retire_rmd', name: 'RMD Status' },
    // Special
    { key: 'special_annuities', name: 'Annuities' }
  ];

  const results: TestResult[] = [];

  // 1. Individual Taxable
  {
    const errors: string[] = [];
    const mustNot = ['retire_ira', 'retire_inheritedIra', 'retire_rmd', 'trust_certification', 'trust_trusteePages', 'trust_successorTrustee', 'trust_taxId', 'estate_deathCertificate', 'estate_letters', 'estate_executor', 'entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers', 'special_annuities'];
    mustNot.forEach(key => {
      if (doesRequirementApply(key, 'Individual Taxable', 'Individual')) {
        errors.push(`Should NOT show requirement: ${key}`);
      }
    });
    const must = ['client_addressCurrent', 'client_emailCurrent', 'client_phoneCurrent', 'kyc_riskTolerance', 'kyc_investmentObjectives', 'doc_advisoryAgreement', 'doc_accountApplication'];
    must.forEach(key => {
      if (!doesRequirementApply(key, 'Individual Taxable', 'Individual')) {
        errors.push(`MUST show requirement: ${key}`);
      }
    });
    results.push({
      accountType: 'Individual Taxable',
      registration: 'Individual',
      passed: errors.length === 0,
      errors
    });
  }

  // 2. Roth IRA
  {
    const errors: string[] = [];
    const mustNot = ['trust_certification', 'trust_trusteePages', 'trust_successorTrustee', 'trust_taxId', 'entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers', 'estate_letters', 'estate_executor', 'special_annuities'];
    mustNot.forEach(key => {
      if (doesRequirementApply(key, 'Roth IRA', 'Roth IRA')) {
        errors.push(`Should NOT show requirement: ${key}`);
      }
    });
    const must = ['client_addressCurrent', 'client_emailCurrent', 'client_phoneCurrent', 'retire_ira', 'retire_beneficiary', 'retire_rmd', 'doc_beneficiaryDesignation'];
    must.forEach(key => {
      if (!doesRequirementApply(key, 'Roth IRA', 'Roth IRA')) {
        errors.push(`MUST show requirement: ${key}`);
      }
    });
    results.push({
      accountType: 'Roth IRA',
      registration: 'Roth IRA',
      passed: errors.length === 0,
      errors
    });
  }

  // 3. Trust
  {
    const errors: string[] = [];
    const must = ['trust_certification', 'trust_trusteePages', 'trust_successorTrustee', 'trust_taxId'];
    must.forEach(key => {
      if (!doesRequirementApply(key, 'Trust', 'Trust')) {
        errors.push(`MUST show requirement: ${key}`);
      }
    });
    const mustNot = ['entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers', 'estate_letters', 'estate_executor'];
    mustNot.forEach(key => {
      if (doesRequirementApply(key, 'Trust', 'Trust')) {
        errors.push(`Should NOT show requirement: ${key}`);
      }
    });
    results.push({
      accountType: 'Trust',
      registration: 'Trust',
      passed: errors.length === 0,
      errors
    });
  }

  // 4. Corporate / Entity
  {
    const errors: string[] = [];
    const must = ['entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers'];
    must.forEach(key => {
      if (!doesRequirementApply(key, 'Corporate', 'Corporate')) {
        errors.push(`MUST show requirement: ${key}`);
      }
    });
    const mustNot = ['trust_certification', 'trust_trusteePages', 'estate_letters', 'retire_ira'];
    mustNot.forEach(key => {
      if (doesRequirementApply(key, 'Corporate', 'Corporate')) {
        errors.push(`Should NOT show requirement: ${key}`);
      }
    });
    results.push({
      accountType: 'Corporate',
      registration: 'Corporate',
      passed: errors.length === 0,
      errors
    });
  }

  // 5. Inherited IRA
  {
    const errors: string[] = [];
    const must = ['retire_inheritedIra', 'retire_beneficiary', 'estate_deathCertificate', 'retire_rmd'];
    must.forEach(key => {
      if (!doesRequirementApply(key, 'Inherited IRA', 'Inherited IRA')) {
        errors.push(`MUST show requirement: ${key}`);
      }
    });
    const mustNot = ['trust_certification', 'entity_articles', 'special_annuities'];
    mustNot.forEach(key => {
      if (doesRequirementApply(key, 'Inherited IRA', 'Inherited IRA')) {
        errors.push(`Should NOT show requirement: ${key}`);
      }
    });
    results.push({
      accountType: 'Inherited IRA',
      registration: 'Inherited IRA',
      passed: errors.length === 0,
      errors
    });
  }

  return results;
}

console.log('Running Applicability Validation Tests for all Account Types...\n');
const results = runApplicabilityTests();
let allPassed = true;

results.forEach(res => {
  if (res.passed) {
    console.log(`✅ PASSED: ${res.accountType} (Registration: ${res.registration || 'None'})`);
  } else {
    console.error(`❌ FAILED: ${res.accountType} (Registration: ${res.registration || 'None'})`);
    res.errors.forEach(err => console.error(`   - ${err}`));
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n🎉 ALL APPLICABILITY MAPPING TESTS COMPLETED SUCCESSFULLY.');
  process.exit(0);
} else {
  console.error('\n❌ APPLICABILITY MAPPING TESTS FAILED.');
  process.exit(1);
}
