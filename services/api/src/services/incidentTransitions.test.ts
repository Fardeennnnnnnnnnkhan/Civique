import assert from 'assert';
import { IncidentStatus } from '@prisma/client';
import { isValidIncidentTransition } from './incidentTransitions';

assert.strictEqual(isValidIncidentTransition(IncidentStatus.REPORTED, IncidentStatus.AI_REVIEW), true);
assert.strictEqual(isValidIncidentTransition(IncidentStatus.AI_REVIEW, IncidentStatus.RESOLVED), false);
assert.strictEqual(isValidIncidentTransition(IncidentStatus.RESOLVED, IncidentStatus.REOPENED), true);
assert.strictEqual(isValidIncidentTransition(IncidentStatus.REJECTED, IncidentStatus.OPEN), false);
console.log('Incident transition state-machine checks passed');
