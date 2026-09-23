import crypto from 'crypto';

const GENESIS = '0'.repeat(64);
export const AUDIT_HASH_VERSION = 'm17-v1';
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`;
}
export function canonicalAuditPayload(input: { incidentId: string; eventType: string; actor: string; metadata: unknown; previousHash: string; chainSequence: bigint | number }): string {
  return stable({ actor: input.actor, chainSequence: input.chainSequence.toString(), eventType: input.eventType, incidentId: input.incidentId, metadata: input.metadata ?? {}, previousHash: input.previousHash });
}
export function auditHash(input: Parameters<typeof canonicalAuditPayload>[0]): string { return crypto.createHash('sha256').update(canonicalAuditPayload(input)).digest('hex'); }
export function legacyAuditHash(input: { incidentId: string; eventType: string; actor: string; metadata: unknown; previousHash: string }): string {
  return crypto.createHash('sha256').update(`${input.previousHash}|${input.incidentId}|${input.eventType}|${input.actor}|${JSON.stringify(input.metadata ?? {})}`).digest('hex');
}
export async function logIncidentChange(tx: any, incidentId: string, eventType: string, actor: string, metadata: unknown) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${incidentId}, 0))`;
  const previous = await tx.auditLog.findFirst({ where: { incidentId }, orderBy: { chainSequence: 'desc' }, select: { currentHash: true } });
  const sequence = await tx.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('audit_logs_chain_sequence_seq') AS value`;
  const chainSequence = sequence[0].value;
  const previousHash = previous?.currentHash || GENESIS;
  const currentHash = auditHash({ incidentId, eventType, actor, metadata: metadata ?? {}, previousHash, chainSequence });
  const created = await tx.auditLog.create({ data: { incidentId, eventType, actor, previousHash, currentHash, metadata: metadata ?? {}, chainSequence, hashVersion: AUDIT_HASH_VERSION } });
  await tx.$executeRaw`INSERT INTO audit_chain_heads (incident_id,head_hash,head_sequence,updated_at) VALUES (${incidentId}::uuid,${currentHash},${chainSequence},NOW()) ON CONFLICT (incident_id) DO UPDATE SET head_hash=EXCLUDED.head_hash,head_sequence=EXCLUDED.head_sequence,updated_at=NOW()`;
  return created;
}
export type AuditIntegrityResult = { valid: boolean; checked: number; firstFailure?: { id: string; reason: string } };
export function verifyAuditChain(rows: Array<{ id: string; incidentId: string; eventType: string; actor: string; previousHash: string | null; currentHash: string; metadata: unknown; chainSequence: bigint; hashVersion: string }>, head?: { headHash: string; headSequence: bigint } | null): AuditIntegrityResult {
  let expectedPrevious = GENESIS;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.previousHash !== expectedPrevious) return { valid: false, checked: index, firstFailure: { id: row.id, reason: 'PREVIOUS_HASH_MISMATCH' } };
    const expectedHash = row.hashVersion === AUDIT_HASH_VERSION
      ? auditHash({ incidentId: row.incidentId, eventType: row.eventType, actor: row.actor, metadata: row.metadata ?? {}, previousHash: row.previousHash || GENESIS, chainSequence: row.chainSequence })
      : legacyAuditHash({ incidentId: row.incidentId, eventType: row.eventType, actor: row.actor, metadata: row.metadata ?? {}, previousHash: row.previousHash || GENESIS });
    if (expectedHash !== row.currentHash) return { valid: false, checked: index, firstFailure: { id: row.id, reason: 'CURRENT_HASH_MISMATCH' } };
    expectedPrevious = row.currentHash;
  }
  if (head && (rows.length === 0 || rows[rows.length - 1].currentHash !== head.headHash || rows[rows.length - 1].chainSequence !== head.headSequence)) return { valid: false, checked: rows.length, firstFailure: { id: rows[rows.length - 1]?.id || 'chain-head', reason: 'HEAD_ANCHOR_MISMATCH' } };
  return { valid: true, checked: rows.length };
}
