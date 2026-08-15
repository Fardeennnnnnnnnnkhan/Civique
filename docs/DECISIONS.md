# Architectural Decisions Log: Civique

## ADR-001: Use NPM Workspaces for Monorepo Configuration

### Date
2026-08-15

### Decision
Use npm workspaces to manage monorepo architecture, partitioning the platform into apps, services, and shared packages.

### Reason
The node host environment has Node.js (v22.22.1) and npm (9.2.0) available. Yarn and pnpm are not installed, and npm workspaces provides native, zero-dependency monorepo tracking.

### Alternatives Considered
- **Yarn Workspaces**: Cannot be used without installing yarn on the host.
- **Pnpm Workspaces**: Not available globally.

### Consequences
- Single `package.json` in the root manages general workspace paths and commands.
- Symlinks packages and workspaces locally so TypeScript dependencies compile easily.
- Workspace targets run commands globally or on specific packages (e.g. `npm run dev --workspace=apps/web`).
