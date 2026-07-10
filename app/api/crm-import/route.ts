import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { runEvaluationPipeline } from '@/lib/evaluation-pipeline';


function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== '')) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      lines.push(row);
    }
  }
  return lines;
}

function maskAccountNumbers(str: string): string {
  if (!str) return '';
  return str.replace(/\b[A-Za-z0-9-]{6,20}\b/g, (match) => {
    // If it is pure numbers or mixed alphanumerics of length >= 6, mask it
    if (/^\d+$/.test(match) || (/\d/.test(match) && /[A-Za-z]/.test(match))) {
      return '********';
    }
    return match;
  });
}

function classifyAccountType(mappedType: string, registration: string): string {
  const text = (mappedType + ' ' + registration).toLowerCase();
  
  if (text.includes('roth') && text.includes('ira')) return 'Roth IRA';
  if (text.includes('inherited') && text.includes('ira')) return 'Inherited IRA';
  if (text.includes('sep') && text.includes('ira')) return 'SEP IRA';
  if (text.includes('simple') && text.includes('ira')) return 'SIMPLE IRA';
  if (text.includes('ira')) return 'IRA';
  
  if (text.includes('joint') || text.includes('jtwros') || text.includes('tenants in common') || text.includes('jten')) return 'Joint';
  if (text.includes('individual') || text.includes('tod') || text.includes('single') || text.includes('indv')) return 'Individual';
  
  if (text.includes('trust') || text.includes('u/a') || text.includes('tr ')) return 'Trust';
  if (text.includes('estate') || text.includes('deceased') || text.includes('u/w')) return 'Estate';
  if (text.includes('401k') || text.includes('401(k)') || text.includes('profit sharing') || text.includes('keogh') || text.includes('solo k')) return '401(k)';
  if (text.includes('529') || text.includes('college savings')) return '529';
  if (text.includes('llc') || text.includes('corp') || text.includes('entity') || text.includes('business') || text.includes('partnership')) return 'Entity';
  if (text.includes('annuity') || text.includes('variable annuity') || text.includes('fixed annuity')) return 'Annuity';
  if (text.includes('alternative') || text.includes('alt') || text.includes('private placement') || text.includes('reit') || text.includes('hedge fund') || text.includes('ltd')) return 'Alternative Investment';
  if (text.includes('direct') || text.includes('direct business')) return 'Direct Business';
  
  return 'Other';
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rawCsv, mapping, advisorId, newAdvisorName, newAdvisorFirm, crmType } = body;

    if (!rawCsv || !mapping) {
      return NextResponse.json({ error: 'rawCsv and mapping are required' }, { status: 400 });
    }

    // 1. Resolve or create Advisor
    let advisor;
    if (advisorId) {
      advisor = await prisma.advisor.findUnique({
        where: { id: advisorId }
      });
    }

    if (!advisor) {
      if (!newAdvisorName || !newAdvisorFirm) {
        return NextResponse.json({ error: 'New Advisor Name and Firm are required if creating a new advisor.' }, { status: 400 });
      }
      advisor = await prisma.advisor.create({
        data: {
          name: newAdvisorName,
          firmName: newAdvisorFirm,
          businessModel: 'RIA',
          protocolStatus: 'Yes',
          crm: crmType || 'Excel'
        }
      });
    }

    // 2. Parse CSV
    const parsedRows = parseCSV(rawCsv);
    if (parsedRows.length <= 1) {
      return NextResponse.json({ error: 'CSV file contains no data rows.' }, { status: 400 });
    }

    const headers = parsedRows[0].map(h => h.trim());
    const dataRows = parsedRows.slice(1);

    // Build header-to-index map
    const fieldIndexes: Record<string, number> = {};
    Object.entries(mapping).forEach(([field, headerName]) => {
      const idx = headers.indexOf(headerName as string);
      if (idx !== -1) {
        fieldIndexes[field] = idx;
      }
    });

    const getVal = (row: string[], field: string): string => {
      const idx = fieldIndexes[field];
      return idx !== undefined && row[idx] !== undefined ? row[idx] : '';
    };

    // 3. Process Rows and Group by Household
    const householdsMap = new Map<string, {
      name: string;
      primaryClient: string;
      secondaryClient: string;
      email: string;
      phone: string;
      address: string;
      notes: string[];
      accounts: {
        name: string;
        type: string;
        value: number | null;
        custodian: string;
        registration: string;
        notes: string;
      }[];
    }>();

    let skippedRows = 0;
    let missingRequiredCount = 0;

    dataRows.forEach((row, idx) => {
      const householdId = getVal(row, 'householdId');
      const hhName = getVal(row, 'householdName') || getVal(row, 'primaryClient');
      const primaryClient = getVal(row, 'primaryClient') || hhName;

      if (!hhName && !primaryClient) {
        skippedRows++;
        missingRequiredCount++;
        return;
      }

      // Unique grouping key
      const groupingKey = householdId
        ? `id:${householdId.toLowerCase().trim()}`
        : `name:${(hhName || primaryClient).toLowerCase().trim()}`;

      const secondaryClient = getVal(row, 'secondaryClient');
      const email = getVal(row, 'email');
      const phone = getVal(row, 'phone');
      const address = getVal(row, 'address');
      const notes = getVal(row, 'notes') || getVal(row, 'advisorNotes');

      const accName = getVal(row, 'accountName') || `${primaryClient}'s Account`;
      const rawType = getVal(row, 'accountType');
      const registration = getVal(row, 'registration');
      const custodian = getVal(row, 'custodian');
      
      const rawVal = getVal(row, 'estimatedValue').replace(/[$,]/g, '');
      const value = parseFloat(rawVal);
      const cleanVal = isNaN(value) ? null : value;

      const classifiedType = classifyAccountType(rawType, registration);

      if (!householdsMap.has(groupingKey)) {
        householdsMap.set(groupingKey, {
          name: maskAccountNumbers(hhName || primaryClient),
          primaryClient: maskAccountNumbers(primaryClient),
          secondaryClient: maskAccountNumbers(secondaryClient),
          email: maskAccountNumbers(email),
          phone: maskAccountNumbers(phone),
          address: maskAccountNumbers(address),
          notes: notes ? [maskAccountNumbers(notes)] : [],
          accounts: []
        });
      }

      const hh = householdsMap.get(groupingKey)!;
      if (notes && !hh.notes.includes(maskAccountNumbers(notes))) {
        hh.notes.push(maskAccountNumbers(notes));
      }

      hh.accounts.push({
        name: maskAccountNumbers(accName),
        type: classifiedType,
        value: cleanVal,
        custodian: maskAccountNumbers(custodian),
        registration: maskAccountNumbers(registration),
        notes: `Imported from ${crmType || 'CSV'}.`
      });
    });

    // 4. Load Active Requirements directly from the Requirement Library
    const activeRequirements = await prisma.requirementLibrary.findMany({
      where: { active: true }
    });

    // 5. Database Insertions
    let householdsCreated = 0;
    let accountsCreated = 0;
    let duplicateHouseholdsCount = 0;
    let duplicateAccountsCount = 0;
    let totalAum = 0;
    let totalRevenue = 0;

    let trustAccountsCount = 0;
    let iraAccountsCount = 0;
    let rothIraAccountsCount = 0;
    let inheritedIraAccountsCount = 0;
    let entityAccountsCount = 0;
    let estateAccountsCount = 0;
    let fiveTwoNineAccountsCount = 0;
    let annuityAccountsCount = 0;
    let altAccountsCount = 0;
    let employerRetirementAccountsCount = 0;
    let individualAccountsCount = 0;
    let jointAccountsCount = 0;
    let advisoryAccountsCount = 0;
    let brokerageAccountsCount = 0;
    let achInstructionsCount = 0;
    let rmdAgeCount = 0;
    const custodiansMap = new Map<string, number>();
    let specialHoldingsCount = 0;
    let potentialHighRiskAccountsCount = 0;

    for (const [key, data] of householdsMap.entries()) {
      // Check duplicate household
      let dbHousehold = await prisma.household.findFirst({
        where: {
          advisorId: advisor.id,
          name: { equals: data.name }
        }
      });

      if (dbHousehold) {
        duplicateHouseholdsCount++;
      } else {
        // Estimate revenue as 0.75% of total account value in household or default
        const hhAum = data.accounts.reduce((sum, acc) => sum + (acc.value || 0), 0);
        const estimatedRevenue = hhAum * 0.0075;

        dbHousehold = await prisma.household.create({
          data: {
            advisorId: advisor.id,
            name: data.name,
            primaryClientName: data.primaryClient,
            secondaryClientName: data.secondaryClient || null,
            totalAum: hhAum,
            revenue: estimatedRevenue,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            notes: data.notes.join('\n'),
            readinessStatus: 'Not Reviewed'
          }
        });
        householdsCreated++;
        totalRevenue += estimatedRevenue;
      }

      // Create accounts
      for (const acc of data.accounts) {
        // Check duplicate account in household
        const dbAccount = await prisma.account.findFirst({
          where: {
            householdId: dbHousehold.id,
            name: { equals: acc.name }
          }
        });

        if (dbAccount) {
          duplicateAccountsCount++;
          continue;
        }

        const newAccount = await prisma.account.create({
          data: {
            householdId: dbHousehold.id,
            name: acc.name,
            type: acc.type,
            value: acc.value,
            custodian: acc.custodian || null,
            registration: acc.registration || null,
            notes: acc.notes,
            readinessStatus: 'Not Reviewed'
          }
        });
        accountsCreated++;
        totalAum += acc.value || 0;

        // Statistics breakdowns
        if (acc.type === 'Trust') trustAccountsCount++;
        else if (acc.type === 'IRA') iraAccountsCount++;
        else if (acc.type === 'Roth IRA') rothIraAccountsCount++;
        else if (acc.type === 'Inherited IRA') inheritedIraAccountsCount++;
        else if (acc.type === 'Entity') entityAccountsCount++;
        else if (acc.type === 'Estate') estateAccountsCount++;
        else if (acc.type === '529') fiveTwoNineAccountsCount++;
        else if (acc.type === 'Annuity') annuityAccountsCount++;
        else if (acc.type === 'Alternative Investment') altAccountsCount++;
        else if (['401(k)', '403(b)', 'Keogh', 'Profit Sharing'].includes(acc.type)) employerRetirementAccountsCount++;
        else if (acc.type === 'Individual') individualAccountsCount++;
        else if (acc.type === 'Joint') jointAccountsCount++;
        
        if (['Annuity', 'Alternative Investment', 'Direct Business'].includes(acc.type)) {
          specialHoldingsCount++;
        }

        // Custodians represented
        const custName = (acc.custodian || 'Unknown').trim();
        if (custName) {
          custodiansMap.set(custName, (custodiansMap.get(custName) || 0) + 1);
        }

        // Advisory vs Brokerage
        const notesStr = (acc.notes || '').toLowerCase() + ' ' + (data.notes.join(' ')).toLowerCase();
        const regStr = (acc.registration || '').toLowerCase();
        const nameStr = (acc.name || '').toLowerCase();
        const typeStr = (acc.type || '').toLowerCase();

        const isAdvisory = [notesStr, regStr, nameStr, typeStr].some(s => 
          s.includes('advisory') || s.includes('managed') || s.includes('fee-based') || 
          s.includes('fee based') || s.includes('wrap') || s.includes('ria') || 
          s.includes('discretionary') || s.includes('fiduciary') || s.includes('billing')
        );
        if (isAdvisory) advisoryAccountsCount++;
        else brokerageAccountsCount++;

        // ACH Instructions
        const hasAch = [notesStr, regStr, nameStr].some(s =>
          s.includes('ach') || s.includes('banking') || s.includes('direct deposit') ||
          s.includes('standing instruction') || s.includes('periodic distribution') ||
          s.includes('eft') || s.includes('wire instruction') || s.includes('link bank')
        );
        if (hasAch) achInstructionsCount++;

        // RMD / Age 73+
        const hasRmdOrAge = notesStr.includes('age 73') || notesStr.includes('age 74') || 
                            notesStr.includes('age 75') || notesStr.includes('age 76') ||
                            notesStr.includes('age 77') || notesStr.includes('age 78') ||
                            notesStr.includes('age 79') || notesStr.includes('age 8') ||
                            notesStr.includes('born 195') || notesStr.includes('born 194') ||
                            notesStr.includes('born 193') || notesStr.includes('rmd') || 
                            notesStr.includes('required minimum');
        if (hasRmdOrAge) rmdAgeCount++;

        // Potential High Risk: value > $1.5M, or Alternative/Annuity holdings, or Estates
        if ((acc.value && acc.value > 1500000) || ['Alternative Investment', 'Annuity', 'Estate'].includes(acc.type)) {
          potentialHighRiskAccountsCount++;
        }
      }
    }

    // Get creator user name
    const creatorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = creatorUser ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() : session.name;

    // Run evaluation pipeline to generate checklists, findings, and compute scores
    await runEvaluationPipeline(advisor.id, userFullName || undefined);


    // Compile implied requirements
    const impliedRequirements = [];
    if (trustAccountsCount > 0) {
      impliedRequirements.push({
        title: 'Trust Documentation Required',
        description: `Verify fiduciary authority, successor trustees, and signature rules for ${trustAccountsCount} Trust accounts.`
      });
    }
    if (inheritedIraAccountsCount > 0) {
      impliedRequirements.push({
        title: 'Inherited IRA Documentation Required',
        description: `Verify successor status, original decedent details, and distribution schedules for ${inheritedIraAccountsCount} Inherited IRAs.`
      });
    }
    if (achInstructionsCount > 0) {
      impliedRequirements.push({
        title: 'Banking / ACH Documentation Required',
        description: `Verify standing linkages, banking credentials, and transfer authorizations for ${achInstructionsCount} accounts.`
      });
    }
    if (entityAccountsCount > 0) {
      impliedRequirements.push({
        title: 'Entity Authority Documentation Required',
        description: `Verify corporate resolutions, operating agreements, and signing officer authority for ${entityAccountsCount} entity accounts.`
      });
    }
    const retirementCount = iraAccountsCount + rothIraAccountsCount + inheritedIraAccountsCount + employerRetirementAccountsCount;
    if (retirementCount > 0) {
      impliedRequirements.push({
        title: 'Beneficiary Review Recommended',
        description: `Review designated primary and contingent beneficiaries for ${retirementCount} retirement accounts.`
      });
    }
    if (rmdAgeCount > 0) {
      impliedRequirements.push({
        title: 'RMD Review Recommended',
        description: `Audit year-to-date distributions and Required Minimum Distribution schedules for ${rmdAgeCount} aging clients (73+).`
      });
    }
    if (altAccountsCount > 0) {
      impliedRequirements.push({
        title: 'Alternative Asset Transfer Review Required',
        description: `Audit product eligibility, subscription terms, and custom transfer rules for ${altAccountsCount} alternative investments.`
      });
    }
    if (annuityAccountsCount > 0) {
      impliedRequirements.push({
        title: 'Annuity Contract Review Required',
        description: `Audit contract registration, rider provisions, and tax-deferred transfer pathways for ${annuityAccountsCount} annuities.`
      });
    }

    // Compile household-level transition evaluations
    const analyzedHouseholds = [];
    for (const [key, data] of householdsMap.entries()) {
      const accounts = data.accounts;
      const totalAum = accounts.reduce((sum, a) => sum + (a.value || 0), 0);
      const totalRevenue = totalAum * 0.0075;

      // 1. Household Composition
      let composition = 'Single Client';
      if (data.secondaryClient) {
        composition = 'Married Couple / Joint Household';
      } else if (data.name.toLowerCase().includes('trust')) {
        composition = 'Fiduciary Trust Entity';
      } else if (data.name.toLowerCase().includes('llc') || data.name.toLowerCase().includes('corp') || data.name.toLowerCase().includes('inc')) {
        composition = 'Business Entity';
      }

      // 2. Account Registrations
      const registrations = Array.from(new Set(accounts.map(a => a.registration).filter(Boolean)));

      // 3. Account Types
      const accountTypes = Array.from(new Set(accounts.map(a => a.type).filter(Boolean)));

      // 4. Custodians
      const custodians = Array.from(new Set(accounts.map(a => a.custodian).filter(Boolean)));

      // 5. Potential Transition Requirements (no "missing" assumption)
      const requirements = [];
      const hasTrust = accounts.some(a => a.type === 'Trust');
      const hasInherited = accounts.some(a => a.type === 'Inherited IRA');
      const hasEntity = accounts.some(a => a.type === 'Entity');
      const hasAnnuity = accounts.some(a => a.type === 'Annuity');
      const hasAlt = accounts.some(a => a.type === 'Alternative Investment');
      
      const notesStr = (data.notes.join(' ') + ' ' + accounts.map(a => a.notes).join(' ')).toLowerCase();
      const hasAch = notesStr.includes('ach') || notesStr.includes('banking') || notesStr.includes('direct deposit') || notesStr.includes('eft');
      const isAging = notesStr.includes('age 73') || notesStr.includes('age 74') || notesStr.includes('age 75') || notesStr.includes('born 195') || notesStr.includes('born 194') || notesStr.includes('rmd') || notesStr.includes('required minimum');

      if (hasTrust) requirements.push('Trustee Authorization & Certification');
      if (hasInherited) requirements.push('Inherited IRA Beneficiary Setup');
      if (hasEntity) requirements.push('Corporate Resolution & Officer Signing Authority');
      if (hasAnnuity) requirements.push('Annuity Contract Ownership Verification');
      if (hasAlt) requirements.push('Alternative Asset Custodian Clearance Review');
      if (hasAch) requirements.push('ACH Bank Authorization Transfer');
      if (accounts.some(a => ['IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', '401(k)'].includes(a.type))) {
        requirements.push('Retirement Account Beneficiary Designation');
      }

      // 6. Potential Transition Risks
      const risks = [];
      if (totalAum > 1500000) {
        risks.push('High-Value Asset Retention Risk (requires senior consultant touchpoint)');
      }
      if (isAging) {
        risks.push('Active RMD Schedule (requires distribution replication check)');
      }
      if (hasAlt) {
        risks.push('Alternative asset subject to custodian clearing pre-approval');
      }
      if (hasAnnuity) {
        risks.push('Annuity transfer requires coordination with insurance carrier');
      }
      if (accounts.some(a => a.type === 'Estate')) {
        risks.push('Estate account under executorship (requires executor authorization paperwork)');
      }
      if (risks.length === 0) {
        risks.push('No custom risks identified');
      }

      // 7. Transition Complexity
      let complexity = 'Low';
      if (hasAlt || hasAnnuity || accounts.some(a => a.type === 'Estate') || totalAum > 2000000) {
        complexity = 'High';
      } else if (hasTrust || hasEntity || accounts.length > 2) {
        complexity = 'Moderate';
      }

      analyzedHouseholds.push({
        name: data.name,
        primaryClient: data.primaryClient,
        composition,
        registrations,
        accountTypes,
        custodians,
        assets: totalAum,
        revenue: totalRevenue,
        requirements,
        risks,
        complexity
      });
    }

    // Custodians represented list
    const custodiansList = Array.from(custodiansMap.entries()).map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      advisorId: advisor.id,
      advisorName: advisor.name,
      stats: {
        householdsImported: householdsCreated,
        accountsImported: accountsCreated,
        estimatedAum: totalAum,
        estimatedRevenue: totalRevenue,
        trustAccounts: trustAccountsCount,
        iraAccounts: iraAccountsCount,
        inheritedIraAccounts: inheritedIraAccountsCount,
        entityAccounts: entityAccountsCount,
        estateAccounts: estateAccountsCount,
        specialHoldings: specialHoldingsCount,
        potentialHighRiskAccounts: potentialHighRiskAccountsCount,
        skippedRows,
        duplicateHouseholds: duplicateHouseholdsCount,
        duplicateAccounts: duplicateAccountsCount,
        missingRequired: missingRequiredCount
      },
      assessment: {
        totalHouseholds: householdsCreated,
        totalAccounts: accountsCreated,
        totalAum,
        custodians: custodiansList,
        structure: {
          trustCount: trustAccountsCount,
          individualCount: individualAccountsCount,
          jointCount: jointAccountsCount,
          tradIraCount: iraAccountsCount,
          rothIraCount: rothIraAccountsCount,
          inheritedIraCount: inheritedIraAccountsCount,
          entityCount: entityAccountsCount,
          estateCount: estateAccountsCount,
          fiveTwoNineCount: fiveTwoNineAccountsCount,
          annuityCount: annuityAccountsCount,
          altCount: altAccountsCount,
          employerRetirementCount: employerRetirementAccountsCount,
          advisoryCount: advisoryAccountsCount,
          brokerageCount: brokerageAccountsCount,
          achInstructionsCount,
          rmdAgeCount
        },
        requirements: impliedRequirements,
        households: analyzedHouseholds
      }
    });

  } catch (error) {
    console.error('CRM Import API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
