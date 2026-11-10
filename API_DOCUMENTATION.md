# CrimsonPulse AI — Complete Backend API Reference

## 1. Overview & Authentication Modes

All CrimsonPulse AI REST APIs are served under the versioned prefix `/api/v1/`.

### Interactive Documentation & Schema
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **Redoc**: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **OpenAPI 3.0 Schema**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

### Security & Authentication Schemes
1. **User JWT Authentication (Dashboard & Management APIs)**
   - Header: `Authorization: Bearer <jwt_access_token>`
   - Authenticates engineers accessing workspace dashboards, configuration, and incident remediation.
2. **Project API Key Authentication (SDK Telemetry Gateway)**
   - Header: `X-CrimsonPulse-Key: cpk_live_<entropy>`
   - High-entropy cryptographic token verified against SHA-256 database hashes.
   - Used exclusively by monitored applications and the CrimsonPulse Python SDK.

---

## 2. Standardized Response & Error Format

All error responses return a uniform JSON error payload:

```json
{
  "error": true,
  "status_code": 400,
  "message": "Human readable explanation of the failure.",
  "detail": {
    "field_name": ["Specific validation error"]
  }
}
```

---

## 3. Authentication & Organization APIs (`/api/v1/auth/`, `/api/v1/organizations/`)

### Register Account
- **Endpoint**: `POST /api/v1/auth/register/`
- **Auth**: None
- **Request**:
  ```json
  {
    "name": "Alex Rivera",
    "email": "alex.rivera@crimsonpulse.io",
    "password": "Password123!",
    "organizationName": "CrimsonPulse Labs"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "user": {
      "id": "usr_94b1c8f2a1",
      "email": "alex.rivera@crimsonpulse.io",
      "name": "Alex Rivera",
      "role": "owner",
      "createdAt": "2026-11-09T09:00:00Z"
    },
    "organization": {
      "id": "org_7a8f1b2c",
      "name": "CrimsonPulse Labs",
      "slug": "crimsonpulse-labs"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokens": {
      "access": "eyJhbGciOiJIUzI1Ni...",
      "refresh": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```

### User Login
- **Endpoint**: `POST /api/v1/auth/login/`
- **Auth**: None
- **Request**:
  ```json
  {
    "email": "alex.rivera@crimsonpulse.io",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`): Same structure as registration containing user details, organization workspace, and JWT tokens.

### Current User Profile
- **Endpoint**: `GET /api/v1/auth/me/`
- **Auth**: JWT
- **Response** (`200 OK`): Returns authenticated user profile and active organization context.

### Team Members & Invitations
- **Endpoint**: `GET /api/v1/organizations/members/`
- **Auth**: JWT
- **Invite Member**: `POST /api/v1/organizations/members/`
  - Body: `{"email": "engineer@company.com", "role": "developer"}`

---

## 4. Projects & API Keys APIs (`/api/v1/projects/`, `/api/v1/keys/`)

### List Projects
- **Endpoint**: `GET /api/v1/projects/`
- **Auth**: JWT
- **Query Params**: `environment` (`production` | `staging` | `development`), `search`
- **Response** (`200 OK`): Array of Project objects formatted for frontend cards.

### Create Project
- **Endpoint**: `POST /api/v1/projects/`
- **Auth**: JWT
- **Request**:
  ```json
  {
    "name": "Order Service",
    "description": "Checkout and order processing service",
    "environment": "production",
    "baseUrl": "https://orders.nexus.internal"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "proj_a8f9c2d1e4",
    "name": "Order Service",
    "slug": "order-service",
    "environment": "production",
    "baseUrl": "https://orders.nexus.internal",
    "endpointCount": 0,
    "totalRequests": 0,
    "errorRate": 0.0,
    "health": "healthy",
    "apiKey": "cpk_live_****9850",
    "fullKey": "cpk_live_7b26092e9509488ea9a14e4202a9c5e29054cd96b7e49850",
    "createdAt": "2026-11-09T09:00:00Z"
  }
  ```
  *(Note: `fullKey` is only returned once on creation and never stored in plaintext).*

### Generate Additional API Key
- **Endpoint**: `POST /api/v1/projects/{project_id}/keys/` or `POST /api/v1/keys/`
- **Auth**: JWT
- **Request**: `{"name": "CI/CD Pipeline Key"}`

### Revoke API Key
- **Endpoint**: `POST /api/v1/keys/{key_id}/revoke/`
- **Auth**: JWT
- **Response** (`200 OK`): Returns key with `status: "revoked"`.

---

## 5. Telemetry Ingestion & Live Traffic (`/api/v1/ingest/`, `/api/v1/traffic/`)

### High-Throughput Telemetry Ingestion Gateway
- **Endpoint**: `POST /api/v1/ingest/events/`
- **Auth**: Header `X-CrimsonPulse-Key: <raw_project_key>`
- **Request**: Single object or array of telemetry events:
  ```json
  [
    {
      "endpoint": "/api/v1/orders/1824/",
      "method": "POST",
      "statusCode": 200,
      "responseTime": 142.5,
      "appVersion": "2.4.1",
      "timestamp": "2026-11-09T09:15:00Z"
    }
  ]
  ```
- **Response** (`202 Accepted`):
  ```json
  {
    "success": true,
    "ingested": 1,
    "projectId": "proj_nexus",
    "timestamp": "2026-11-09T09:15:01Z"
  }
  ```

### Live Traffic Feed
- **Endpoint**: `GET /api/v1/traffic/` or `GET /api/v1/projects/{project_id}/traffic/`
- **Auth**: JWT
- **Query Params**: `limit` (default: 50, max: 200)

### Real-Time SDK Connection Status
- **Endpoint**: `GET /api/v1/projects/{project_id}/sdk/status/`
- **Auth**: JWT
- **Response** (`200 OK`):
  ```json
  {
    "status": "connected",
    "connected": true,
    "lastSeen": "2026-11-09T09:15:00Z",
    "eventCount": 96,
    "message": "Telemetry Pipeline Connected"
  }
  ```

---

## 6. Endpoints & API Explorer (`/api/v1/endpoints/`)

### Discovered Endpoints List
- **Endpoint**: `GET /api/v1/endpoints/`
- **Auth**: JWT
- **Query Params**:
  - `projectId`: Filter by project ID or slug
  - `method`: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
  - `health`: `healthy`, `degraded`, `critical`
  - `search`: Substring search in path
  - `sortBy`: `requestCount`, `errorRate`, `p95Latency`, `lastActivity`
  - `sortOrder`: `asc`, `desc`
- **Response** (`200 OK`): Array of Endpoint objects with full status code distributions (`statusDistribution: {"2xx": N, "3xx": N, "4xx": N, "5xx": N}`).

### Endpoint Metrics Windows
- **Endpoint**: `GET /api/v1/endpoints/{id}/metrics/`
- **Auth**: JWT
- **Query Params**: `timeRange` (`1h`, `6h`, `12h`, `24h`, `7d`)

---

## 7. Metrics & Dashboard Overview (`/api/v1/metrics/`, `/api/v1/dashboard/`)

### Traffic Chart Timeseries Windows
- **Endpoint**: `GET /api/v1/metrics/traffic/`
- **Auth**: JWT
- **Query Params**: `projectId`, `timeRange` (`1h`, `6h`, `12h`, `24h`, `7d`, `30d`)
- **Response** (`200 OK`):
  ```json
  [
    {
      "timestamp": "2026-11-09T08:00:00Z",
      "requests": 240,
      "p95Latency": 184.0,
      "p50Latency": 62.0,
      "avgLatency": 85.0,
      "errorRate": 0.42
    }
  ]
  ```

### System Overview KPIs
- **Endpoint**: `GET /api/v1/dashboard/`
- **Auth**: JWT
- **Query Params**: `projectId`
- **Response** (`200 OK`):
  ```json
  {
    "totalRequests": 1284,
    "avgLatency": 82.5,
    "p95Latency": 195.0,
    "errorRate": 0.65,
    "totalEndpoints": 8,
    "healthyEndpoints": 7
  }
  ```

---

## 8. Anomalies & Incidents (`/api/v1/anomalies/`, `/api/v1/incidents/`)

### Anomalies List & Statistics
- **List**: `GET /api/v1/anomalies/` (supports `severity`, `status`, `search`)
- **Stats**: `GET /api/v1/anomalies/stats/` &rarr; `{ total, active, acknowledged, resolved, falsPositive, bySeverity, avgScore }`
- **Update Status**: `PATCH /api/v1/anomalies/{id}/` &rarr; `{"status": "acknowledged"}`

### Incidents Lifecycle & Collaboration
- **List**: `GET /api/v1/incidents/` (supports `status`, `severity`, `search`)
- **Detail**: `GET /api/v1/incidents/{id}/`
- **Update Status**: `PATCH /api/v1/incidents/{id}/` &rarr; `{"status": "investigating"}`
- **Add Comment**: `POST /api/v1/incidents/{id}/comments/` &rarr; `{"content": "..."}`
- **Assign Member**: `POST /api/v1/incidents/{id}/assign/` &rarr; `{"userId": "usr_..."}`

---

## 9. OpenAPI Contracts Validation (`/api/v1/contracts/`)

### Specifications
- **List / Upload**: `GET/POST /api/v1/contracts/specs/`
  - Accepts JSON or YAML spec content directly or via multipart file upload.
- **Get Detail**: `GET /api/v1/contracts/specs/{id}/`

### Detected Violations
- **Endpoint**: `GET /api/v1/contracts/violations/`
- **Query Params**: `specId`

---

## 10. AI Assistant & Investigation (`/api/v1/ai/`)

### Investigation Context
- **Endpoint**: `GET /api/v1/ai/investigations/{incident_id}/`
- **Auth**: JWT
- **Response** (`200 OK`):
  ```json
  {
    "id": "inv_a8f9c2",
    "incidentId": "inc_orders_latency",
    "messages": [
      {
        "id": "msg_01",
        "role": "assistant",
        "content": "### Investigation Summary...",
        "timestamp": "2026-11-09T09:00:00Z"
      }
    ],
    "evidenceCards": [
      {
        "id": "evd_01",
        "title": "Telemetry Latency Spike",
        "type": "metric",
        "content": "Observed P95 latency of 1850ms...",
        "source": "Telemetry Pipeline (Observed Data)",
        "verified": true,
        "severity": "critical"
      }
    ],
    "suggestedActions": [
      "Review recent deployment 2.4.1 (commit a8f9c2d)",
      "Inspect connection pool saturation in PostgreSQL"
    ],
    "debugChecklist": [
      {
        "id": "chk_01",
        "label": "Verify PostgreSQL connection pool limits and slow query logs",
        "completed": false,
        "priority": "high"
      }
    ]
  }
  ```

### Chat with Investigation Assistant
- **Endpoint**: `POST /api/v1/ai/investigations/{investigation_id}/messages/`
- **Auth**: JWT
- **Request**: `{"message": "What is the correlation with deployment 2.4.1?"}`

### Toggle Checklist Step
- **Endpoint**: `PATCH /api/v1/ai/checklist/{item_id}/`
- **Request**: `{"completed": true}`
