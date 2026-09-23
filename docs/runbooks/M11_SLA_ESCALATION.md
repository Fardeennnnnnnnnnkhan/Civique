# M11 — SLA and Escalation

## Implemented

Civique calculates SLA deadlines using working calendars, timezone-aware windows, holidays, and versioned policy thresholds. Durable evaluation creates one event per escalation tier and promotes tier-three breaches to `ESCALATED`. SLA pauses require an explicit reason and are restricted to the incident's city, zone, or department scope.

## Local checks

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api
npx ts-node --project tsconfig.json src/services/durableSla.test.ts
npx ts-node --project tsconfig.json src/services/slaCalendar.test.ts
```

The remaining gate is a disposable-database concurrency run for duplicate escalation prevention, pause/resume deadline shifting, reassignment, and notification delivery.
