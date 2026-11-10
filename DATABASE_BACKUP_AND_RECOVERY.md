# Database Backup, Branching & Recovery Guide — CrimsonPulse AI

**Platform:** CrimsonPulse AI — AI-Powered API Intelligence & Incident Management Platform  
**Target Provider:** Neon Serverless PostgreSQL  
**Author:** Lead Database Reliability Engineer  

---

## 1. Overview of Neon Backup Capabilities

Neon provides enterprise-grade data protection mechanisms built into its serverless storage layer:

1. **Continuous Point-in-Time Recovery (PITR):** Neon stores a continuous Write-Ahead Log (WAL) of all transactions, allowing you to restore your database to any second within your retention window (default 7 days on Free/Pro plans; up to 30 days on Enterprise).
2. **Instant Zero-Copy Branching:** Create isolated, copy-on-write clones of your production database in under 2 seconds without consuming additional storage.
3. **Standard Logical Backups (`pg_dump`):** Portable SQL dumps that can be archived to AWS S3, Cloudflare R2, or local storage.

---

## 2. Neon Instant Branching for Safe Testing

Before running major schema changes or testing disruptive operations, create a dedicated branch in Neon:

```mermaid
flowchart LR
    PROD["Production Branch (main)<br/>ep-prod-pooler.aws.neon.tech"] -->|"Instant Zero-Copy Fork"| TEST["Test Branch (test-staging)<br/>ep-test-pooler.aws.neon.tech"]
    TEST -->|"Run Migrations & QA"| VERIFY[Verify Schema & Code]
    VERIFY -->|"Merge Confirmed"| APPLY[Apply to Production]
```

### How to Create a Test Branch via Neon Console
1. In the Neon Console, navigate to the **"Branches"** tab.
2. Click **"New Branch"**.
3. Name the branch `test-staging` and select `main` as the parent.
4. Neon provisions a new isolated branch with its own pooled and direct connection strings in ~2 seconds.
5. Update your local `backend/.env` with the test branch connection strings to execute safe testing without risking production data.

---

## 3. Logical Backups using `pg_dump`

To take a complete logical snapshot of your CrimsonPulse AI database:

### Taking a Full Dump
Always use the **direct connection string** (`DATABASE_URL_DIRECT`) when running `pg_dump` to prevent pooler transaction timeouts:

```bash
# Export the direct connection string (example)
export DIRECT_URL="postgresql://USER:PASSWORD@HOST.region.aws.neon.tech/neondb?sslmode=require"

# Create a compressed custom-format archive
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="crimsonpulse_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Taking a Schema-Only Dump (DDL)
```bash
pg_dump "$DIRECT_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  --file="crimsonpulse_schema_$(date +%Y%m%d).sql"
```

### Taking a Data-Only Dump
```bash
pg_dump "$DIRECT_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --file="crimsonpulse_data_$(date +%Y%m%d).dump"
```

---

## 4. Disaster Recovery & Restoration Procedures

### Method 1: Instant PITR Restoration via Neon Console (Recommended)
If bad code, dropped tables, or accidental data truncation occurs:
1. Open the Neon Console.
2. Go to **Branches** -> Select `main` -> Click **"Restore to point in time"**.
3. Choose the exact timestamp (e.g. 5 minutes before the incident occurred).
4. Neon generates a new branch restored to that exact second.
5. Update your application's `DATABASE_URL` and `DATABASE_URL_DIRECT` to point to the restored branch. Recovery time is typically **under 1 minute**.

### Method 2: Restoring from a `pg_dump` File
To restore a `.dump` file into a fresh Neon database or local PostgreSQL:

```bash
# Syntax: pg_restore --clean --if-exists --no-owner --no-acl -d "$TARGET_DIRECT_URL" backup_file.dump
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -d "$DIRECT_URL" \
  crimsonpulse_backup_20260315_120000.dump
```

---

## 5. Automated Backup Schedule Recommendation

| Backup Type | Frequency | Retention | Target Storage |
| :--- | :--- | :--- | :--- |
| **Neon Continuous PITR** | Real-time (WAL) | 7 to 30 days | Neon Storage Engine |
| **Daily Logical Dump (`pg_dump`)** | Daily at 02:00 UTC | 90 days | Encrypted AWS S3 Bucket |
| **Pre-Deployment Snapshot** | Before every release | 30 days | Dedicated Neon Branch |

