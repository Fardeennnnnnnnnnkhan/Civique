import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- USERS IN DATABASE ---');
  console.log(users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    phoneNumber: u.phoneNumber,
    createdAt: u.createdAt
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
