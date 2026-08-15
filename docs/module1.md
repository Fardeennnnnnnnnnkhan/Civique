# Module 1: Infrastructure and Project Setup Detailed Blueprint

This document specifies the exact implementation details, directory structures, configurations, and verification steps for Module 1.

---

## Submodule 1.1: Workspace & Monorepo Setup
- **Goal**: Set up npm workspaces to coordinate the frontends, APIs, workers, and package dependencies.
- **Directory Layout**:
  ```
  civique/
  ├── apps/
  │   └── web/            # Next.js frontend
  ├── services/
  │   ├── api/            # Express.js REST API
  │   ├── worker/         # BullMQ queue processor
  │   └── ml/             # Python FastAPI service
  ├── packages/
  │   ├── types/          # Shared typescript models
  │   ├── validation/     # Shared Zod validation schemas
  │   └── config/         # Shared eslint, tsconfig parameters
  ├── docs/
  ├── package.json        # Workspace configuration
  ├── tsconfig.json       # Workspace tsconfig paths
  ├── docker-compose.yml  # Local services (MongoDB, Redis)
  └── .env.example        # Reference environment keys
  ```

---

## Submodule 1.2: Environment & Local Services
- **Goal**: Setup docker compose containers and environment config templates.
- **Docker Compose**:
  - `mongodb`: MongoDB instance exposed on `27017` with `/data/db` volume mounting.
  - `redis`: Redis instance exposed on `6379` with local persistence.
- **Environment variables (`.env`)**:
  - API and client port variables.
  - Connection URIs: `MONGODB_URI`, `REDIS_URI`, `ML_SERVICE_URL`.
  - Auth signatures: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

---

## Submodule 1.3: Scaffolding App Services
1. **Next.js PWA Client (`apps/web`)**:
   - Next.js (TypeScript, App Router, Tailwind CSS, ESLint).
   - Core Route `/health/route.ts` returning a system status JSON object.
2. **Express TypeScript API (`services/api`)**:
   - Express server configured using Node.js TypeScript and ts-node-dev.
   - Core endpoint `GET /api/v1/health` verifying MongoDB database connection states.
3. **BullMQ Background Processor (`services/worker`)**:
   - Node TypeScript application with worker event bindings connected to Redis.
   - Health checking logging verification output.
4. **Python FastAPI ML Microservice (`services/ml`)**:
   - Python-based FastAPI web application.
   - Core endpoint `GET /health` verifying service availability.

---

## Submodule 1.4: Multi-Service Health & Network Check
- **Goal**: Establish cross-talk verification scripts.
- **Verification API flow**:
  - API service queries ML service `/health` and includes its state in the API health payload.
  - Client web app fetches `/api/v1/health` to confirm stack status.

---

## Tests & Verification Strategy

### 1. Database Connections Test
- Verify MongoDB can read and write records:
  ```bash
  mongosh --eval "db.adminCommand('ping')"
  ```
- Verify Redis responds to ping request:
  ```bash
  redis-cli ping
  ```

### 2. Services Health Test
We will test each health endpoint using `curl`:
- Web frontend: `curl -f http://localhost:3000/api/health`
- Express API: `curl -f http://localhost:5000/api/v1/health`
- ML Service: `curl -f http://localhost:8000/health`

### 3. Linting & Formatting Check
- Verify JavaScript/TypeScript builds correctly and matches standards:
  ```bash
  npm run typecheck && npm run lint
  ```
