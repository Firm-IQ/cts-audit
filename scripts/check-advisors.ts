import { prisma } from '../lib/db';

async function main() {
  const advisors = await prisma.advisor.findMany({
    include: {
      assessments: true,
      householdRecords: {
        include: {
          accounts: {
            include: {
              checklistItems: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${advisors.length} advisors:`);
  for (const adv of advisors) {
    const evaluatedItems = adv.householdRecords.flatMap(hh =>
      hh.accounts.flatMap(acc =>
        acc.checklistItems.filter(item => ['Present', 'Missing', 'Needs Review'].includes(item.status))
      )
    );
    console.log(`- Advisor: ${adv.name} (${adv.id})`);
    console.log(`  Households: ${adv.householdRecords.length}, Accounts: ${adv.householdRecords.flatMap(h => h.accounts).length}`);
    console.log(`  Assessments count: ${adv.assessments.length}`);
    if (adv.assessments.length > 0) {
      console.log(`  Latest Assessment Score: ${adv.assessments[0].overallReadinessScore}%`);
    }
    console.log(`  Evaluated checklist items count: ${evaluatedItems.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
