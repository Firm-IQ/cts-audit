import { prisma } from '../lib/db';

async function main() {
  console.log('Querying Carter Household from SQLite...');
  
  const hh = await prisma.household.findFirst({
    where: { name: 'Carter Household' },
    include: {
      accounts: {
        include: {
          checklistItems: true,
          findings: true
        }
      }
    }
  });

  if (!hh) {
    console.error('ERROR: Carter Household not found!');
    process.exit(1);
  }

  console.log(`\nHousehold: ${hh.name}`);
  console.log(`Readiness Status: ${hh.readinessStatus}`);
  console.log(`Total AUM: $${hh.totalAum}M`);
  
  console.log('\nAccounts checklist overview:');
  let totalItemsCount = 0;
  let missingCount = 0;
  let needsReviewCount = 0;
  let unknownCount = 0;
  let verifiedCount = 0;
  let inferredCount = 0;
  let naCount = 0;

  for (const acc of hh.accounts) {
    console.log(`- Account: ${acc.name} (${acc.type}) | Readiness Status: ${acc.readinessStatus}`);
    console.log(`  Checklist items count: ${acc.checklistItems.length}`);
    totalItemsCount += acc.checklistItems.length;

    for (const item of acc.checklistItems) {
      if (item.status === 'Missing') missingCount++;
      else if (item.status === 'Needs Review') needsReviewCount++;
      else if (item.status === 'Unknown') unknownCount++;
      else if (item.status === 'Verified') verifiedCount++;
      else if (item.status === 'Inferred') inferredCount++;
      else if (item.status === 'Not Applicable') naCount++;
    }

    if (acc.findings.length > 0) {
      console.log(`  Findings (${acc.findings.length}):`);
      for (const f of acc.findings) {
        console.log(`    * [${f.severity}] ${f.title}: ${f.description}`);
      }
    }
  }

  console.log('\nSummary metrics for Carter Household:');
  console.log(`- Total Checklist Items: ${totalItemsCount}`);
  console.log(`  * Verified: ${verifiedCount}`);
  console.log(`  * Inferred: ${inferredCount}`);
  console.log(`  * Unknown: ${unknownCount}`);
  console.log(`  * Missing: ${missingCount}`);
  console.log(`  * Needs Review: ${needsReviewCount}`);
  console.log(`  * Not Applicable: ${naCount}`);

  // Check overall assessment score for the advisor
  const advisor = await prisma.advisor.findFirst({
    where: { name: 'Michael Bennett' }
  });
  
  if (advisor) {
    const assessment = await prisma.assessment.findFirst({
      where: { advisorId: advisor.id },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`\nAdvisor: ${advisor.name}`);
    console.log(`Know Your Book Index: ${assessment?.overallReadinessScore}%`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
