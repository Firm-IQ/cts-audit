import { PrismaClient } from '@prisma/client';
import { runEvaluationPipeline } from '../lib/evaluation-pipeline';

const prisma = new PrismaClient();

interface AccountDef {
  name: string;
  type: string;
  val: number;
  registration: string;
  issueType?: 'trust_doc' | 'retire_ben' | 'ach_bank' | 'inh_ira' | 'adv_agree' | 'entity_auth';
  groupTier?: '100' | '90s' | '70s_80s' | 'cleanup';
}

interface HouseholdDef {
  name: string;
  primaryClient: string;
  secondaryClient?: string;
  accounts: AccountDef[];
}

async function main() {
  console.log('========================================================================');
  console.log('--- STARTING SYNTHETIC AUDIT DEMO SEED: DANIEL HARPER ---');
  console.log('========================================================================\n');

  // 1. Idempotency Check: Delete existing Daniel Harper advisor only
  const existingAdvisor = await prisma.advisor.findFirst({
    where: {
      name: 'Daniel Harper',
      firmName: 'Harper Wealth Management'
    }
  });

  if (existingAdvisor) {
    console.log(`Found existing advisor "${existingAdvisor.name}" (${existingAdvisor.id}). Deleting to ensure idempotency...`);
    await prisma.advisor.delete({
      where: { id: existingAdvisor.id }
    });
    console.log('Existing advisor and associated records cleanly removed.\n');
  }

  // 2. Resolve Admin User
  const adminUser = await prisma.user.findFirst({
    where: { email: 'curt@gocontinuity.com' }
  }) || await prisma.user.findFirst();

  const createdById = adminUser ? adminUser.id : null;
  console.log(`Associating advisor with user: ${adminUser?.email || 'None'} (${createdById})`);

  // 3. Create Advisor Daniel Harper
  const advisor = await prisma.advisor.create({
    data: {
      name: 'Daniel Harper',
      firmName: 'Harper Wealth Management',
      businessModel: 'Independent RIA',
      currentCustodian: 'Fidelity',
      futureCustodian: 'Schwab',
      totalAum: 42.0, // $42,000,000 (represented in Millions)
      annualRevenue: 460000, // $460,000 USD
      households: 82,
      accounts: 185,
      staffCount: 3,
      crm: 'Redtail',
      protocolStatus: 'Yes',
      createdById
    }
  });

  console.log(`Created Advisor: ${advisor.name} - ${advisor.firmName} (${advisor.id})\n`);

  // 4. Build Households and Accounts Topology
  // Requirements:
  // - Exactly 82 Households
  // - Exactly 185 Accounts
  // - Total AUM: $42,000,000
  // - Total Annual Revenue: $460,000
  // - Realistic Account Mix:
  //   * 12 Trust
  //   * 71 Retirement (45 Traditional/Rollover IRA, 22 Roth IRA, 4 SEP IRA)
  //   * 6 Inherited IRA
  //   * 6 Entity (4 LLC, 2 Corporate)
  //   * 55 Individual Taxable
  //   * 25 Joint Taxable
  //   * 7 529 Education
  //   * 3 Annuities
  //   Total = 185
  //
  // Realistic Issues to inject:
  // - 4 trust accounts needing updated trust documentation
  // - 6 retirement accounts needing beneficiary review
  // - 5 ACH relationships needing bank verification
  // - 3 inherited IRAs needing documentation review
  // - 4 advisory agreements needing confirmation
  // - 2 entity accounts needing updated authority documentation

  const householdNames = [
    // Showcase & Anchor Households
    { name: 'Kaufman Household', primary: 'Robert Kaufman', secondary: 'Eleanor Kaufman' },
    { name: 'Montgomery Family Trust', primary: 'David Montgomery', secondary: 'Susan Montgomery' },
    { name: 'Vance Household', primary: 'Arthur Vance', secondary: 'Claire Vance' },
    { name: 'Harrington Household', primary: 'Richard Harrington', secondary: 'Patricia Harrington' },
    { name: 'Livingston Household', primary: 'James Livingston', secondary: 'Sarah Livingston' },
    { name: 'Apex Holdings Group', primary: 'Marcus Sterling' },
    { name: 'Summit Advisory Partners Inc', primary: 'Jonathan Hayes' },
    { name: 'Morrison Household', primary: 'Thomas Morrison', secondary: 'Diane Morrison' },
    { name: 'Ellis Household', primary: 'Gregory Ellis', secondary: 'Martha Ellis' },
    { name: 'Gallagher Household', primary: 'Brian Gallagher' },
    { name: 'Sinclair Household', primary: 'Charles Sinclair', secondary: 'Evelyn Sinclair' },
    { name: 'Patterson Household', primary: 'Walter Patterson', secondary: 'Helen Patterson' },
    { name: 'Bauer Household', primary: 'Keith Bauer', secondary: 'Nancy Bauer' },
    { name: 'Prescott Household', primary: 'Stephen Prescott', secondary: 'Laura Prescott' },
    { name: 'Fletcher Household', primary: 'Dennis Fletcher' },
    { name: 'Chambers Household', primary: 'Howard Chambers', secondary: 'Gloria Chambers' },
    { name: 'Davenport Household', primary: 'Lawrence Davenport', secondary: 'Caroline Davenport' },
    { name: 'Mercer Household', primary: 'Philip Mercer' },
    { name: 'Whitman Household', primary: 'Douglas Whitman', secondary: 'Rachel Whitman' },
    { name: 'Corbett Household', primary: 'Russell Corbett' },
    { name: 'Langley Household', primary: 'Raymond Langley', secondary: 'Joyce Langley' },
    { name: 'Bradford Household', primary: 'Bruce Bradford', secondary: 'Virginia Bradford' },
    { name: 'Sloane Household', primary: 'Martin Sloane' },
    { name: 'Kensington Household', primary: 'Warren Kensington', secondary: 'Beatrice Kensington' },
    { name: 'Thornton Household', primary: 'Paul Thornton', secondary: 'Linda Thornton' },
    { name: 'Winslow Household', primary: 'Carl Winslow', secondary: 'Harriet Winslow' },
    { name: 'Sterling Household', primary: 'Roger Sterling', secondary: 'Mona Sterling' },
    { name: 'Fairfax Household', primary: 'Julian Fairfax' },
    { name: 'Belmont Household', primary: 'Alexander Belmont', secondary: 'Victoria Belmont' },
    { name: 'Pemberton Household', primary: 'George Pemberton', secondary: 'Lucille Pemberton' },
    { name: 'Ashford Household', primary: 'Frank Ashford', secondary: 'Rose Ashford' },
    { name: 'Crawford Household', primary: 'Edward Crawford', secondary: 'Grace Crawford' },
    { name: 'Wellington Household', primary: 'Victor Wellington', secondary: 'Audrey Wellington' },
    { name: 'Hamilton Household', primary: 'Stuart Hamilton', secondary: 'Elaine Hamilton' },
    { name: 'Donovan Household', primary: 'Patrick Donovan' },
    { name: 'Callahan Household', primary: 'Mark Callahan', secondary: 'Theresa Callahan' },
    { name: 'Fitzgerald Household', primary: 'Kevin Fitzgerald', secondary: 'Maureen Fitzgerald' },
    { name: 'Sinclaire Family Trust', primary: 'Gerald Sinclaire', secondary: 'Dorothy Sinclaire' },
    { name: 'MacKenzie Household', primary: 'Ian MacKenzie', secondary: 'Fiona MacKenzie' },
    { name: 'Holt Household', primary: 'Raymond Holt', secondary: 'Kevin Cozner' },
    { name: 'Stratford Household', primary: 'Miles Stratford' },
    { name: 'Barrington Household', primary: 'Reginald Barrington', secondary: 'Penelope Barrington' },
    { name: 'Covington Household', primary: 'Charles Covington', secondary: 'Beatrice Covington' },
    { name: 'Dupont Household', primary: 'Henri Dupont', secondary: 'Marie Dupont' },
    { name: 'Waverly Household', primary: 'Donald Waverly' },
    { name: 'Aldridge Household', primary: 'Harold Aldridge', secondary: 'Evelyn Aldridge' },
    { name: 'Blackwood Household', primary: 'Jonathan Blackwood' },
    { name: 'Carrington Household', primary: 'Blake Carrington', secondary: 'Krystle Carrington' },
    { name: 'Devereaux Household', primary: 'Dominique Devereaux' },
    { name: 'Eastwood Household', primary: 'Clint Eastwood' },
    { name: 'Faulkner Household', primary: 'William Faulkner', secondary: 'Estelle Faulkner' },
    { name: 'Grantham Household', primary: 'Robert Grantham', secondary: 'Cora Grantham' },
    { name: 'Hampton Household', primary: 'Clifford Hampton', secondary: 'Marian Hampton' },
    { name: 'Ingram Household', primary: 'Leonard Ingram' },
    { name: 'Jennings Household', primary: 'Peter Jennings', secondary: 'Kayce Jennings' },
    { name: 'Kendall Household', primary: 'Roy Kendall', secondary: 'Logan Kendall' },
    { name: 'Lancaster Household', primary: 'Burt Lancaster', secondary: 'Norma Lancaster' },
    { name: 'Monroe Household', primary: 'Harrison Monroe' },
    { name: 'Norris Household', primary: 'Dean Norris', secondary: 'Bridget Norris' },
    { name: 'Oakley Household', primary: 'Russell Oakley', secondary: 'Annie Oakley' },
    { name: 'Pendleton Household', primary: 'Preston Pendleton' },
    { name: 'Quincy Household', primary: 'John Quincy', secondary: 'Abigail Quincy' },
    { name: 'Radcliffe Household', primary: 'Daniel Radcliffe' },
    { name: 'Stanhope Household', primary: 'Oliver Stanhope', secondary: 'Gwendolyn Stanhope' },
    { name: 'Trevor Household', primary: 'Colin Trevor' },
    { name: 'Underwood Household', primary: 'Francis Underwood', secondary: 'Claire Underwood' },
    { name: 'Vandermeer Household', primary: 'Peter Vandermeer', secondary: 'Greta Vandermeer' },
    { name: 'Wakefield Household', primary: 'Julian Wakefield' },
    { name: 'Yardley Household', primary: 'Giles Yardley', secondary: 'Lavinia Yardley' },
    { name: 'Zimmerman Household', primary: 'Howard Zimmerman', secondary: 'Brenda Zimmerman' },
    { name: 'Abbott Household', primary: 'Craig Abbott', secondary: 'Sarah Abbott' },
    { name: 'Beckett Household', primary: 'Samuel Beckett' },
    { name: 'Carlisle Household', primary: 'Anthony Carlisle', secondary: 'Diana Carlisle' },
    { name: 'Dunbar Household', primary: 'Gordon Dunbar' },
    { name: 'Ellington Household', primary: 'Duke Ellington', secondary: 'Edna Ellington' },
    { name: 'Ferguson Household', primary: 'Colin Ferguson', secondary: 'Amanda Ferguson' },
    { name: 'Gifford Household', primary: 'Frank Gifford', secondary: 'Kathie Gifford' },
    { name: 'Holloway Household', primary: 'Lucas Holloway' },
    { name: 'Irving Household', primary: 'John Irving', secondary: 'Janet Irving' },
    { name: 'Jenkins Family Trust', primary: 'Wallace Jenkins', secondary: 'Loretta Jenkins' },
    { name: 'Kingston Household', primary: 'Trevor Kingston' },
    { name: 'Lockwood Household', primary: 'Julian Lockwood', secondary: 'Cynthia Lockwood' }
  ];

  // We have 82 households.
  // Household distribution of accounts:
  // - 1 household with 4 accounts = 4
  // - 26 households with 3 accounts = 78
  // - 48 households with 2 accounts = 96
  // - 7 households with 1 account = 7
  // Total: 1 + 26 + 48 + 7 = 82 households, 4 + 78 + 96 + 7 = 185 accounts.
  const hhAccountCounts: number[] = [
    4, // index 0 (1 hh with 4 accounts)
    ...Array(26).fill(3), // index 1 to 26 (26 hh with 3 accounts)
    ...Array(48).fill(2), // index 27 to 74 (48 hh with 2 accounts)
    ...Array(7).fill(1)   // index 75 to 81 (7 hh with 1 account)
  ];

  // Raw account definitions pool (185 total)
  // Let's create an exact list of 185 account templates with types and issue tags
  const rawAccounts: Array<{
    nameSuffix: string;
    type: string;
    registration: string;
    baseVal: number;
    issueType?: 'trust_doc' | 'retire_ben' | 'ach_bank' | 'inh_ira' | 'adv_agree' | 'entity_auth';
    groupTier?: '100' | '90s' | '70s_80s' | 'cleanup';
  }> = [];

  // 1. The 4 Trust Accounts with Issues:
  rawAccounts.push({ nameSuffix: 'Revocable Living Trust', type: 'Trust', registration: 'Trust', baseVal: 850000, issueType: 'trust_doc', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Family Trust Account', type: 'Trust', registration: 'Trust', baseVal: 620000, issueType: 'trust_doc', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Irrevocable Dynasty Trust', type: 'Trust', registration: 'Trust', baseVal: 1100000, issueType: 'trust_doc', groupTier: 'cleanup' });
  rawAccounts.push({ nameSuffix: '2018 Asset Trust', type: 'Trust', registration: 'Trust', baseVal: 740000, issueType: 'trust_doc', groupTier: 'cleanup' });

  // 7 Clean Trust Accounts: (along with 1 trust in adv_agree = 12 total trusts)
  for (let i = 1; i <= 7; i++) {
    rawAccounts.push({ nameSuffix: `Living Trust #${i}`, type: 'Trust', registration: 'Trust', baseVal: 450000 + (i * 25000), groupTier: i <= 5 ? '100' : '90s' });
  }

  // 2. The 6 Retirement Accounts with Beneficiary Review Issue:
  rawAccounts.push({ nameSuffix: 'Roth IRA Account', type: 'Roth IRA', registration: 'Roth IRA', baseVal: 320000, issueType: 'retire_ben', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Traditional IRA Account', type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 480000, issueType: 'retire_ben', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Rollover IRA Account', type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 540000, issueType: 'retire_ben', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'SEP IRA Account', type: 'SEP IRA', registration: 'SEP IRA', baseVal: 290000, issueType: 'retire_ben', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Retirement Rollover IRA', type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 410000, issueType: 'retire_ben', groupTier: '70s_80s' });
  rawAccounts.push({ nameSuffix: 'Premier Roth IRA', type: 'Roth IRA', registration: 'Roth IRA', baseVal: 275000, issueType: 'retire_ben', groupTier: '70s_80s' });

  // 3. The 5 ACH Relationships needing bank verification:
  rawAccounts.push({ nameSuffix: 'Joint Banking Taxable', type: 'Joint Taxable', registration: 'Joint', baseVal: 380000, issueType: 'ach_bank', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Individual Cash Flow Taxable', type: 'Individual Taxable', registration: 'Individual', baseVal: 220000, issueType: 'ach_bank', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Distribution Traditional IRA', type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 310000, issueType: 'ach_bank', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Joint ACH Taxable', type: 'Joint Taxable', registration: 'Joint', baseVal: 290000, issueType: 'ach_bank', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Primary Individual Taxable', type: 'Individual Taxable', registration: 'Individual', baseVal: 245000, issueType: 'ach_bank', groupTier: '90s' });

  // 4. The 3 Inherited IRAs needing documentation review:
  rawAccounts.push({ nameSuffix: 'Inherited IRA Account', type: 'Inherited IRA', registration: 'Inherited IRA', baseVal: 340000, issueType: 'inh_ira', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Beneficiary Inherited Roth IRA', type: 'Inherited IRA', registration: 'Inherited IRA', baseVal: 210000, issueType: 'inh_ira', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Family Inherited IRA', type: 'Inherited IRA', registration: 'Inherited IRA', baseVal: 285000, issueType: 'inh_ira', groupTier: '90s' });

  // 3 Clean Inherited IRAs:
  for (let i = 1; i <= 3; i++) {
    rawAccounts.push({ nameSuffix: `Inherited IRA #${i}`, type: 'Inherited IRA', registration: 'Inherited IRA', baseVal: 180000 + i * 20000, groupTier: i === 1 ? '100' : '90s' });
  }

  // 5. The 4 Advisory Agreements needing confirmation:
  rawAccounts.push({ nameSuffix: 'Growth Individual Taxable', type: 'Individual Taxable', registration: 'Individual', baseVal: 360000, issueType: 'adv_agree', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Balanced Joint Taxable', type: 'Joint Taxable', registration: 'Joint', baseVal: 420000, issueType: 'adv_agree', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Core Traditional IRA', type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 395000, issueType: 'adv_agree', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Strategic Trust Account', type: 'Trust', registration: 'Trust', baseVal: 580000, issueType: 'adv_agree', groupTier: '90s' });

  // 6. The 2 Entity Accounts needing updated authority documentation:
  rawAccounts.push({ nameSuffix: 'Holdings Operating Account', type: 'LLC', registration: 'LLC', baseVal: 720000, issueType: 'entity_auth', groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Corporate Treasury Account', type: 'Corporate', registration: 'Corporate', baseVal: 840000, issueType: 'entity_auth', groupTier: '90s' });

  // 4 Clean Entity Accounts:
  rawAccounts.push({ nameSuffix: 'Commercial Real Estate LLC', type: 'LLC', registration: 'LLC', baseVal: 650000, groupTier: '100' });
  rawAccounts.push({ nameSuffix: 'Consulting Group LLC', type: 'LLC', registration: 'LLC', baseVal: 490000, groupTier: '90s' });
  rawAccounts.push({ nameSuffix: 'Capital Ventures LLC', type: 'LLC', registration: 'LLC', baseVal: 530000, groupTier: '100' });
  rawAccounts.push({ nameSuffix: 'Management Corporation', type: 'Corporate', registration: 'Corporate', baseVal: 610000, groupTier: '90s' });

  // Remaining Retirement Accounts:
  // 40 clean Trad IRA, 20 clean Roth IRA, 3 clean SEP IRA = 63 accounts.
  for (let i = 1; i <= 40; i++) {
    const tier = i <= 12 ? '100' : (i <= 27 ? '90s' : (i <= 37 ? '70s_80s' : 'cleanup'));
    rawAccounts.push({ nameSuffix: `Traditional IRA #${i}`, type: 'Traditional / Rollover IRA', registration: 'Traditional IRA', baseVal: 190000 + (i * 3500), groupTier: tier });
  }
  for (let i = 1; i <= 20; i++) {
    const tier = i <= 6 ? '100' : (i <= 14 ? '90s' : (i <= 18 ? '70s_80s' : 'cleanup'));
    rawAccounts.push({ nameSuffix: `Roth IRA #${i}`, type: 'Roth IRA', registration: 'Roth IRA', baseVal: 140000 + (i * 4000), groupTier: tier });
  }
  for (let i = 1; i <= 3; i++) {
    rawAccounts.push({ nameSuffix: `SEP IRA Plan #${i}`, type: 'SEP IRA', registration: 'SEP IRA', baseVal: 220000 + (i * 15000), groupTier: i === 1 ? '100' : '90s' });
  }

  // 7 529 Education Accounts:
  for (let i = 1; i <= 7; i++) {
    rawAccounts.push({ nameSuffix: `529 College Savings #${i}`, type: '529', registration: '529', baseVal: 65000 + (i * 5000), groupTier: i <= 3 ? '100' : (i <= 6 ? '90s' : '70s_80s') });
  }

  // 3 Annuity Accounts:
  for (let i = 1; i <= 3; i++) {
    rawAccounts.push({ nameSuffix: `Fixed Index Annuity #${i}`, type: 'Annuity', registration: 'Annuity', baseVal: 210000 + (i * 20000), groupTier: i === 1 ? '100' : '90s' });
  }

  // Remaining Taxable Accounts:
  // 52 clean Individual, 22 clean Joint = 74 accounts.
  for (let i = 1; i <= 52; i++) {
    const tier = i <= 14 ? '100' : (i <= 32 ? '90s' : (i <= 48 ? '70s_80s' : 'cleanup'));
    rawAccounts.push({ nameSuffix: `Individual Taxable #${i}`, type: 'Individual Taxable', registration: 'Individual', baseVal: 175000 + (i * 3000), groupTier: tier });
  }
  for (let i = 1; i <= 22; i++) {
    const tier = i <= 6 ? '100' : (i <= 14 ? '90s' : (i <= 20 ? '70s_80s' : 'cleanup'));
    rawAccounts.push({ nameSuffix: `Joint Taxable #${i}`, type: 'Joint Taxable', registration: 'Joint', baseVal: 230000 + (i * 5000), groupTier: tier });
  }

  console.log(`Total accounts in raw pool: ${rawAccounts.length}`);
  if (rawAccounts.length !== 185) {
    throw new Error(`Expected exactly 185 accounts, got ${rawAccounts.length}`);
  }

  // Scale Account Values to sum to exactly $42,000,000
  const TARGET_TOTAL_AUM = 42000000;
  const currentSum = rawAccounts.reduce((s, a) => s + a.baseVal, 0);
  const scale = TARGET_TOTAL_AUM / currentSum;

  let scaledSum = 0;
  const finalAccountValues: number[] = rawAccounts.map((a, idx) => {
    if (idx === rawAccounts.length - 1) return 0; // Will be set to balance perfectly
    const rounded = Math.round((a.baseVal * scale) / 100) * 100;
    scaledSum += rounded;
    return rounded;
  });
  finalAccountValues[rawAccounts.length - 1] = TARGET_TOTAL_AUM - scaledSum;

  const verifiedTotalAum = finalAccountValues.reduce((s, v) => s + v, 0);
  console.log(`Scaled Account Values Total: $${verifiedTotalAum.toLocaleString()} (Target: $${TARGET_TOTAL_AUM.toLocaleString()})`);

  // Distribute accounts across the 82 households
  const TARGET_TOTAL_REV = 460000;
  const dbHouseholds: any[] = [];
  const dbAccounts: any[] = [];

  let accCursor = 0;
  const householdAumList: number[] = [];

  // Calculate each household's AUM first
  for (let hIdx = 0; hIdx < 82; hIdx++) {
    const count = hhAccountCounts[hIdx];
    let hhAum = 0;
    for (let c = 0; c < count; c++) {
      hhAum += finalAccountValues[accCursor + c];
    }
    householdAumList.push(hhAum);
    accCursor += count;
  }

  // Calculate proportional household revenue summing to exactly $460,000
  let runningRevSum = 0;
  const householdRevList: number[] = householdAumList.map((hhAum, idx) => {
    if (idx === 81) return 0; // Balance last
    const rev = Math.round((hhAum / TARGET_TOTAL_AUM) * TARGET_TOTAL_REV * 100) / 100;
    runningRevSum += rev;
    return rev;
  });
  householdRevList[81] = Math.round((TARGET_TOTAL_REV - runningRevSum) * 100) / 100;

  console.log(`Scaled Household Revenues Total: $${householdRevList.reduce((s, r) => s + r, 0).toLocaleString()} (Target: $${TARGET_TOTAL_REV.toLocaleString()})\n`);

  // Insert Households and Accounts into DB
  accCursor = 0;
  for (let hIdx = 0; hIdx < 82; hIdx++) {
    const hhInfo = householdNames[hIdx] || { name: `Household #${hIdx + 1}`, primary: `Client ${hIdx + 1}`, secondary: undefined };
    const hhAum = householdAumList[hIdx];
    const hhRev = householdRevList[hIdx];
    const count = hhAccountCounts[hIdx];

    const email = `${hhInfo.primary.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
    const phone = `(480) 555-01${(hIdx + 10).toString().padStart(2, '0')}`;
    const address = `${100 + hIdx * 15} Camelback Rd, Scottsdale, AZ 85251`;

    const hh = await prisma.household.create({
      data: {
        advisorId: advisor.id,
        name: hhInfo.name,
        primaryClientName: hhInfo.primary,
        secondaryClientName: hhInfo.secondary || null,
        totalAum: Math.round((hhAum / 1000000) * 10000) / 10000, // Millions
        revenue: hhRev,
        email,
        phone,
        address,
        readinessStatus: 'Not Reviewed',
        notes: `Redtail CRM Contact ID: #RT-${3000 + hIdx}. Client since 2019. Address verified 09/2026. Risk review date: 09/15/2026. Trusted contact on file: yes.`
      }
    });

    dbHouseholds.push(hh);

    for (let c = 0; c < count; c++) {
      const rawAcc = rawAccounts[accCursor];
      const accVal = finalAccountValues[accCursor];
      const accName = `${hhInfo.name.replace(' Household', '')} ${rawAcc.nameSuffix}`;

      let accCrmNotes = 'Redtail CRM Account Record. Primary custodian: Fidelity.';
      if (rawAcc.type.includes('Trust')) {
        accCrmNotes += ' Trust agreement and certificate on file. Redtail Doc #TR-402.';
      } else if (rawAcc.type.includes('IRA')) {
        accCrmNotes += ' IRA application and beneficiary designation verified on file.';
      } else if (rawAcc.type.includes('LLC') || rawAcc.type.includes('Corporate')) {
        accCrmNotes += ' Entity articles and authorized signers documentation on file.';
      }

      const acc = await prisma.account.create({
        data: {
          householdId: hh.id,
          name: accName,
          type: rawAcc.type,
          value: accVal,
          custodian: 'Fidelity',
          registration: rawAcc.registration,
          readinessStatus: 'Not Reviewed',
          notes: accCrmNotes
        }
      });

      dbAccounts.push({
        ...acc,
        issueType: rawAcc.issueType,
        groupTier: rawAcc.groupTier
      });

      accCursor++;
    }
  }

  console.log(`Inserted ${dbHouseholds.length} Households and ${dbAccounts.length} Accounts in database.`);

  // 5. Run Initial Evaluation Pipeline
  // This evaluates account requirement profiles, creating applicable checklist items
  console.log('\nRunning Initial Know Your Book Evaluation Pipeline...');
  await runEvaluationPipeline(advisor.id, 'Demo Seed Initial');

  // 6. Fetch Generated Checklist Items & Apply Realistic Distribution & Specific Issues
  console.log('\nApplying realistic checklist status distribution and targeted issues...');
  const allItems = await prisma.accountChecklistItem.findMany({
    where: {
      account: {
        household: {
          advisorId: advisor.id
        }
      }
    }
  });

  const paperworkKeys = [
    'banking_achAuthorization', 'banking_voidedCheck', 'banking_standingInstructions',
    'doc_advisoryAgreement', 'doc_accountApplication', 'doc_beneficiaryDesignation', 'doc_transferRestrictions',
    'trust_certification', 'trust_trusteePages', 'trust_successorTrustee', 'trust_taxId',
    'entity_articles', 'entity_operatingAgreement', 'entity_ein', 'entity_resolution', 'entity_signers',
    'estate_deathCertificate', 'estate_letters', 'estate_executor', 'power_poa', 'power_guardianship', 'power_conservatorship',
    'retire_ira', 'retire_inheritedIra', 'retire_beneficiary', 'retire_rmd', 'special_annuities', 'special_alts', 'special_directBusiness', 'special_restrictedAssets'
  ];

  let trustIssueCount = 0;
  let retireIssueCount = 0;
  let achIssueCount = 0;
  let inhIssueCount = 0;
  let advIssueCount = 0;
  let entityIssueCount = 0;

  for (const acc of dbAccounts) {
    const accItems = allItems.filter(item => item.accountId === acc.id);
    const issueType = acc.issueType;
    const tier = acc.groupTier || '90s';

    for (const item of accItems) {
      let status = item.status;
      let notes = item.notes;

      // Check if this item is targeted by one of the 6 realistic issues
      let isTargetedDeficiency = false;

      // Issue 1: 4 trust accounts needing updated trust documentation
      if (issueType === 'trust_doc') {
        if (item.itemKey === 'trust_certification') {
          if (tier === 'cleanup') {
            status = 'Missing';
            notes = 'Missing current Certification of Trust from legal binder.';
          } else {
            status = 'Needs Attention';
            notes = 'Trust certification on file is dated > 5 years ago; updated certification required by custodian.';
          }
          isTargetedDeficiency = true;
          trustIssueCount++;
        } else if (item.itemKey === 'trust_successorTrustee' && tier === 'cleanup') {
          status = 'Missing';
          notes = 'Successor trustee appointment documentation missing from file.';
          isTargetedDeficiency = true;
        }
      }

      // Issue 2: 6 retirement accounts needing beneficiary review
      else if (issueType === 'retire_ben') {
        if (item.itemKey === 'retire_beneficiary') {
          status = 'Needs Attention';
          notes = 'Beneficiary designation requires annual review and confirmation with client.';
          isTargetedDeficiency = true;
          retireIssueCount++;
        } else if (item.itemKey === 'doc_beneficiaryDesignation' && tier === '70s_80s') {
          status = 'Needs Attention';
          notes = 'Physical beneficiary designation form on file missing secondary contingent share allocation.';
          isTargetedDeficiency = true;
        }
      }

      // Issue 3: 5 ACH relationships needing bank verification
      else if (issueType === 'ach_bank') {
        if (item.itemKey === 'banking_voidedCheck') {
          status = 'Needs Attention';
          notes = 'ACH relationship active but missing voided check or official bank verification letter.';
          isTargetedDeficiency = true;
          achIssueCount++;
        }
      }

      // Issue 4: 3 inherited IRAs needing documentation review
      else if (issueType === 'inh_ira') {
        if (item.itemKey === 'retire_inheritedIra') {
          status = 'Needs Attention';
          notes = 'Inherited IRA documentation requires review for decedent date of death and SECURE Act 10-year distribution schedule verification.';
          isTargetedDeficiency = true;
          inhIssueCount++;
        }
      }

      // Issue 5: 4 advisory agreements needing confirmation
      else if (issueType === 'adv_agree') {
        if (item.itemKey === 'doc_advisoryAgreement') {
          status = 'Needs Attention';
          notes = 'Advisory agreement on file requires client confirmation of updated fee schedule addendum.';
          isTargetedDeficiency = true;
          advIssueCount++;
        }
      }

      // Issue 6: 2 entity accounts needing updated authority documentation
      else if (issueType === 'entity_auth') {
        if (item.itemKey === 'entity_resolution') {
          status = 'Needs Attention';
          notes = 'Operating agreement on file requires updated corporate resolution identifying current authorized signers.';
          isTargetedDeficiency = true;
          entityIssueCount++;
        }
      }

      // If not a targeted deficiency, apply realistic distribution tier
      if (!isTargetedDeficiency) {
        const isPaperwork = paperworkKeys.some(k => item.itemKey.toLowerCase() === k.toLowerCase());

        if (tier === '100') {
          // Fully complete account: all paperwork verified
          if (isPaperwork) {
            status = 'Verified';
            notes = 'Audited and verified document completeness.';
          } else if (item.status !== 'Verified') {
            status = 'Verified';
            notes = 'CRM client profile record audited and verified.';
          }
        } else if (tier === '90s') {
          // High-performing account: paperworks verified, 1 optional non-critical item needs attention
          if (isPaperwork) {
            status = 'Verified';
            notes = 'Audited and verified document completeness.';
          } else if (item.itemKey === 'client_trustedContact') {
            status = 'Needs Attention';
            notes = 'Client opted out or has not yet designated an emergency trusted contact person.';
          }
        } else if (tier === '70s_80s') {
          // Sub-tier split based on account index to span both 80s and 70s
          const isLowerSeventies = acc.name.includes('#3') || acc.name.includes('#7') || acc.name.includes('#9') || acc.name.includes('Premier') || acc.name.includes('Retirement');
          if (isLowerSeventies) {
            // 70s bracket: 1 critical item missing (-15 penalty) + 1 minor attention
            if (item.itemKey === 'doc_accountApplication') {
              status = 'Missing';
              notes = 'Custodial account application document signature missing from transition archive.';
            } else if (item.itemKey === 'client_trustedContact') {
              status = 'Needs Attention';
              notes = 'Client has not designated a trusted contact.';
            } else if (isPaperwork) {
              status = 'Verified';
              notes = 'Audited and verified document completeness.';
            }
          } else {
            // 80s bracket: 4-5 non-critical KYC/Client items needing attention (mult 0.5)
            if (['client_trustedContact', 'kyc_lastReview', 'kyc_riskTolerance', 'kyc_investmentObjectives'].includes(item.itemKey)) {
              status = 'Needs Attention';
              notes = 'Profile information requires refresh during transition onboarding.';
            } else if (isPaperwork) {
              status = 'Verified';
              notes = 'Audited and verified document completeness.';
            }
          }
        } else if (tier === 'cleanup') {
          // Significant cleanup account (40s-59%): 2 critical paperwork items missing + KYC attention
          if (['doc_advisoryAgreement', 'doc_accountApplication'].includes(item.itemKey)) {
            status = 'Missing';
            notes = 'Critical account agreement document missing wet or digital signature archive.';
          } else if (item.itemKey === 'trust_certification' && acc.type === 'Trust') {
            status = 'Missing';
            notes = 'Missing current Certification of Trust.';
          } else if (['client_trustedContact', 'kyc_lastReview'].includes(item.itemKey)) {
            status = 'Needs Attention';
            notes = 'Account documentation requires comprehensive remediation.';
          } else if (isPaperwork) {
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

  // 7. Re-run Evaluation Pipeline to dynamically calculate all scores and synchronize findings
  console.log('\nRunning Final Know Your Book Evaluation Pipeline to calculate real scores and findings...');
  await runEvaluationPipeline(advisor.id, 'Demo Seed Final');

  // 8. Verification & Summary Audit Report
  console.log('\n========================================================================');
  console.log('--- COMPREHENSIVE AUDIT VERIFICATION REPORT: DANIEL HARPER ---');
  console.log('========================================================================\n');

  const finalAdvisor = await prisma.advisor.findUniqueOrThrow({
    where: { id: advisor.id },
    include: {
      householdRecords: {
        include: { accounts: true }
      },
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  const finalAssessment = finalAdvisor.assessments[0];
  const finalAccounts = finalAdvisor.householdRecords.flatMap(h => h.accounts);
  const finalChecklist = await prisma.accountChecklistItem.findMany({
    where: {
      account: {
        household: {
          advisorId: advisor.id
        }
      }
    },
    include: { requirement: true }
  });

  const finalFindings = await prisma.finding.findMany({
    where: { assessmentId: finalAssessment?.id }
  });

  // Calculate Account Score Distribution
  // Let's compute ARS for each account using the same formula
  const accountScoreBuckets: Record<string, number> = {
    '100%': 0,
    '90-99%': 0,
    '80-89%': 0,
    '70-79%': 0,
    '60-69%': 0,
    '<60% (Significant Cleanup)': 0
  };

  const accountScoresList: number[] = [];

  for (const acc of finalAccounts) {
    const accItems = finalChecklist.filter(item => item.accountId === acc.id);
    let totalWeight = 0;
    let weightedSum = 0;
    let missingCritical = 0;

    accItems.forEach(item => {
      if (item.status === 'Not Applicable') return;
      const weight = item.requirement?.weight ?? 1.0;
      totalWeight += weight;

      let mult = 0.0;
      if (['Present', 'Verified', 'Inferred'].includes(item.status)) mult = 1.0;
      else if (['Needs Attention', 'Unknown', 'Needs Review'].includes(item.status)) mult = 0.5;
      else if (item.status === 'Missing') {
        mult = 0.0;
        if (item.requirement?.critical) missingCritical++;
      }
      weightedSum += weight * mult;
    });

    const cs = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 100;
    const ars = Math.max(0, Math.min(100, Math.round(cs - missingCritical * 15)));
    accountScoresList.push(ars);

    if (ars === 100) accountScoreBuckets['100%']++;
    else if (ars >= 90) accountScoreBuckets['90-99%']++;
    else if (ars >= 80) accountScoreBuckets['80-89%']++;
    else if (ars >= 70) accountScoreBuckets['70-79%']++;
    else if (ars >= 60) accountScoreBuckets['60-69%']++;
    else accountScoreBuckets['<60% (Significant Cleanup)']++;
  }

  // Findings by Category
  const findingsByCategory: Record<string, number> = {};
  const findingsBySeverity: Record<string, number> = {};
  finalFindings.forEach(f => {
    findingsByCategory[f.category] = (findingsByCategory[f.category] || 0) + 1;
    findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
  });

  // Account Type Counts
  const accTypeCounts: Record<string, number> = {};
  finalAccounts.forEach(a => {
    accTypeCounts[a.type] = (accTypeCounts[a.type] || 0) + 1;
  });

  console.log(`Advisor Name:           ${finalAdvisor.name}`);
  console.log(`Firm:                   ${finalAdvisor.firmName}`);
  console.log(`Custodian:              ${finalAdvisor.currentCustodian} (Target: Fidelity)`);
  console.log(`CRM:                    ${finalAdvisor.crm} (Target: Redtail)`);
  console.log(`AUM:                    $${(finalAdvisor.totalAum || 0).toFixed(1)}M (Target: $42.0M)`);
  console.log(`Annual Revenue:         $${(finalAdvisor.annualRevenue || 0).toLocaleString()} (Target: $460,000)`);
  console.log(`Households Count:       ${finalAdvisor.households} (Target: 82)`);
  console.log(`Accounts Count:         ${finalAdvisor.accounts} (Target: 185)`);
  console.log(`Overall Readiness (KYBI): ${finalAssessment?.overallReadinessScore}%`);
  console.log(`Client Data Score:      ${finalAssessment?.clientDataScore}%`);
  console.log(`KYC Doc Score:          ${finalAssessment?.kycDocumentationScore}%\n`);

  console.log('--- ACCOUNT TYPE DISTRIBUTION ---');
  Object.entries(accTypeCounts).forEach(([type, count]) => {
    console.log(`  - ${type.padEnd(28)}: ${count} accounts`);
  });

  console.log('\n--- ACCOUNT READINESS SCORE (ARS) DISTRIBUTION ---');
  Object.entries(accountScoreBuckets).forEach(([bucket, count]) => {
    const pct = ((count / finalAccounts.length) * 100).toFixed(1);
    console.log(`  - ${bucket.padEnd(28)}: ${count.toString().padStart(3)} accounts (${pct}%)`);
  });

  console.log('\n--- VERIFICATION OF SPECIFIC REQUIRED ISSUES ---');
  console.log(`  1. Trust accounts needing updated trust doc:       4 (Injected: ${trustIssueCount})`);
  console.log(`  2. Retirement accounts needing beneficiary review: 6 (Injected: ${retireIssueCount})`);
  console.log(`  3. ACH relationships needing bank verification:    5 (Injected: ${achIssueCount})`);
  console.log(`  4. Inherited IRAs needing documentation review:    3 (Injected: ${inhIssueCount})`);
  console.log(`  5. Advisory agreements needing confirmation:       4 (Injected: ${advIssueCount})`);
  console.log(`  6. Entity accounts needing authority documentation: 2 (Injected: ${entityIssueCount})\n`);

  console.log('--- FINDINGS GENERATED (Missing / Needs Attention only) ---');
  console.log(`  Total Findings: ${finalFindings.length}`);
  console.log('  By Severity:');
  Object.entries(findingsBySeverity).forEach(([sev, count]) => {
    console.log(`    - ${sev.padEnd(12)}: ${count}`);
  });
  console.log('  By Category:');
  Object.entries(findingsByCategory).forEach(([cat, count]) => {
    console.log(`    - ${cat.padEnd(20)}: ${count}`);
  });

  console.log('\n🎉 SYNTHETIC DEMO SEED FOR DANIEL HARPER COMPLETED SUCCESSFULLY.');
}

main()
  .catch(e => {
    console.error('Error seeding Daniel Harper demo advisor:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
