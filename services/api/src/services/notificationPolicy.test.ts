import assert from 'node:assert/strict';
import { isNotificationType, notificationLink } from './notificationPolicy';
assert.equal(isNotificationType('SLA_WARNING'), true);
assert.equal(isNotificationType('UNKNOWN'), false);
assert.equal(notificationLink('STATUS_UPDATED', 'incident-1'), '/report/incident-1');
assert.equal(notificationLink('SECURITY_ALERT'), '/profile');
console.log('Notification policy tests passed.');
