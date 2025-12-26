const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create system state
  const systemState = await prisma.systemState.upsert({
    where: { id: 'SINGLETON' },
    update: {},
    create: {
      id: 'SINGLETON',
      state: 'OWNER_SETUP',
    },
  });
  console.log('✅ System state created:', systemState.state);

  // Create super admin (OWNER)
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  
  const owner = await prisma.user.upsert({
    where: { email: 'jennnull4@gmail.com' },
    update: {},
    create: {
      email: 'jennnull4@gmail.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'OWNER',
      isActive: true,
    },
  });
  
  console.log('✅ Super Admin created:');
  console.log('   Email:', owner.email);
  console.log('   Role:', owner.role);
  console.log('   Password: Admin123!');
  
  console.log('\n🎉 Seeding complete!');
  console.log('\n🔐 You can now log in with:');
  console.log('   Email: jennnull4@gmail.com');
  console.log('   Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
