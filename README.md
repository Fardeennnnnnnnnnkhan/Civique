# Civique

**Civique** is an AI-powered civic issue reporting, verification, and resolution platform designed to establish a transparent, auditable, and automated loop from citizen report to verified resolution.

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

### Push Database Schema
Push the models to your active database instance using Prisma:
```bash
npx prisma db push --schema=services/api/prisma/schema.prisma
```

---

## 3. Running the Services

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


