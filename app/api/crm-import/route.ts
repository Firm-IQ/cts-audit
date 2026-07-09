import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    // 4. Load Active Requirement Profiles to generate checklists
    const activeProfiles = await prisma.requirementProfile.findMany({
      where: { active: true },
      include: {
        profileRequirements: {
          include: {
            requirement: true
          }
        }
      }
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
    let inheritedIraAccountsCount = 0;
    let entityAccountsCount = 0;
    let estateAccountsCount = 0;
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
        else if (acc.type === 'Inherited IRA') inheritedIraAccountsCount++;
        else if (acc.type === 'Entity') entityAccountsCount++;
        else if (acc.type === 'Estate') estateAccountsCount++;
        
        if (['Annuity', 'Alternative Investment', 'Direct Business'].includes(acc.type)) {
          specialHoldingsCount++;
        }

        // Potential High Risk: value > $1.5M, or Alternative/Annuity holdings, or Estates
        if ((acc.value && acc.value > 1500000) || ['Alternative Investment', 'Annuity', 'Estate'].includes(acc.type)) {
          potentialHighRiskAccountsCount++;
        }

        // 6. Checklist Generation
        let profile = null;
        if (acc.custodian) {
          profile = activeProfiles.find(p => p.name.trim().toLowerCase() === acc.custodian!.trim().toLowerCase());
        }
        if (!profile) {
          profile = activeProfiles.find(p => p.name === 'CTS Master Requirements');
        }

        if (profile) {
          const checklistData = profile.profileRequirements
            .filter(pr => pr.state !== 'Hidden' && pr.requirement.active)
            .map(pr => {
              const req = pr.requirement;
              const isAll = req.appliesToAccountTypes.toLowerCase() === 'all';
              const appliesList = req.appliesToAccountTypes.split(',').map(s => s.trim().toLowerCase());
              const isApplicable = isAll || appliesList.includes(acc.type.trim().toLowerCase());

              return {
                accountId: newAccount.id,
                itemKey: req.id,
                itemName: req.name,
                status: isApplicable ? 'Unknown' : 'Not Applicable',
                notes: '',
                verifiedBy: '',
                verifiedDate: '',
                requirementId: req.id,
              };
            });

          if (checklistData.length > 0) {
            await prisma.accountChecklistItem.createMany({
              data: checklistData,
            });
          }
        }
      }
    }

    // Update Advisor AUM and counts
    const allHhs = await prisma.household.findMany({ where: { advisorId: advisor.id } });
    const hhCount = allHhs.length;
    const accCount = await prisma.account.count({ where: { household: { advisorId: advisor.id } } });
    const finalAdvisorAum = allHhs.reduce((sum, h) => sum + (h.totalAum || 0), 0);
    const finalAdvisorRev = allHhs.reduce((sum, h) => sum + (h.revenue || 0), 0);

    await prisma.advisor.update({
      where: { id: advisor.id },
      data: {
        totalAum: finalAdvisorAum,
        annualRevenue: finalAdvisorRev,
        households: hhCount,
        accounts: accCount
      }
    });

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
      }
    });

  } catch (error) {
    console.error('CRM Import API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
