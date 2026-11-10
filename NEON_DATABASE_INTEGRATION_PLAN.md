# CrimsonPulse AI — Neon PostgreSQL Database Integration Plan

**Version:** 1.0.0  
**Date:** March 2026  
**Author:** Senior Django, PostgreSQL & Database Infrastructure Engineer  
**Status:** Phase 1 Inspection Completed — Ready for Phased Execution  

---

## 1. Executive Inspection & Architecture Review

A comprehensive audit of the existing CrimsonPulse AI codebase was performed to evaluate database configuration, model constraints, drivers, migration history, environment loading, and security boundaries.

### 1.1 Summary of Inspection Findings

| Inspection Target | Current State in Repository | Required Neon Integration Action |
| :--- | :--- | :--- |
| **Django Settings** | `backend/config/settings/base.py`, `development.py`, `production.py`. | Centralize and upgrade database configuration to support Neon pooled and direct URLs with zero-downtime switching. |
| **`DATABASES` Config** | Legacy discrete fields (`DB_NAME`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`) with default fallback to `db.sqlite3`. | Replace with robust URL parser supporting `DATABASE_URL` (pooled) and `DATABASE_URL_DIRECT` (direct). Eliminate silent fallback to SQLite. |
| **`.env` Mechanism** | `load_dotenv(BASE_DIR / '.env')` in `base.py`. No `.env` currently in repository. | Ensure `.env` is loaded reliably; document all required variables in `.env.example`. |
| **`.gitignore`** | **CRITICAL FINDING: No root or backend `.gitignore` existed.** | Create comprehensive `.gitignore` files at repository root and backend to prevent committing `.env`, `*.sqlite3`, credentials, or cache files. |
| **Drivers & Packages** | `psycopg 3.3.8` (`psycopg-binary 3.3.8`) is installed in `backend/.venv`. `dj-database-url` is **not installed**. | Use Python standard library `urllib.parse` for parsing `DATABASE_URL` and `DATABASE_URL_DIRECT`. Avoid adding external dependencies. |
| **Django Migrations** | 11 apps with migrations (accounts, organizations, projects, endpoints, telemetry, metrics, anomalies, incidents, contracts, ai_assistant, token_blacklist). | **Zero vendor-specific lock-in.** All migrations use portable Django ORM fields (`CharField`, `JSONField`, `DateTimeField`, etc.). Fully compatible with PostgreSQL. |
| **Models & Constraints** | Enterprise schema with composite indexes, foreign keys with `CASCADE` / `SET_NULL`, and `UniqueConstraint(fields=['project', 'event_id'], name='unique_project_event_id')`. | Preserve all existing models and constraints exactly as defined. |
| **Celery & Redis** | Celery configured via `django.conf:settings`. Default eager in dev, Redis broker configured via `CELERY_BROKER_URL`. | Ensure Celery workers use the Neon pooled connection with appropriate connection closure (`CONN_MAX_AGE=0`). |
| **Test Suite** | `pytest.ini` points to `config.settings.development`. 72/72 tests passing. | Support PostgreSQL testing against isolated branch/database while keeping unit test harnesses deterministic. |
| **Frontend Direct Access** | React 18 + Vite frontend inspected. | **Zero direct database access.** Frontend communicates strictly via REST APIs (`/api/v1/*`) with Axios. |

---

## 2. Answers to Specific Inspection Questions

### Q1: Is SQLite currently configured?
**Yes.** `backend/config/settings/base.py` currently checks:
```python
DB_ENGINE = os.environ.get('DB_ENGINE', 'sqlite' if os.environ.get('USE_SQLITE', 'True') == 'True' else 'postgresql')
```
If `USE_SQLITE` is not explicitly set to `False` and `DB_ENGINE` is not set, it defaults to `django.db.backends.sqlite3` pointing to `BASE_DIR / 'db.sqlite3'`. This was intended as a development scaffold and will be replaced by explicit Neon PostgreSQL integration with clear configuration errors if connection strings are missing.

### Q2: Is PostgreSQL already partially configured?
**Yes.** `base.py` has a branch for `DB_ENGINE == 'postgresql'` using discrete settings (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`). However, it does not support connection URIs (`DATABASE_URL`), does not distinguish between pooled (`-pooler`) and direct Neon endpoints, does not configure SSL options explicitly, and lacks `CONN_HEALTH_CHECKS`.

### Q3: Is `psycopg` or `psycopg[binary]` installed?
**Yes.** `psycopg 3.3.8` and `psycopg-binary 3.3.8` are installed in the virtual environment (`backend/.venv/lib/python3.11/site-packages/psycopg`), which provides modern async/sync support for Django 5.1's `django.db.backends.postgresql`.

### Q4: Is `dj-database-url` installed?
**No.** `dj-database-url` is not installed in the environment. Because the sandbox restricts external PyPI access and adding unnecessary dependencies increases supply chain risk, we will implement a clean, standard-library `urllib.parse` database URL parser tailored to Neon PostgreSQL specifications.

### Q5: Do migrations depend on PostgreSQL-specific behavior?
**No.** Inspection of all migration files confirms that none import `django.contrib.postgres.fields` (like `ArrayField` or `HStoreField`) or install PostgreSQL extensions (`CITextExtension`, `TrigramExtension`). All JSON fields use Django's standard `models.JSONField`, which PostgreSQL maps to native `jsonb`. All indexes and constraints use standard Django `Index` and `UniqueConstraint`.

### Q6: Does the frontend or any other component incorrectly access the database directly?
**No.** The frontend is a static React Single Page Application (SPA). It accesses data strictly via authenticated HTTP endpoints defined in `frontend/src/services/api.ts`. No `VITE_DATABASE_URL` or database driver exists on the client.

---

## 3. Neon PostgreSQL Architectural Strategy

### 3.1 Dual-URL Architecture (Pooled vs. Direct)

Neon provides two distinct connection endpoints per database branch:
1. **Pooled Connection (`DATABASE_URL`):**
   - Hostname format: `ep-xyz-pooler.region.aws.neon.tech`
   - Backed by Neon's built-in PgBouncer pooling layer.
   - Ideal for serverless, web APIs, short-lived web requests, and Celery tasks.
   - Requires disabling Django's persistent connections (`CONN_MAX_AGE = 0`) to avoid "double pooling" (Django holding idle connections to PgBouncer, preventing PgBouncer from reassigning server connections).
2. **Direct Connection (`DATABASE_URL_DIRECT`):**
   - Hostname format: `ep-xyz.region.aws.neon.tech` (without `-pooler`)
   - Direct connection to PostgreSQL compute engine.
   - **Required for Django migrations (`manage.py migrate`), schema alterations, and `LISTEN`/`NOTIFY`.** PgBouncer in transaction pooling mode cannot execute certain migration DDL statements (such as prepared statements or advisory locks across transactions).

### 3.2 Dynamic Route Selection Logic

```mermaid
flowchart TD
    ENV[Environment Variables] --> CHECK{DB_USE_DIRECT_URL == 'true'?}
    CHECK -- Yes (e.g. Migrations / Admin) --> DIRECT[DATABASE_URL_DIRECT<br/>ep-*.aws.neon.tech<br/>CONN_MAX_AGE = 0]
    CHECK -- No (Default: Web API & Celery) --> POOLED[DATABASE_URL<br/>ep-*-pooler.aws.neon.tech<br/>CONN_MAX_AGE = 0]
    DIRECT --> ENGINE[django.db.backends.postgresql + psycopg 3]
    POOLED --> ENGINE
    ENGINE --> NEON[(Neon PostgreSQL 16+)]
```

### 3.3 Connection Options & Safeguards
- **SSL Mode:** `sslmode=require` enforced on all connections.
- **Connection Health Checks:** `CONN_HEALTH_CHECKS = True` (Django 4.1+) to ensure dead connections to Neon compute endpoints (which can scale to zero) are automatically recycled before executing queries.
- **Fail-Fast Error Handling:** If `DATABASE_URL` (or `DATABASE_URL_DIRECT` when required) is not configured, Django will raise an `ImproperlyConfigured` exception with actionable instructions rather than silently falling back to SQLite.

---

## 4. Phased Implementation Roadmap

### Phase 2: Connect Neon PostgreSQL (Waiting on User Credentials)
- The user will create a Neon PostgreSQL project at https://neon.com/.
- The user will populate `.env` in `backend/.env` with:
  ```env
  DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler/DBNAME?sslmode=require
  DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
  DB_USE_DIRECT_URL=false
  ```
- If credentials are not yet configured, the system will pause live connection verification, provide exact configuration instructions, and proceed with code-level preparations.

### Phase 3: Configure Django Database Settings
- Implement URL parser in `backend/config/settings/database.py` or `backend/config/settings/base.py`:
  - Parses `postgresql://` and `postgres://`.
  - Extracts username, password, host, port, database name, and query parameters (`sslmode`).
  - Implements `DB_USE_DIRECT_URL` routing.
  - Sets `CONN_MAX_AGE = 0` and `CONN_HEALTH_CHECKS = True`.
  - Raises `ImproperlyConfigured` if URL is invalid or missing.
- Update `development.py` and `production.py` to inherit Neon configuration.
- Preserve test isolation for pytest.

### Phase 4: Environment & Secret Management
- Create `backend/.env.example` with exact placeholder keys for Neon.
- Create root `.gitignore` and `backend/.gitignore` ensuring `.env`, `.env.*` (except `.env.example`), `db.sqlite3`, and `*.pem` are ignored.
- Verify logging and error handling never print credentials or connection strings.

### Phase 5: Preserve Existing Database Models & Migration Validation
- Verify all existing models: `User`, `Organization`, `OrganizationMembership`, `Project`, `ProjectAPIKey`, `Endpoint`, `TelemetryEvent`, `EndpointMetricSnapshot`, `Anomaly`, `Incident`, `IncidentTimelineEvent`, `APIContractSpec`, `ContractViolation`, `Investigation`.
- Inspect existing migration tree. Ensure no migrations are deleted or altered.
- Plan safe migration execution on Neon using direct connection (`DB_USE_DIRECT_URL=true`).

### Phase 6: PostgreSQL-Specific Verification
- Run `manage.py check`.
- Run `manage.py showmigrations` with direct URL.
- Apply migrations with `manage.py migrate`.
- Verify `connection.vendor == 'postgresql'`.
- Verify PostgreSQL version and database metadata.
- Verify `unique_project_event_id` constraint enforcement on PostgreSQL.

### Phase 7: Backend Feature Verification on PostgreSQL
- Execute end-to-end integration tests on PostgreSQL:
  - Auth: Register, Login, Refresh, Logout, Profile.
  - Multi-tenancy: Organization and Project isolation.
  - Telemetry: Batch ingestion, deduplication, sensitive header sanitization.
  - Metrics & Anomalies: P50/P95 latency, error rate surge detection.
  - Incidents: Opening, timeline logging, resolution.
  - Contracts & Investigations: Spec upload and violation tracking.

### Phase 8: Celery & Redis Integration
- Verify Celery tasks (`aggregate_endpoint_metrics_task`, `evaluate_endpoint_anomalies_task`) against Neon pooled database connection.
- Ensure database connections are cleanly closed between Celery tasks.

### Phase 9: Performance, Indexing & Query Reliability
- Audit database indexes:
  - `TelemetryEvent`: `['project', '-timestamp']`, `['endpoint', '-timestamp']`, `['status_code', '-timestamp']`.
  - `Endpoint`: `(project, method, path)` unique index.
  - Foreign key indexes across all tables.
- Verify query optimization (`select_related`, `prefetch_related`) for traffic and dashboard APIs.

### Phase 10: Frontend & Deployment Compatibility
- Verify frontend API endpoints and contracts remain 100% consistent.
- Ensure no database secrets leak to frontend bundles.

### Phase 11: Comprehensive Documentation
- Generate:
  1. `NEON_DATABASE_SETUP.md`
  2. `DATABASE_ARCHITECTURE.md`
  3. `DATABASE_MIGRATION_GUIDE.md`
  4. `DATABASE_BACKUP_AND_RECOVERY.md`
  5. `DATABASE_VERIFICATION_REPORT.md`

### Phase 12: Final Definition of Done
- Audit all completion criteria with concrete command outputs and evidence.

