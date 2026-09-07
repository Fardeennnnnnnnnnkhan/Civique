import { PrismaClient } from '@prisma/client';
import { resolveLocationToWard } from '../utils/geofence';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all incidents with missing geography or department...');
  const incidents = await prisma.incident.findMany({
    where: {
      OR: [
        { cityId: null },
        { wardId: null },
        { departmentId: null }
      ]
    }
  });

  console.log(`Found ${incidents.length} incidents to repair.`);

  let repairedCount = 0;

  for (const inc of incidents) {
    try {
      const resolved = await resolveLocationToWard(inc.latitude, inc.longitude);
      if (!resolved) {
        console.log(`Incident #${inc.publicTrackingId} coordinates (${inc.latitude}, ${inc.longitude}) did not match Indore geofence. Mapped to default city.`);
        
        // Fallback: Bind to Indore city ID
        const indoreCity = await prisma.city.findFirst({
          where: { name: 'Indore' }
        });
        if (indoreCity) {
          let department = await prisma.department.findFirst({
            where: {
              cityId: indoreCity.id,
              handledCategories: { has: inc.category }
            }
          });
          if (!department) {
            department = await prisma.department.findFirst({
              where: { cityId: indoreCity.id, name: 'General Administration' }
            });
          }
          const slaDeadline = department ? new Date(inc.createdAt.getTime() + department.defaultSlaHours * 60 * 60 * 1000) : null;

          await prisma.incident.update({
            where: { id: inc.id },
            data: {
              cityId: indoreCity.id,
              departmentId: department ? department.id : null,
              slaDeadline
            }
          });
          repairedCount++;
        }
        continue;
      }

      // Found matching geofence
      let department = await prisma.department.findFirst({
        where: {
          cityId: resolved.cityId,
          handledCategories: { has: inc.category }
        }
      });
      if (!department) {
        department = await prisma.department.findFirst({
          where: { cityId: resolved.cityId, name: 'General Administration' }
        });
      }
      const slaDeadline = department ? new Date(inc.createdAt.getTime() + department.defaultSlaHours * 60 * 60 * 1000) : null;

      await prisma.incident.update({
        where: { id: inc.id },
        data: {
          cityId: resolved.cityId,
          zoneId: resolved.zoneId,
          wardId: resolved.wardId,
          departmentId: department ? department.id : null,
          slaDeadline
        }
      });
      
      console.log(`Successfully repaired Incident #${inc.publicTrackingId}: Assigned to Ward: ${resolved.wardName}, Dept: ${department?.name}`);
      repairedCount++;
    } catch (err) {
      console.error(`Failed to repair incident #${inc.publicTrackingId}:`, err);
    }
  }

  console.log(`Finished repairing. Total incidents successfully repaired: ${repairedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
