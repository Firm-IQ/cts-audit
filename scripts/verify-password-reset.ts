import { prisma } from '../lib/db';
import { comparePassword } from '../lib/auth';

async function verifyPasswordResetFlow() {
  console.log('--- STARTING PROGRAMMATIC PASSWORD RESET FLOW VERIFICATION ---');

  const email = 'curt@gocontinuity.com';

  // 1. Reset user to first-time setup state in the DB
  console.log('\nStep 1: Resetting user in DB to initial setup state...');
  await prisma.user.upsert({
    where: { email },
    update: {
      password: '',
      mustChangePassword: true,
      active: true,
      role: 'Super Admin',
    },
    create: {
      email,
      firstName: 'Curt',
      lastName: 'Kloc',
      role: 'Super Admin',
      active: true,
      password: '',
      mustChangePassword: true,
    }
  });

  // Verify DB state
  let user = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (user.password !== '' || !user.mustChangePassword) {
    throw new Error('Failed to set initial user state in DB');
  }
  console.log('✅ DB initialized: password is empty, mustChangePassword is true.');

  // 2. Simulate standard login API call with email only / first time setup
  console.log('\nStep 2: Simulating login request (standard flow)...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!loginRes.ok) {
    throw new Error(`Login request failed with status: ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  console.log('API Response:', JSON.stringify(loginData));
  if (!loginData.mustSetPassword) {
    throw new Error('Expected mustSetPassword: true from login API');
  }
  console.log('✅ API correctly responded with mustSetPassword: true.');

  // 3. Simulate first-time password setup form submission
  console.log('\nStep 3: Simulating password setup submission (arizona)...');
  const setupRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      newPassword: 'arizona',
      confirmPassword: 'arizona',
      isSetup: true,
    })
  });

  if (!setupRes.ok) {
    throw new Error(`Password setup request failed with status: ${setupRes.status}`);
  }

  const setupData = await setupRes.json();
  console.log('API Response:', JSON.stringify(setupData));
  if (!setupData.success) {
    throw new Error('Expected success: true from password setup API');
  }
  console.log('✅ API correctly set password and returned success: true.');

  // Verify password and mustChangePassword are saved in DB
  user = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (user.password === '' || user.mustChangePassword) {
    throw new Error('DB not updated: password still empty or mustChangePassword still true');
  }
  const isMatch = await comparePassword('arizona', user.password);
  if (!isMatch) {
    throw new Error('Saved password does not match or cannot be decrypted');
  }
  console.log('✅ DB updated: password is saved/hashed, mustChangePassword is false.');

  // 4. Simulate standard login with new password
  console.log('\nStep 4: Simulating subsequent login with the same password (arizona)...');
  const subsequentRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'arizona',
    })
  });

  if (!subsequentRes.ok) {
    throw new Error(`Subsequent login request failed with status: ${subsequentRes.status}`);
  }

  const subsequentData = await subsequentRes.json();
  console.log('API Response:', JSON.stringify(subsequentData));
  if (!subsequentData.success || subsequentData.mustSetPassword) {
    throw new Error('Expected direct login success: true without password setup prompt');
  }
  console.log('✅ API logged user in directly without another password change flow.');

  // 5. Test idempotency of seed script
  console.log('\nStep 5: Simulating a database seed (simulated build/redeploy)...');
  // We'll read the seed file, simulate the seeding check
  const checkUserAfterSeed = await prisma.user.findUniqueOrThrow({ where: { email } });
  // We verify that running seed does not overwrite Curt's password or mustChangePassword.
  // Let's run prisma/seed.js to be absolutely sure!
  console.log('Running node prisma/seed.js...');
  const { execSync } = require('child_process');
  execSync('DATABASE_URL="file:./prisma/dev.db" node prisma/seed.js', { stdio: 'inherit' });

  const finalUser = await prisma.user.findUniqueOrThrow({ where: { email } });
  const finalMatch = await comparePassword('arizona', finalUser.password);
  if (!finalMatch || finalUser.mustChangePassword) {
    throw new Error('IDEMPOTENCY FAILURE: Seed script reset Curt\'s password or mustChangePassword!');
  }
  console.log('✅ Idempotency verified: seed script did NOT overwrite or reset admin credentials.');

  console.log('\n🎉 ALL LOGIN AND PASSWORD CHANGE TESTS COMPLETED SUCCESSFULLY.');
  process.exit(0);
}

verifyPasswordResetFlow().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
