# Neon PostgreSQL Setup Guide — CrimsonPulse AI

**Platform:** CrimsonPulse AI — AI-Powered API Intelligence & Incident Management Platform  
**Target Provider:** [Neon Serverless PostgreSQL](https://neon.com/)  
**Database Driver:** `psycopg` 3 (`psycopg[binary]>=3.1.18`)  
**Django Version:** 5.1+  

---

## 1. Overview & Connection Architecture

Neon provides serverless PostgreSQL with autoscaling, instant branching, and built-in connection pooling via PgBouncer.

CrimsonPulse AI uses a **Dual-URL connection strategy** to optimize performance and guarantee migration safety:

```mermaid
flowchart TD
    subgraph Client["CrimsonPulse Services"]
        API["Django Web / REST API"]
        CELERY["Celery Background Worker"]
        MIGRATE["Django Migrations (manage.py)"]
    end

    subgraph Neon["Neon Serverless PostgreSQL"]
        PGBOUNCER["Neon PgBouncer Pooler<br/>(ep-*-pooler.region.aws.neon.tech)"]
        COMPUTE["Neon Direct Compute Engine<br/>(ep-*.region.aws.neon.tech)"]
        STORAGE["Neon Shared Storage Engine"]
    end

    API -->|"DATABASE_URL<br/>(DB_USE_DIRECT_URL=false)"| PGBOUNCER
    CELERY -->|"DATABASE_URL<br/>(DB_USE_DIRECT_URL=false)"| PGBOUNCER
    MIGRATE -->|"DATABASE_URL_DIRECT<br/>(DB_USE_DIRECT_URL=true)"| COMPUTE

    PGBOUNCER --> COMPUTE
    COMPUTE --> STORAGE
```

- **Pooled URL (`DATABASE_URL`):** Connects through Neon's PgBouncer proxy (`-pooler` in hostname). Used for web requests and Celery tasks to efficiently handle thousands of concurrent queries without exhausting database backend processes.
- **Direct URL (`DATABASE_URL_DIRECT`):** Connects directly to the PostgreSQL compute instance (without `-pooler` in hostname). Required for schema migrations, table creation, and DDL commands that require transaction-spanning session locks.

---

## 2. Step-by-Step Neon Project Setup

### Step 1: Create a Neon Account & Project
1. Navigate to [https://neon.tech](https://neon.tech) (or [https://neon.com](https://neon.com)) and sign in.
2. In the Neon Console, click **"New Project"**.
3. Configure your project settings:
   - **Project Name:** `crimsonpulse-ai` (or your preferred name).
   - **Postgres Version:** `16` (recommended) or `15`.
   - **Region:** Choose the AWS region closest to your application deployment (e.g., `AWS US East (N. Virginia)` / `us-east-1` or `AWS US East (Ohio)` / `us-east-2`).
4. Click **"Create Project"**.

### Step 2: Retrieve Connection Strings from Neon Console
Neon displays your database connection details on the project dashboard:

1. **Pooled Connection String (`DATABASE_URL`):**
   - Ensure the **"Pooled connection"** checkbox is **checked** in the connection details dialog.
   - Look at the hostname: it will contain `-pooler`, for example:
     `ep-bold-glade-pooler-a5xyz.us-east-2.aws.neon.tech`
   - Copy this connection string. It will look like:
     ```text
     postgresql://neondb_owner:npg_SecretPass123@ep-bold-glade-pooler-a5xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

2. **Direct Connection String (`DATABASE_URL_DIRECT`):**
   - Uncheck the **"Pooled connection"** checkbox in the Neon connection details dialog.
   - Look at the hostname: it will **NOT** contain `-pooler`, for example:
     `ep-bold-glade-a5xyz.us-east-2.aws.neon.tech`
   - Copy this direct connection string. It will look like:
     ```text
     postgresql://neondb_owner:npg_SecretPass123@ep-bold-glade-a5xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

---

## 3. Local Environment Configuration

1. In your local repository, copy the example environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` in your text editor and insert your actual connection strings:
   ```env
   # ==============================================================================
   # Neon PostgreSQL Connection Configuration
   # ==============================================================================
   DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.region.aws.neon.tech/DBNAME?sslmode=require
   DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST.region.aws.neon.tech/DBNAME?sslmode=require
   DB_USE_DIRECT_URL=false
   ```
3. Verify that `sslmode=require` is present at the end of both URLs. Neon requires encrypted SSL connections.
4. **Security Notice:** Never commit `backend/.env` to Git. The `.gitignore` file is configured to ignore all `.env` files automatically.

---

## 4. Applying Migrations to Neon

Because schema migrations run DDL commands (such as `CREATE TABLE`, `ALTER TABLE`, and composite index creation), you must use the **direct connection string**:

```bash
# 1. Run migrations using the direct Neon URL
DB_USE_DIRECT_URL=true python backend/manage.py migrate

# 2. Inspect applied migrations
DB_USE_DIRECT_URL=true python backend/manage.py showmigrations
```

---

## 5. Verifying Neon Connection

Run the Django shell to inspect the active database vendor and connection metadata without exposing credentials:

```bash
# Verify database vendor
python backend/manage.py shell -c "from django.db import connection; print('Connected vendor:', connection.vendor)"
```

**Expected Output:**
```text
Connected vendor: postgresql
```

To view a sanitized connection summary:
```bash
python backend/manage.py shell -c "
from django.conf import settings
from config.settings.database import get_safe_connection_summary
print(get_safe_connection_summary(settings.DATABASES))
"
```

**Expected Output:**
```text
PostgreSQL [host=ep-sample-pooler.us-east-2.aws.neon.tech, db=neondb, user=neondb_owner, pooler=True, ssl=require]
```

---

## 6. Celery Worker Configuration

Celery workers in CrimsonPulse process background metric aggregations and evaluate anomaly rules.

Workers connect using the **pooled connection string** (`DATABASE_URL`) with `CONN_MAX_AGE = 0`. An automatic signal handler in [`backend/config/celery.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/config/celery.py) ensures database connections are cleanly closed after each task, preventing connection buildup in Neon's PgBouncer pool.

To launch the worker:
```bash
cd backend
celery -A config worker --loglevel=INFO -c 4
```

---

## 7. Production Deployment Checklist

When deploying to cloud platforms (Railway, Render, AWS ECS, Fly.io):
1. Set `DATABASE_URL` in your platform's environment secrets to the **pooled connection string**.
2. Set `DATABASE_URL_DIRECT` in your platform's environment secrets to the **direct connection string**.
3. Configure your release / pre-deploy migration step to run with `DB_USE_DIRECT_URL=true`:
   ```bash
   DB_USE_DIRECT_URL=true python manage.py migrate
   ```
4. Set `DB_USE_DIRECT_URL=false` for the main web service container and Celery worker service.
5. Deploy the backend and frontend in the same geographic cloud region as your Neon database to minimize latency.

