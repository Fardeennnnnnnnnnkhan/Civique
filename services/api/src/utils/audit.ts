import crypto from 'crypto';

/**
 * Log a change to an incident in a cryptographically chained audit trail (SHA-256).
 * Uses the previous log entry's hash as a salt to link the chain, preventing tampering.
 */
export async function logIncidentChange(
  tx: any,
  incidentId: string,
  eventType: string,
  actor: string,
  metadata: any
) {
  // Find the last audit log for this incident to build the hash chain
  const lastLog = await tx.auditLog.findFirst({
    where: { incidentId },
    orderBy: { timestamp: 'desc' },
  });

  const previousHash = lastLog ? lastLog.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';
  
  const dataToHash = `${previousHash}|${incidentId}|${eventType}|${actor}|${JSON.stringify(metadata)}`;
  const currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  return await tx.auditLog.create({
    data: {
      incidentId,
      eventType,
      actor,
      previousHash,
      currentHash,
      metadata: metadata || {},
    },
  });
}
