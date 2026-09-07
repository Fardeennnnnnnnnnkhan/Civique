import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'worker@gmail.com';
  const password = 'password123';

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.FIELD_WORKER
    }
  });

  console.log(`Successfully created FIELD_WORKER user:`);
  console.log(newUser);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
