# M24 Government and Channel Integrations

Apply `services/api/prisma/migrations/0032_government_integrations/migration.sql` only to an approved disposable/restored database.

## Activation safety

Keep `CIVIQUE_INTEGRATIONS_ENABLED=false` until the authority/provider agreement, secret rotation process, redaction review, and fake-provider contract tests are approved. Configure `CIVIQUE_WEBHOOK_SECRET` or a provider-specific `CIVIQUE_WEBHOOK_SECRET_<PROVIDER>` server-side only.

## Signed webhook contract

`POST /api/v1/integrations/webhooks/:provider` requires `x-civique-event-id`, `x-civique-event-type`, `x-civique-timestamp`, `x-civique-sequence`, and `x-civique-signature`. The signature is `sha256=HMAC_SHA256(secret, timestamp + '.' + JSON.stringify(body))`; timestamps older than five minutes are rejected and a sequence older than the latest provider event returns `WEBHOOK_OUT_OF_ORDER`. Event IDs are unique per provider, so retries return `duplicate: true` without reapplying the mapping.

Webhook payloads may include `externalId`, `reportId`, `incidentId`, `status`, and `metadata`. Payload hashes, inbox status, and last-seen external references are retained for reconciliation. Delivery records use an idempotency key and accept explicit `DELIVERED`, `FAILED`, or `RETRYING` receipts.

No endpoint claims IMC, 311, e-Nagar Palika, GIS, SMS, WhatsApp, IVR, kiosk, or call-centre affiliation until a formally approved adapter is configured.

Delivery operators can inspect `/integrations/deliveries`, retry failed records up to ten attempts, and record provider receipts. Conflicts are listed at `/integrations/conflicts` and require a resolution note. Adapter activation is restricted to a super administrator and requires `CIVIQUE_INTEGRATION_APPROVAL_TOKEN`; keep adapters `DISABLED` or `PAUSED` during pilot development.
