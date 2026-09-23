import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); const ROLLBACK = new Error('M22_TEST_ROLLBACK');
async function main() { try { await prisma.$transaction(async (tx) => {
  const report = await tx.report.findFirst({ where: { incidentId: { not: null }, submitterRef: { not: null } }, select: { id: true, incidentId: true, submitterRef: true } }); assert.ok(report?.incidentId && report.submitterRef, 'an owned report fixture is required');
  const aliases = await tx.$queryRaw<Array<{ alias: string }>>`INSERT INTO socio_aliases (user_id,alias) VALUES (${report.submitterRef!}::uuid,'M22 Test Alias') ON CONFLICT (user_id) DO UPDATE SET alias=EXCLUDED.alias RETURNING alias`; assert.equal(aliases[0].alias, 'M22 Test Alias');
  const posts = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO socio_posts (report_id,incident_id,author_id,alias,consent_version,redacted_text,category,status) VALUES (${report.id}::uuid,${report.incidentId!}::uuid,${report.submitterRef!}::uuid,'M22 Test Alias','socio-v1','Redacted civic issue','POTHOLE','OPEN') RETURNING id`; assert.ok(posts[0]);
  await tx.$executeRaw`INSERT INTO socio_publication_consents (post_id,user_id,consent_version,action) VALUES (${posts[0].id}::uuid,${report.submitterRef!}::uuid,'socio-v1','PUBLISHED')`;
  await tx.$executeRaw`INSERT INTO socio_post_updates (post_id,status,message,actor_id) VALUES (${posts[0].id}::uuid,'OPEN','M22 test status update',${report.submitterRef!}::uuid)`;
  await tx.$executeRaw`UPDATE socio_posts SET visibility='REVOKED',revoked_at=NOW() WHERE id=${posts[0].id}::uuid`;
  await tx.$executeRaw`INSERT INTO socio_publication_consents (post_id,user_id,consent_version,action) VALUES (${posts[0].id}::uuid,${report.submitterRef!}::uuid,'socio-v1','REVOKED')`;
  const visible = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM socio_posts WHERE id=${posts[0].id}::uuid AND revoked_at IS NULL`; assert.equal(Number(visible[0].count), 0); throw ROLLBACK;
}); } catch (error) { if (error !== ROLLBACK) throw error; } finally { await prisma.$disconnect(); } console.log('M22 consent, public projection, and revocation integration checks passed'); }
void main();
