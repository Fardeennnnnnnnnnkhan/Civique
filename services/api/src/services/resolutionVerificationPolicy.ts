export type VerificationOutcome = 'VERIFIED' | 'REVIEW_REQUIRED' | 'REJECTED';
export type VerificationPolicyResult = { outcome: VerificationOutcome; signals: { key: string; passed: boolean; explanation: string }[] };

const APPEAL_WINDOW_DAYS = 7;

export function canAdministrativeClose(input: { status: string; confirmationDeadline?: Date | string | null; verificationStatus?: string | null; now?: Date }): boolean {
  const now = input.now ?? new Date();
  const deadline = input.confirmationDeadline ? new Date(input.confirmationDeadline) : null;
  return input.status === 'CITIZEN_CONFIRMATION'
    && !!deadline
    && !Number.isNaN(deadline.getTime())
    && deadline.getTime() <= now.getTime()
    && ['VERIFIED', 'VERIFIED_BY_OFFICIAL'].includes(input.verificationStatus ?? '');
}

export function isWithinAppealWindow(resolvedAt?: Date | string | null, now = new Date(), windowDays = APPEAL_WINDOW_DAYS): boolean {
  if (!resolvedAt) return false;
  const resolved = new Date(resolvedAt);
  if (Number.isNaN(resolved.getTime()) || resolved.getTime() > now.getTime()) return false;
  return now.getTime() - resolved.getTime() <= windowDays * 24 * 60 * 60 * 1000;
}

export function evaluateResolutionEvidence(input: { aiOutcome?: string | null; aiConfidence?: number | null; gpsWithinTolerance: boolean; provenanceValid: boolean; beforeAfterRelevant: boolean }): VerificationPolicyResult {
  const signals = [
    { key: 'GPS', passed: input.gpsWithinTolerance, explanation: input.gpsWithinTolerance ? 'Resolution evidence is within the incident location tolerance.' : 'Evidence GPS is outside the incident location tolerance.' },
    { key: 'PROVENANCE', passed: input.provenanceValid, explanation: input.provenanceValid ? 'Evidence was submitted by the assigned worker.' : 'Evidence provenance does not match the assigned worker.' },
    { key: 'BEFORE_AFTER', passed: input.beforeAfterRelevant, explanation: input.beforeAfterRelevant ? 'Before/after evidence is relevant.' : 'Before/after evidence requires a human review.' },
  ];
  if (!input.gpsWithinTolerance || !input.provenanceValid) return { outcome: 'REJECTED', signals };
  if (input.aiOutcome === 'VERIFIED' && (input.aiConfidence ?? 0) >= 0.75 && input.beforeAfterRelevant) return { outcome: 'VERIFIED', signals };
  if (input.aiOutcome === 'REJECTED') return { outcome: 'REJECTED', signals };
  return { outcome: 'REVIEW_REQUIRED', signals };
}
