# M2 Identity and Sessions Runbook

This runbook verifies the local identity/security slice without touching the remote database configured in `.env`.

## Unit and build checks

```bash
npm test
npm run typecheck
npm run build:api
npm run build:worker
npm run build:web
```

The web build uses webpack in this repository. `npm run lint` remains a separate P0 gate and currently reports existing UI debt.

## Local migration

Start the disposable PostgreSQL service, then apply migrations with explicit local overrides:

```bash
npm run dev:infra
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
DIRECT_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
npx prisma migrate deploy --schema services/api/prisma/schema.prisma
```

Never omit the overrides while `.env` points at a remote provider.

## Authentication integration

```bash
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
DIRECT_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
NODE_ENV=test \
JWT_ACCESS_SECRET=m2_test_access_secret_with_sufficient_length \
JWT_REFRESH_SECRET=m2_test_refresh_secret_with_sufficient_length \
MFA_ENCRYPTION_KEY=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc \
npm run test:integration:auth --workspace=services/api
```

The integration path checks public-registration privilege stripping, recovery-token replay rejection, official invitation activation, TOTP enrollment/confirmation/login, cookie double-submit CSRF, suspension denial, refresh/session behavior, and persisted security events.

## Manual endpoint checks

- `POST /api/v1/auth/register` always creates `CITIZEN`.
- `POST /api/v1/auth/login` returns `MFA_REQUIRED` for an enrolled official without a valid code.
- `POST /api/v1/auth/mfa/enroll` and `/mfa/confirm` are restricted to official accounts.
- `POST /api/v1/auth/mfa/verify` exchanges a short-lived challenge for normal sessions.
- `GET /api/v1/auth/sessions` lists only the authenticated user’s active sessions.
- `DELETE /api/v1/auth/sessions/:id` revokes only a session owned by the authenticated user.
- Cookie-backed refresh/logout/logout-all requests without `x-csrf-token` return `403 CSRF_REQUIRED`.
- `GET /api/v1/ready` must be checked before accepting traffic.

## Browser checks

1. Start the web and API locally, sign in as a citizen, open **Profile → Privacy & Audit**, and confirm active sessions load.
2. Sign in as an invited official, open the same tab, choose **Enable MFA**, confirm an authenticator code, sign out, and verify the sign-in page asks for the six-digit code after the password.
3. Revoke a listed session and refresh the page; the revoked session must no longer be returned.
4. Check the same flows at 360px and desktop widths with keyboard-only navigation. The current repository-wide lint backlog means this manual check supplements, but does not replace, CI accessibility evidence.

## Overall implementation check after each module

The one-command gate is:

```bash
npm run verify:overall
```

It intentionally stops at lint when the existing web backlog is present. For a fast check that excludes lint, run the unit/type/build commands below individually.

1. Read `docs/ACCEPTANCE_MATRIX.md` and confirm the current module status/evidence.
2. Run `npm test`, `npm run typecheck`, and the production builds.
3. Run the active module’s local integration command with explicit disposable-database overrides.
4. Run `npm run lint`; do not weaken lint rules to hide failures.
5. Check `docs/TASK_STATUS.md` for the next gate and `docs/PROJECT_CONTEXT.md` for known risks.
6. Rehearse migrations/readiness/backup only against local or explicitly approved staging resources.

An implementation is not production-verified until the acceptance matrix gates, security/access-scope tests, accessibility checks, and environment-backed evidence all pass.
