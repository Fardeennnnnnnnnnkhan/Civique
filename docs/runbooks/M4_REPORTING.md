# M4 Secure Citizen Reporting Runbook

## Browser checks

1. Sign in as a citizen and open `/report`.
2. Upload a valid JPEG/PNG/WEBP image, review the AI advisory result, and complete the title, description, category, and location.
3. Confirm the consent checkbox is required before the submission button enables.
4. Submit once, then retry the same network request with the same `Idempotency-Key`; the API must return `idempotentReplay: true` without creating a second Report.
5. Use an out-of-service coordinate and confirm the UI shows an explicit serviceability error.
6. Remove consent or upload an invalid file and confirm no Report is created.

## API checks

The report endpoint requires an authenticated citizen, a valid image, `consentVersion=civique-report-consent-v1`, a valid category, and finite coordinates. Originals remain private in object storage; normalized derivatives are created for controlled processing. AI classification runs after persistence and cannot block durable intake when unavailable.

Run the standard checks:

```bash
npm run typecheck
npm test --workspace=services/api
npm run build:api
npm run build:web
```

Database-backed submission checks require migrations `0018_identity_security`, `0019_geography_imports`, and `0020_taxonomy_baseline`, plus the configured private storage bucket. Never run them against an unapproved production resource.
