const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'curt@gocontinuity.com';
  const passwordVal = 'arizona';
  
  console.log(`Resetting admin account: ${email}...`);
  
  try {
    const hashedPassword = await bcrypt.hash(passwordVal, 10);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        active: true,
        role: 'Super Admin',
        mustChangePassword: false,
        password: hashedPassword,
      },
      create: {
        email,
        firstName: 'Curt',
        lastName: 'Kloc',
        role: 'Super Admin',
        active: true,
        password: hashedPassword,
        mustChangePassword: false,
      },
    });
    
    console.log(`Success! Admin user ${user.email} reset with password 'arizona'.`);
  } catch (error) {
    console.error('Failed to reset admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
