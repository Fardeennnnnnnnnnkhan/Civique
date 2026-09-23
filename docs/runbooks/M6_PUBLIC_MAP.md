# M6 Privacy-Safe Public Map Runbook

- `GET /api/v1/incidents` returns only public lifecycle states for anonymous users.
- Public coordinates are generalized to an approximately 100m grid and include `locationPrecision=APPROXIMATE_100M`.
- Internal `priorityScore`, citizen identity, private notes, and private media are excluded from public DTOs.
- Add `cluster=true` to receive privacy-grid clusters alongside the incident list.
- `GET /api/v1/incidents/public/:id` uses the same redacted location/detail contract.

## Browser checks

1. Open `/map` signed out and inspect a public incident.
2. Use **Accessible list** and keyboard navigation to read statuses, priorities, and details.
3. Confirm no exact household-level coordinate, citizen contact, private storage path, or internal score appears.
4. Test category/status filters and mobile/desktop layouts.

## Automated checks

```bash
npm test --workspace=services/api
npm run typecheck
npm run build:api
npm run build:web
```

Run public HTTP redaction checks only against an approved disposable or staging database.
