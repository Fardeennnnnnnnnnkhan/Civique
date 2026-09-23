# Civique

**Civique** is an AI-assisted civic issue reporting, municipal operations, transparency, and public-participation platform. It is being developed as an Indore-first, IMC-ready pilot and must not be represented as an official Indore Municipal Corporation service without formal authorization.

## Project Documentation

- [`Implementation.md`](Implementation.md) is the sole authoritative product, architecture, security, UX, and module specification.
- [`docs/ACCEPTANCE_MATRIX.md`](docs/ACCEPTANCE_MATRIX.md) records current module status and verification evidence.
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) records durable current engineering context.
- [`docs/TASK_STATUS.md`](docs/TASK_STATUS.md) records the active module and immediate gate.
- [`docs/runbooks/M1_INFRASTRUCTURE.md`](docs/runbooks/M1_INFRASTRUCTURE.md) covers local startup, readiness, migrations, durable jobs, and backup/restore rehearsal.
- [`docs/runbooks/M2_IDENTITY.md`](docs/runbooks/M2_IDENTITY.md) covers identity, sessions, CSRF, MFA, and the repeatable overall verification checklist.

Historical completion labels elsewhere do not override the acceptance matrix.

---

## 1. Technology Stack
- **Frontend**: Next.js (TypeScript, App Router, Tailwind CSS)
- **Backend API**: Express.js (TypeScript)
- **ORM**: Prisma ORM
- **Database**: PostgreSQL (Supabase / Local container)
- **AI Microservice**: Python FastAPI (Uvicorn)

---

## 2. Local Setup

### Prerequisite Environment Configurations
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your credentials (e.g. your Supabase connection string under `DATABASE_URL`).
3. Sync the configurations to all workspace folders:
   ```bash
   cp .env services/api/.env && cp .env services/worker/.env
   ```

### Start Database Infrastructure (Optional if using Supabase)
If you prefer running a local PostgreSQL instance:
```bash
docker compose up -d
```

### Apply Database Migrations

Use only an approved local/disposable database. Do not run schema commands against staging or production without explicit permission and a rehearsed migration plan.

```bash
npm run prisma:migrate --workspace=services/api
```

---

## 3. Running the Services

Start PostgreSQL, API, web, worker, and ML together:

```bash
npm run dev
```

Set `SKIP_DOCKER=true` only when PostgreSQL is already running. The orchestrator stops the remaining child processes if one service exits unexpectedly.

For individual service debugging, use separate terminal sessions:

Open separate terminal sessions from the project root and run:

### A. Express REST API (Port `5000`)
```bash
npm run dev --workspace=services/api
```

### B. Next.js Frontend (Port `3000`)
```bash
npm run dev --workspace=apps/web
```

### C. Background Task Worker
```bash
npm run dev --workspace=services/worker
```

### D. Python FastAPI ML Service (Port `8000`)
```bash
cd services/ml
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Verification & Health Monitoring

Ensure everything is running successfully by querying the service health endpoints:

- **REST API Health** (verifies database connections):
  ```bash
  curl http://localhost:5000/api/v1/health
  ```
- **Frontend Client Health**:
  ```bash
  curl http://localhost:3000/api/health
  ```
- **ML Inference Health**:
  ```bash
  curl http://localhost:8000/health
  ```

Run the full stack readiness check with:

```bash
npm run health:check
```

Run the overall local quality gate after each module with:

```bash
npm run verify:overall
```

This includes tests, strict typechecks, lint, and production builds; it will stop at the known web lint backlog until that gate is cleared.

Never commit `.env` files. If a credential is exposed in a terminal transcript or shared artifact, rotate it with the provider and update every local service copy.
