import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DEPARTMENTS ---');
  const depts = await prisma.department.findMany();
  console.log(depts);

  console.log('--- LAST 5 INCIDENTS ---');
  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      ward: true,
    }
  });
  console.log(incidents.map(inc => ({
    id: inc.id,
    trackingId: inc.publicTrackingId,
    category: inc.category,
    status: inc.status,
    cityId: inc.cityId,
    ward: inc.ward?.name,
    departmentId: inc.departmentId,
    slaDeadline: inc.slaDeadline,
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
