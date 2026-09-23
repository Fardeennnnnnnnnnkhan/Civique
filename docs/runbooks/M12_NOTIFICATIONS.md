# M12 Notifications Runbook

## Local verification

From the repository root:

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
npm run test:notification-delivery --workspace=services/worker
cd services/api && npx ts-node --project tsconfig.json src/services/notificationPolicy.test.ts
```

## Manual browser check

1. Start the API, worker, and web app with the restored database.
2. Sign in as a citizen and open the bell in the top bar.
3. Confirm loading, empty, and retry states; create or transition a report from an authorized test account.
4. Confirm one realtime alert appears, clicking it opens only the server-provided report link, and refreshing does not duplicate it.
5. Mark one notification read, then use **Mark all read** and confirm the unread badge reaches zero.
6. Open Profile → Notifications. In-app preferences can be changed; email/SMS must visibly explain that the provider is not configured rather than claiming success.
7. Create more than 20 test notifications and confirm **Load older alerts** advances by cursor without duplicates.

## Acceptance evidence still required

- Authenticated HTTP tests for preferences, cursor pagination, unread count, read/read-all, and cross-user notification denial against an approved disposable database.
- Provider contract/canary evidence for email success, retry/backoff, bounce suppression, and dead-letter visibility.
- Browser reconnect test proving a missed socket notification is reconciled from the durable API.
- Recipient lifecycle E2E covering report receipt, status changes, work assignment, SLA warning/breach, resolution submission, dispute, and security alert.

## Safety notes

- Do not run provider canaries with production recipients without explicit approval.
- Do not treat a Socket.IO event as the source of truth.
- Do not enable email/SMS controls until provider credentials, consent, bounce handling, and delivery monitoring are configured.
