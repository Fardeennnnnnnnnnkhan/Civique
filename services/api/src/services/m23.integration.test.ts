import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROLLBACK = new Error('M23_TEST_ROLLBACK');

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.report.findFirst({ where: { incidentId: { not: null }, submitterRef: { not: null } }, select: { id: true, incidentId: true, submitterRef: true } });
      assert.ok(report?.incidentId && report.submitterRef, 'an owned report fixture is required');
      const post = (await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO socio_posts (report_id,incident_id,author_id,alias,consent_version,redacted_text,category,status) VALUES (${report.id}::uuid,${report.incidentId!}::uuid,${report.submitterRef!}::uuid,'M23 Test Alias','socio-v1','Civic test','POTHOLE','OPEN') RETURNING id`)[0];
      assert.ok(post);
      await tx.$executeRaw`INSERT INTO socio_reactions (post_id,user_id) VALUES (${post.id}::uuid,${report.submitterRef!}::uuid)`;
      const reactionCount = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM socio_reactions WHERE post_id=${post.id}::uuid`;
      assert.equal(Number(reactionCount[0].count), 1);
      const comment = (await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO socio_comments (post_id,author_id,alias,body) VALUES (${post.id}::uuid,${report.submitterRef!}::uuid,'M23 Test Alias','Respectful civic comment') RETURNING id`)[0];
      const contentReport = (await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO socio_content_reports (comment_id,reporter_id,reason) VALUES (${comment.id}::uuid,${report.submitterRef!}::uuid,'Test moderation reason') RETURNING id`)[0];
      const moderationCase = (await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO socio_moderation_cases (comment_id,content_report_id,reason) VALUES (${comment.id}::uuid,${contentReport.id}::uuid,'Test moderation reason') RETURNING id`)[0];
      assert.ok(moderationCase);
      await tx.$executeRaw`INSERT INTO socio_moderation_appeals (case_id,appellant_id,reason) VALUES (${moderationCase.id}::uuid,${report.submitterRef!}::uuid,'Test appeal reason')`;
      const appeals = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) count FROM socio_moderation_appeals WHERE case_id=${moderationCase.id}::uuid`;
      assert.equal(Number(appeals[0].count), 1);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  } finally { await prisma.$disconnect(); }
  console.log('M23 engagement constraints and rollback checks passed');
}

void main();
