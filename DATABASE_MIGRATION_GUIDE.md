# Neon PostgreSQL Migration Guide — CrimsonPulse AI

**Platform:** CrimsonPulse AI — AI-Powered API Intelligence & Incident Management Platform  
**Applies To:** Django 5.1 Migrations with Neon Serverless PostgreSQL  
**Author:** Lead Database Infrastructure Engineer  

---

## 1. Migration Overview & Prerequisites

Django database migrations execute Data Definition Language (DDL) operations (such as `CREATE TABLE`, `ALTER TABLE`, and composite index creation).

### Critical Rule for Neon PostgreSQL
Neon's pooled connection endpoint (`-pooler` in hostname) uses **PgBouncer in transaction pooling mode**. Transaction poolers do not support prepared statements, session-level advisory locks, or certain cross-transaction DDL operations.

Therefore:
> **All Django migrations MUST be executed against the DIRECT connection string (`DATABASE_URL_DIRECT`).**

CrimsonPulse AI provides a dedicated environment switch to select the direct connection for migrations:
```bash
DB_USE_DIRECT_URL=true
```

---

## 2. Standard Migration Workflow

### Step 1: Confirm Environment Configuration
Ensure your `backend/.env` file contains both connection strings:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.region.aws.neon.tech/DBNAME?sslmode=require
DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST.region.aws.neon.tech/DBNAME?sslmode=require
DB_USE_DIRECT_URL=false
```

### Step 2: Inspect Migration Status Before Migrating
Run `showmigrations` with `DB_USE_DIRECT_URL=true` to see pending migrations:
```bash
cd backend
DB_USE_DIRECT_URL=true python manage.py showmigrations
```

Unapplied migrations are displayed with `[ ]`:
```text
accounts
 [ ] 0001_initial
organizations
 [ ] 0001_initial
projects
 [ ] 0001_initial
...
```

### Step 3: Apply All Migrations
Run `migrate` using the direct connection:
```bash
DB_USE_DIRECT_URL=true python manage.py migrate
```

**Expected Output:**
```text
Operations to perform:
  Apply all migrations: accounts, admin, ai_assistant, anomalies, auth, contenttypes, contracts, endpoints, incidents, metrics, organizations, projects, sessions, telemetry, token_blacklist
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
  Applying telemetry.0001_initial... OK
  Applying telemetry.0002_telemetryevent_event_id_and_more... OK
```

### Step 4: Verify Migration Success
Verify that all migrations now show `[X]`:
```bash
DB_USE_DIRECT_URL=true python manage.py showmigrations
```

---

## 3. Creating New Schema Migrations

When you add new fields or models to the Django application:

1. Update your Django models in `backend/apps/*/models.py`.
2. Generate the migration file:
   ```bash
   python backend/manage.py makemigrations
   ```
3. Inspect the newly generated migration file in `backend/apps/<app_name>/migrations/`.
4. Apply the migration to Neon using the direct connection:
   ```bash
   DB_USE_DIRECT_URL=true python backend/manage.py migrate
   ```

---

## 4. Rollback & Failure Recovery Procedures

### Scenario A: Rolling Back a Specific Migration
To roll back an applied migration to a previous version:

```bash
# Syntax: DB_USE_DIRECT_URL=true python manage.py migrate <app_name> <target_migration_number>
# Example: Roll back telemetry to migration 0001
DB_USE_DIRECT_URL=true python backend/manage.py migrate telemetry 0001
```

To roll back all migrations for an app:
```bash
DB_USE_DIRECT_URL=true python backend/manage.py migrate telemetry zero
```

### Scenario B: Migration Interrupted by Network Drop
Because Neon computes scale to zero or network hiccups can interrupt long-running migrations:
1. Re-run `showmigrations` to inspect which migration was in progress:
   ```bash
   DB_USE_DIRECT_URL=true python backend/manage.py showmigrations
   ```
2. If PostgreSQL rolled back the transaction cleanly (Django migrations run inside atomic transactions by default), re-run:
   ```bash
   DB_USE_DIRECT_URL=true python backend/manage.py migrate
   ```
3. If an index or constraint was created partially, connect via direct URL and inspect `pg_indexes`:
   ```bash
   DB_USE_DIRECT_URL=true python backend/manage.py dbshell
   ```
   Query:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cp_telemetry_events';
   ```

### Scenario C: NEVER Use `migrate --fake`
Never use `migrate --fake` to bypass a real error or conceal a missing table. If a table is missing, resolve the root model definition or re-run the prerequisite migration.

---

## 5. Automated CI/CD & Deployment Migrations

In automated CI/CD pipelines (GitHub Actions, Railway, Render, Docker):
Configure the deployment release command to explicitly set `DB_USE_DIRECT_URL=true`:

```yaml
# Example Release Command in Railway / Render / Procfile:
release: DB_USE_DIRECT_URL=true python backend/manage.py migrate --noinput
```

Ensure the runtime web process does **NOT** set `DB_USE_DIRECT_URL=true` (keeping `DB_USE_DIRECT_URL=false` to use the pooled endpoint).

