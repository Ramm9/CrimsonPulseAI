# CrimsonPulse AI — Local Development & Setup Guide

## Architecture Overview
CrimsonPulse AI is an enterprise observability SaaS platform featuring:
- **Backend**: Django 5.1, Django REST Framework, SimpleJWT, Celery, Redis, drf-spectacular (OpenAPI 3).
- **Database**: PostgreSQL 16 (production) with automatic SQLite development fallback.
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Recharts, Lucide.

---

## Quickstart (Local Development)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python 3.11+ virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Seed database with realistic demo projects, telemetry, anomalies, and incidents
python manage.py seed_demo_data

# Start the Django development server
python manage.py runserver 8000
```

The backend server is now running:
- **API Base**: `http://localhost:8000/api/v1/`
- **Interactive Swagger UI**: `http://localhost:8000/api/docs/`
- **Redoc Documentation**: `http://localhost:8000/api/redoc/`
- **OpenAPI Schema**: `http://localhost:8000/api/schema/`
- **Django Admin**: `http://localhost:8000/admin/`

#### Pre-seeded Demo Credentials
- **Email**: `alex.rivera@crimsonpulse.io`
- **Password**: `Password123!`
- **Role**: Organization Owner (`CrimsonPulse Labs`)
- **Projects**: `Nexus Core API` (`proj_nexus`), `Payments Gateway` (`proj_payments`), `Dispatch Service` (`proj_dispatch`)
- **API Key**: `cpk_live_nxc_7e914028bc941a87`

---

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

The frontend dashboard will be live at: `http://localhost:5173/`

To test the production build:
```bash
npm run build
```

---

### 3. Running Automated Tests
Run the comprehensive pytest test suite (32 tests covering all 10 architectural phases):

```bash
# From repository root
backend/.venv/bin/pytest backend/tests/ -v

# Or from inside backend directory
pytest tests/ -v
```

---

### 4. Simulating SDK Ingestion (Testing Telemetry Pipeline)
You can test telemetry ingestion directly using `curl` with your project API key:

```bash
curl -X POST http://localhost:8000/api/v1/ingest/events/ \
  -H "Content-Type: application/json" \
  -H "X-CrimsonPulse-Key: cpk_live_nxc_7e914028bc941a87" \
  -d '[
    {
      "endpoint": "/api/v1/orders/1982/",
      "method": "POST",
      "statusCode": 200,
      "responseTime": 135.5,
      "appVersion": "2.4.1"
    },
    {
      "endpoint": "/api/v1/orders/1983/",
      "method": "POST",
      "statusCode": 500,
      "responseTime": 1820.0,
      "error": "HTTP 500: Connection pool timeout",
      "appVersion": "2.4.1"
    }
  ]'
```

Expected Response:
```json
{
  "success": true,
  "ingested": 2,
  "projectId": "proj_nexus",
  "timestamp": "2026-11-09T09:30:00.000000+00:00"
}
```

Notice that `/api/v1/orders/1982/` and `/1983/` are automatically discovered, normalized to `/api/v1/orders/{id}/`, and dynamically evaluated for rule-based anomalies!

---

## Option B: Docker Compose Setup (PostgreSQL 16 + Redis 7 + Django + Celery)

If you prefer running fully containerized PostgreSQL and Redis services:

```bash
cd backend
docker-compose up --build
```
This automatically boots:
- PostgreSQL 16 on port `5432`
- Redis 7 on port `6379`
- Django REST Framework API on port `8000`
- Celery worker process for asynchronous processing
