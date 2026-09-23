# M8 — Administration and Workforce Runbook

## Implemented slice

The People Directory now supports a backend-authorized employee detail view. It displays only scoped municipal personnel, workload counts, organizational geography, session count, and a bounded security-event summary. Managers can suspend or reactivate lower-ranked users with a mandatory reason; suspension revokes active sessions and open invitation/recovery tokens.

The Roles & Permissions screen is available at `/admin/roles`. It reads the protected permission catalog, lists system/custom roles, and creates city-scoped custom roles. Reserved permissions cannot be selected. Scope grants, delegations, and employment profiles are available through the protected `/users/:id/scope-grants`, `/users/:id/delegations`, and `/users/:id/employment` APIs.

## Local checks

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
```

Open `/admin/people`, select a personnel card, and verify the detail dialog. The status action must require an audit reason.

## Remaining M8 acceptance

- Run directory, detail, scope-denial, and status HTTP tests against an approved disposable database.
- Add the additive protected/custom role, permission, assignment, scope-grant, delegation, organization, and employment-profile migration.
- Apply migration `0021_rbac_workforce` to a disposable database; it seeds permission definitions, protected role templates, and backfills legacy enum roles into assignments.
- Verify default-deny permissions, reserved-permission protection, separation of duties, expiry, and delegation denial.
