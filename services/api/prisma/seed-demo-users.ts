import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const configuredPassword = process.env.DEMO_USER_PASSWORD;
if (!configuredPassword || configuredPassword.length < 12) throw new Error('Set DEMO_USER_PASSWORD to a value of at least 12 characters.');
const password: string = configuredPassword;

async function main() {
  const city = await prisma.city.findFirst({ where: { active: true }, include: { zones: { include: { wards: true } } } });
  if (!city) throw new Error('Seed geography first before creating demo users.');
  const ward = city.zones[0]?.wards[0];
  const department = await prisma.department.findFirst({ where: { cityId: city.id } });
  const hash = await bcrypt.hash(password, 12);
  const users: Array<{ role: UserRole; email: string; cityId?: string | null; zoneId?: string | null; wardId?: string | null; departmentId?: string | null }> = [
    { role: UserRole.CITIZEN, email: 'demo.citizen@civique.local' },
    { role: UserRole.FIELD_WORKER, email: 'demo.fieldworker@civique.local', cityId: city.id, zoneId: city.zones[0]?.id, wardId: ward?.id, departmentId: department?.id },
    { role: UserRole.WARD_OFFICER, email: 'demo.wardofficer@civique.local', cityId: city.id, zoneId: city.zones[0]?.id, wardId: ward?.id },
    { role: UserRole.DEPARTMENT_HEAD, email: 'demo.departmenthead@civique.local', cityId: city.id, departmentId: department?.id },
    { role: UserRole.ZONAL_OFFICER, email: 'demo.zonalofficer@civique.local', cityId: city.id, zoneId: city.zones[0]?.id },
    { role: UserRole.COMMISSIONER, email: 'demo.commissioner@civique.local', cityId: city.id },
    { role: UserRole.CITY_ADMIN, email: 'demo.cityadmin@civique.local', cityId: city.id },
    { role: UserRole.SUPER_ADMIN, email: 'demo.superadmin@civique.local' },
  ];
  for (const user of users) {
    await prisma.user.upsert({ where: { email: user.email }, update: { passwordHash: hash, role: user.role, active: true, cityId: user.cityId, zoneId: user.zoneId, wardId: user.wardId, departmentId: user.departmentId }, create: { ...user, passwordHash: hash, active: true } });
  }
  console.log(`Created/updated ${users.length} demo users. Password supplied via DEMO_USER_PASSWORD.`);
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
