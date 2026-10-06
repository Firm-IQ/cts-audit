import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'curt@gocontinuity.com';
  console.log(`Resetting admin password for ${email}...`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    console.error(`User with email "${email}" not found.`);
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      active: true,
      mustChangePassword: true,
      password: '',
    },
  });

  console.log(`Successfully reset user ${updatedUser.email}:`);
  console.log(`- active: ${updatedUser.active}`);
  console.log(`- mustChangePassword: ${updatedUser.mustChangePassword}`);
  console.log(`- password: "${updatedUser.password}"`);
}

main()
  .catch((e) => {
    console.error('Error resetting admin password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
