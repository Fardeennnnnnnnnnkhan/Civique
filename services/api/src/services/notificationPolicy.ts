export const NOTIFICATION_TYPES = ['REPORT_RECEIVED','STATUS_UPDATED','WORK_ASSIGNED','SLA_WARNING','SLA_BREACH','RESOLUTION_SUBMITTED','CITIZEN_ACTION_REQUIRED','SECURITY_ALERT'] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export function notificationLink(type: string, incidentId?: string | null): string | null { return incidentId ? `/report/${incidentId}` : type === 'SECURITY_ALERT' ? '/profile' : null; }
export function isNotificationType(value: string): value is NotificationType { return (NOTIFICATION_TYPES as readonly string[]).includes(value); }
