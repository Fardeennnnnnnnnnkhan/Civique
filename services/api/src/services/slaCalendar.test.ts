import assert from 'node:assert/strict';
import { addWorkingHours, workingMillisecondsBetween } from './slaCalendar';

const calendar = { workingDays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '17:00' }], holidays: ['2026-09-14'] };

const friday = new Date('2026-09-11T12:00:00.000Z');
const monday = addWorkingHours(friday, 8, 'Asia/Kolkata', calendar);
assert.equal(monday.toISOString(), '2026-09-15T11:30:00.000Z');

const elapsed = workingMillisecondsBetween(new Date('2026-09-11T03:30:00.000Z'), monday, 'Asia/Kolkata', calendar);
assert.equal(elapsed, 16 * 3600000);

const dstStart = addWorkingHours(new Date('2026-03-06T21:00:00.000Z'), 2, 'America/New_York', { workingDays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '17:00' }] });
assert.equal(dstStart.toISOString(), '2026-03-09T14:00:00.000Z');
console.log('SLA calendar timezone, holiday, and DST tests passed.');
