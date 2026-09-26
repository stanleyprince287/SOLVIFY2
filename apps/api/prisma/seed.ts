import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { Role, AccountStatus } from '@solvify/shared';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Home Services', icon: 'home', services: ['Electrician', 'Plumber', 'Cleaner', 'Carpenter', 'Painter'] },
  { name: 'Automotive',    icon: 'car',  services: ['Mechanic', 'Auto Electrician', 'Tyre Technician'] },
  { name: 'Education',     icon: 'book', services: ['Tutor', 'Language Teacher', 'Coding Tutor'] },
  { name: 'Technology',    icon: 'cpu',  services: ['Developer', 'IT Technician', 'Computer Repair'] },
];

// NOTE: `area` uses '' rather than null — Postgres treats NULLs as distinct in unique
// indexes, which would let duplicate locations slip through.
const LOCATIONS = [
  { country: 'Nigeria', state: 'Abia', city: 'Aba', area: 'Aba North' },
  { country: 'Nigeria', state: 'Abia', city: 'Aba', area: 'Aba South' },
  { country: 'Nigeria', state: 'Abia', city: 'Aba', area: 'Osisioma' },
];

async function main() {
  for (const c of CATEGORIES) {
    const category = await prisma.serviceCategory.upsert({
      where: { name: c.name },
      update: { icon: c.icon },
      create: { name: c.name, icon: c.icon },
    });
    for (const name of c.services) {
      await prisma.service.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { categoryId: category.id, name },
      });
    }
  }

  for (const l of LOCATIONS) {
    await prisma.location.upsert({
      where: { country_state_city_area: l },
      update: {},
      create: l,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@solvify.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'Solvify Admin',
      email: adminEmail,
      phone: '+2340000000000',
      passwordHash: await hashPassword(adminPassword),
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log('✅ Seed complete. Admin:', adminEmail);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());