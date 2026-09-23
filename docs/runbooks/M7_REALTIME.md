# M7 — Durable Real-Time Events Runbook

## What changed

Civique sockets now treat Socket.IO as a low-latency delivery layer over the PostgreSQL `realtime_events` cursor. Anonymous clients may join only `public`; authenticated clients receive server-derived rooms and may request an explicitly validated room only when the API authorizes it. Private incident rooms require ownership or an official account. Reconnects and sequence gaps are repaired from the durable backlog, and duplicate event IDs are ignored by the map client.

## Local checks

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
npx ts-node --project tsconfig.json src/utils/realtimeProtocol.test.ts
```

Run database-backed checks only against a disposable database with operator approval:

```bash
npm run test:integration:realtime --workspace=services/api
```

## Acceptance evidence still required

- Anonymous `realtime:join` for `public` succeeds; arbitrary/private room joins fail.
- A citizen cannot join another citizen's incident room; an owning citizen can.
- Disconnecting the map, creating events, and reconnecting replays each missed sequence once.
- Two API instances receive the same PostgreSQL notification without duplicate durable rows.
- Backfill remains ordered and bounded at 250 events per page.
