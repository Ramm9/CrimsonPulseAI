# CrimsonPulse AI — Backend Remediation Report

**Date**: 2026-11-09  
**Platform**: CrimsonPulse AI — AI-Powered API Intelligence & Incident Management Platform  
**Status**: All 7 Remediation Stages Successfully Implemented & Verified  
**Automated Test Suite**: **59 Passed / 0 Failed (100% Pass Rate)**  
**Frontend Production Build**: **Passed (`tsc -b && vite build`)**

---

## Executive Summary

Following the comprehensive audit findings in [`BACKEND_AUDIT_REPORT.md`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/BACKEND_AUDIT_REPORT.md), a 7-stage architectural remediation was executed across the backend, Python telemetry SDK, and React frontend.

The platform now delivers:
1. **Zero-Trust Telemetry Sanitization & Idempotency**: Strict client-side and server-side credential scrubbing preventing any persistence of `Authorization`, `Cookie`, `X-Api-Key`, or sensitive query parameters; deterministic event deduplication via database uniqueness constraints with accurate counts (`accepted`, `duplicates`, `rejected`, `ingested`).
2. **Project Context Consistency**: Deep Zustand `currentProject` integration across all dashboard views (`System Overview`, `API Explorer`, `Live Traffic`, `Anomalies`, `Incidents`, `Contract Validation`, `AI Investigator`) and backend query parameter normalization (`projectId`, `project_id`, `project`), guaranteeing zero data bleed between monitored projects.
3. **Explicit Connection State & Offline Transparency**: Centralized backend connectivity tracking. Replaced silent mock fallbacks with clear indicator pills (`Live API Connected` vs `Demo Mode — Backend Disconnected`), distinguished empty database state from network failures, and surfaced informative notifications on demo state mutations.
4. **Missing Production Endpoints**: Implemented API key rotation (`POST /api/v1/projects/<id>/keys/<key_id>/rotate/` and `/api/v1/keys/<key_id>/rotate/`) with immediate old key revocation and single-exposure of new key; implemented JWT logout with token blacklisting via `rest_framework_simplejwt.token_blacklist`.
5. **Production Python SDK**: Built distributable, zero-dependency Python package (`crimsonpulse`) under `sdk/python/` with high-resolution monotonic timer (`time.perf_counter`), bounded thread-safe background batch queue, fail-open reliability guarantees, and Django `CrimsonPulseMiddleware`.
6. **Celery Background Processing**: Asynchronous worker tasks for rolling metric snapshot aggregation and deduplicated anomaly evaluation with safe eager execution fallback.
7. **End-to-End Verification**: 59 automated test cases covering authentication, multi-tenancy, telemetry ingestion, SDK instrumentation, anomaly detection, incident isolation, and background processing.

---

## Detailed Remediation Stages

### Stage 1: Security & Telemetry Integrity

#### Defects Addressed
- Sensitive headers (`Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`) were previously stored in `request_headers` JSON.
- Query string tokens (e.g. `?token=secret`) and error messages containing API keys were stored unmasked.
- Telemetry batch re-submissions duplicated records and inflated endpoint request counters.

#### Implementation & Verification
1. **Server-Side Sanitizer** ([`backend/apps/telemetry/sanitizer.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/telemetry/sanitizer.py)):
   - `sanitize_headers(headers)`: Strips `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, tokens, passwords, and secrets.
   - `sanitize_query(query_string)`: Redacts sensitive parameters (`token=[REDACTED]`, `api_key=[REDACTED]`).
   - `sanitize_error_text(text)`: Masks raw API keys (`cpk_live_...`) and bearer tokens.
   - `redact_historical_telemetry()`: Backfill utility to clean historical database records.
2. **Database Idempotency & Unique Constraint** ([`backend/apps/telemetry/models.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/telemetry/models.py)):
   - Added indexed `event_id` column to `TelemetryEvent`.
   - Added PostgreSQL `UniqueConstraint(fields=['project', 'event_id'], name='unique_project_event_id')` via migration `0002_telemetryevent_event_id_and_more.py`.
3. **Deduplication Engine** ([`backend/apps/telemetry/services.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/telemetry/services.py)):
   - Derives or extracts unique `event_id` per event.
   - Queries existing database IDs and tracks in-batch seen events.
   - Skips duplicate events: increments `duplicates` count, does NOT persist duplicates, does NOT increment endpoint counters.
   - Returns `{ 'accepted': int, 'duplicates': int, 'rejected': int, 'ingested': int }`.
4. **Automated Tests** ([`backend/tests/test_stage1_security_integrity.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/tests/test_stage1_security_integrity.py)): 7 tests passing.

---

### Stage 2: Project Context Consistency

#### Defects Addressed
- Zustand's `currentProject` was unconsumed by dashboard pages. All pages fetched global records, ignoring project selection.
- Backend views had inconsistent query parameter parsing (`projectId` vs `project_id`).

#### Implementation & Verification
1. **Universal Backend Query Parameter Parsing**:
   - Updated `LiveTrafficFeedView` ([`backend/apps/telemetry/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/telemetry/views.py)): checks `project_id`, `projectId`, `project`.
   - Updated `AnomalyListView` & `AnomalyStatsView` ([`backend/apps/anomalies/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/anomalies/views.py)).
   - Updated `EndpointListView` ([`backend/apps/endpoints/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/endpoints/views.py)).
   - Updated `IncidentListView` ([`backend/apps/incidents/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/incidents/views.py)).
   - Updated `ContractSpecListView` ([`backend/apps/contracts/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/contracts/views.py)).
   - Updated `TrafficMetricsView` & `DashboardOverviewView` ([`backend/apps/metrics/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/metrics/views.py)).
2. **Frontend Store & Topbar Integration**:
   - Added `projects: Project[]` and `setProjects` to [`frontend/src/store/appStore.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/store/appStore.ts).
   - Added Project Selector dropdown to [`frontend/src/components/layout/Topbar.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/components/layout/Topbar.tsx), allowing one-click global context switching between "All Projects" and individual projects.
3. **Dashboard Pages Scoping**:
   - [`DashboardPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/DashboardPage.tsx): Subscribes to `currentProject`, passes to `getTrafficMetrics`, `getEndpoints`, `getIncidents`, re-fetches on change, displays active project indicator.
   - [`APIExplorerPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/APIExplorerPage.tsx): Scoped to `currentProject`.
   - [`LiveTrafficPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/LiveTrafficPage.tsx): Scoped to `currentProject`, filters live stream.
   - [`AnomaliesPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/AnomaliesPage.tsx): Scoped to `currentProject`.
   - [`IncidentsPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/IncidentsPage.tsx): Scoped to `currentProject`.
   - [`ContractsPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/ContractsPage.tsx): Scoped to `currentProject`.
   - [`AIInvestigatorPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/AIInvestigatorPage.tsx): Scoped to `currentProject`.
   - [`ProjectDetailsPage.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/pages/ProjectDetailsPage.tsx): Synchronizes `setCurrentProject(id)` on page load.
4. **Automated Tests** ([`backend/tests/test_stage2_project_context.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/tests/test_stage2_project_context.py)): 5 multi-project tests passing.

---

### Stage 3: Visible Offline & Demo Simulation Mode

#### Defects Addressed
- Frontend services silently caught network failures and returned mock data without alerting the user.
- If the backend returned an empty array `[]` (e.g. empty database or new project), services checked `&& res.data.length > 0` and improperly replaced empty results with synthetic mock data.
- Offline mutations (login, project creation, contract upload) created an illusion of real database persistence.

#### Implementation & Verification
1. **Centralized Health Probing & Connection State** ([`frontend/src/services/api.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/api.ts)):
   - Axios response interceptor sets `backendConnected: true` on valid backend responses.
   - Axios error interceptor detects `ERR_NETWORK` / `ECONNREFUSED` / missing response and sets `backendConnected: false`.
   - `checkBackendHealth()` actively probes `GET /api/v1/health/` on application initialization in [`frontend/src/App.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/App.tsx).
2. **Topbar & Dashboard Connection Pill** ([`frontend/src/components/layout/Topbar.tsx`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/components/layout/Topbar.tsx)):
   - Online: Glowing green badge `Live API Connected` (Live PostgreSQL Telemetry Pipeline).
   - Offline: Glowing amber badge `Demo Mode — Backend Disconnected` with informative tooltip.
3. **Empty Database vs Network Failure Distinction**:
   - Fixed `if (Array.isArray(res.data))` across all services ([`projectService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/projectService.ts), [`endpointService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/endpointService.ts), [`telemetryService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/telemetryService.ts), [`anomalyService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/anomalyService.ts), [`incidentService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/incidentService.ts), [`contractService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/contractService.ts), [`aiService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/aiService.ts), [`integrationService.ts`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/frontend/src/services/integrationService.ts)).
   - Empty database rows `[]` return legitimate empty states; mock fallbacks only activate when the backend is physically offline.
4. **Transparent Mutation Notifications**:
   - Added `notifyDemoMutation(operation, details)` helper in `api.ts`.
   - Surfacing warning toasts when mutations execute in local demo state without backend persistence.

---

### Stage 4: Missing Production Endpoints

#### Defects Addressed
- API key rotation endpoint was missing from `urls.py` and `views.py`.
- JWT logout endpoint was absent, and revoked refresh tokens were not blacklisted.

#### Implementation & Verification
1. **Project API Key Rotation**:
   - Created `ProjectAPIKeyRotateView` in [`backend/apps/projects/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/projects/views.py).
   - Wired routes:
     - `POST /api/v1/projects/<project_id>/keys/<key_id>/rotate/`
     - `POST /api/v1/keys/<key_id>/rotate/`
   - Atomically revokes old key, provisions new replacement key, returns single-exposure `fullKey`.
2. **JWT Logout & Blacklisting**:
   - Added `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS` and configured `BLACKLIST_AFTER_ROTATION: True` in [`backend/config/settings/base.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/config/settings/base.py).
   - Applied SimpleJWT migrations (`token_blacklist.0001` through `0013`).
   - Implemented `LogoutView` in [`backend/apps/accounts/views.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/accounts/views.py) blacklisting submitted refresh tokens.
   - Wired `POST /api/v1/auth/logout/` in [`backend/apps/accounts/urls.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/accounts/urls.py).
3. **Automated Tests** ([`backend/tests/test_stage4_missing_endpoints.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/tests/test_stage4_missing_endpoints.py)): 3 tests passing.

---

### Stage 5: Distributable Python SDK

#### Defects Addressed
- Monitored services lacked a real, installable Python SDK client and Django middleware.

#### Implementation & Verification
1. **Package Structure** ([`sdk/python/`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python)):
   - [`pyproject.toml`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/pyproject.toml) & [`setup.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/setup.py): Package `crimsonpulse` v1.0.0.
   - [`README.md`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/README.md): Detailed installation and integration guide.
   - [`crimsonpulse/config.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/crimsonpulse/config.py): Environment-variable and Django settings-based configuration.
   - [`crimsonpulse/scrubber.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/crimsonpulse/scrubber.py): Client-side header and query parameter scrubber.
   - [`crimsonpulse/client.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/crimsonpulse/client.py): Thread-safe, non-blocking telemetry client using bounded `queue.Queue` and background daemon worker with zero external dependencies (pure Python standard library).
   - [`crimsonpulse/middleware.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/crimsonpulse/middleware.py): High-precision `CrimsonPulseMiddleware` wrapping Django requests using `time.perf_counter()`.
   - [`crimsonpulse/__init__.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/crimsonpulse/__init__.py): Public exports (`init`, `get_client`, `CrimsonPulseMiddleware`, `CrimsonPulseConfig`).
2. **Local Installation**:
   - Installed in virtual environment via `python setup.py develop --no-deps`. Verified importable (`crimsonpulse 1.0.0`).
3. **Automated Tests** ([`sdk/python/tests/test_sdk_integration.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/sdk/python/tests/test_sdk_integration.py) & [`backend/tests/test_sdk.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/tests/test_sdk.py)): 6 tests passing.

---

### Stage 6: Background Processing & Celery Tasks

#### Defects Addressed
- Need reliable asynchronous tasks for heavy metric aggregation and anomaly detection without duplicate task runs.

#### Implementation & Verification
1. **Telemetry Metric Aggregation Task** ([`backend/apps/telemetry/tasks.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/telemetry/tasks.py)):
   - `aggregate_endpoint_metrics_task(endpoint_id)`: Asynchronously recalculates 24-hour latency percentiles (`p50`, `p95`, `p99`), error rate, status distribution, and health categorization from `TelemetryEvent` records.
2. **Anomaly Evaluation Task** ([`backend/apps/anomalies/tasks.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/apps/anomalies/tasks.py)):
   - `evaluate_endpoint_anomalies_task(endpoint_id)`: Asynchronously detects statistical performance shifts, creates or links open incidents, and enforces cooldowns preventing duplicate anomaly entries.
3. **Safe Local Execution**:
   - Configured `CELERY_TASK_ALWAYS_EAGER = True` for environments without active Redis/Celery workers.
4. **Automated Tests** ([`backend/tests/test_stage6_background_processing.py`](file:///Users/devanasriram/Documents/CRIMSONPULSEAI/backend/tests/test_stage6_background_processing.py)): 3 tests passing.

---

## Complete Test Suite Breakdown

Ran full test session with `pytest backend/tests/`:

| Test Module | Coverage Area | Tests | Status |
|:---|:---|:---:|:---:|
| `test_stage1_security_integrity.py` | Header scrubbing, query sanitization, idempotency, unique constraints | 7 | **PASSED** |
| `test_stage2_project_context.py` | Multi-project traffic, endpoints, anomalies, stats, incidents, contracts | 5 | **PASSED** |
| `test_stage4_missing_endpoints.py` | API key rotation, single-exposure secret, JWT logout, token blacklist | 3 | **PASSED** |
| `test_stage6_background_processing.py` | Celery metric aggregation, anomaly detection deduplication, skips | 3 | **PASSED** |
| `test_sdk.py` | Client scrubber, fail-open queue overflow, Django middleware, E2E dispatch | 6 | **PASSED** |
| `test_telemetry_ingest.py` | Key verification, batch ingestion, route discovery, live feed, SDK status | 5 | **PASSED** |
| `test_anomalies_incidents.py` | Anomaly rules, status transitions, incident comments, assignments | 3 | **PASSED** |
| `test_investigations.py` | Evidence retrieval, strict incident context isolation, AI checklist | 3 | **PASSED** |
| `test_contracts.py` | OpenAPI spec upload, parsing, validation, violation detection | 2 | **PASSED** |
| `test_metrics_dashboard.py` | 24h traffic windows, empty project resilience, KPI summary, timeseries | 4 | **PASSED** |
| `test_projects.py` | Multi-tenant isolation, default key provisioning, CRUD, key revoke | 4 | **PASSED** |
| `test_auth_and_org.py` | User registration, login, JWT issuance, profile updates, memberships | 7 | **PASSED** |
| `test_accounts.py` | Custom User model, email normalization, validation, superuser | 4 | **PASSED** |
| `test_audit_e2e_pipeline.py` | Full multi-tenant pipeline from scratch, revoked key rejection, duplicates | 3 | **PASSED** |
| **Total** | **Comprehensive Full-Stack Coverage** | **59** | **ALL PASSED** |

---

## File Modification Inventory

### Backend Files Created / Modified
- `backend/apps/telemetry/sanitizer.py` *(Created: Header, query, and error sanitization)*
- `backend/apps/telemetry/models.py` *(Modified: Added event_id and UniqueConstraint)*
- `backend/apps/telemetry/migrations/0002_telemetryevent_event_id_and_more.py` *(Created: Database migration with data backfill)*
- `backend/apps/telemetry/services.py` *(Modified: Implemented idempotency and count reporting)*
- `backend/apps/telemetry/views.py` *(Modified: Multi-query parameter support in LiveTrafficFeedView)*
- `backend/apps/telemetry/tasks.py` *(Created: Celery metric aggregation task)*
- `backend/apps/anomalies/views.py` *(Modified: Scoped AnomalyListView and AnomalyStatsView by project)*
- `backend/apps/anomalies/tasks.py` *(Created: Celery anomaly evaluation task)*
- `backend/apps/endpoints/views.py` *(Modified: Scoped EndpointListView by project)*
- `backend/apps/incidents/views.py` *(Modified: Scoped IncidentListView by project)*
- `backend/apps/contracts/views.py` *(Modified: Scoped ContractSpecListView by project)*
- `backend/apps/metrics/views.py` *(Modified: Scoped TrafficMetricsView and DashboardOverviewView by project)*
- `backend/apps/projects/views.py` *(Modified: Added ProjectAPIKeyRotateView)*
- `backend/apps/projects/urls.py` *(Modified: Added project key rotate route)*
- `backend/apps/accounts/views.py` *(Modified: Added LogoutView with SimpleJWT blacklisting)*
- `backend/apps/accounts/urls.py` *(Modified: Added logout route)*
- `backend/config/urls.py` *(Modified: Added HealthCheckView, global key rotate route, telemetry traffic route)*
- `backend/config/settings/base.py` *(Modified: Added rest_framework_simplejwt.token_blacklist, BLACKLIST_AFTER_ROTATION)*

### SDK Files Created
- `sdk/python/pyproject.toml`
- `sdk/python/setup.py`
- `sdk/python/README.md`
- `sdk/python/crimsonpulse/__init__.py`
- `sdk/python/crimsonpulse/config.py`
- `sdk/python/crimsonpulse/client.py`
- `sdk/python/crimsonpulse/middleware.py`
- `sdk/python/crimsonpulse/scrubber.py`
- `sdk/python/crimsonpulse/exceptions.py`
- `sdk/python/tests/test_sdk_integration.py`

### Frontend Files Modified
- `frontend/src/store/appStore.ts` *(Added projects array, backendConnected state, isDemoMode)*
- `frontend/src/components/layout/Topbar.tsx` *(Added Project Selector dropdown, dynamic Live API vs Demo pill)*
- `frontend/src/services/api.ts` *(Added connection status tracking, checkBackendHealth, notifyDemoMutation)*
- `frontend/src/App.tsx` *(Added startup checkBackendHealth probe)*
- `frontend/src/pages/DashboardPage.tsx` *(Scoped queries by currentProject, added project pill)*
- `frontend/src/pages/APIExplorerPage.tsx` *(Scoped queries by currentProject)*
- `frontend/src/pages/LiveTrafficPage.tsx` *(Scoped queries by currentProject)*
- `frontend/src/pages/AnomaliesPage.tsx` *(Scoped queries by currentProject)*
- `frontend/src/pages/IncidentsPage.tsx` *(Scoped queries by currentProject)*
- `frontend/src/pages/ContractsPage.tsx` *(Scoped queries by currentProject)*
- `frontend/src/pages/AIInvestigatorPage.tsx` *(Scoped incidents by currentProject)*
- `frontend/src/pages/ProjectDetailsPage.tsx` *(Synced currentProject on load, passed projectId to metrics)*
- `frontend/src/services/telemetryService.ts` *(Fixed empty array fallback, added projectId)*
- `frontend/src/services/projectService.ts` *(Fixed empty array fallback, added demo mutation toasts)*
- `frontend/src/services/endpointService.ts` *(Fixed empty array fallback)*
- `frontend/src/services/anomalyService.ts` *(Fixed empty array fallback, added projectId to stats)*
- `frontend/src/services/incidentService.ts` *(Fixed empty array fallback)*
- `frontend/src/services/contractService.ts` *(Fixed empty array fallback)*
- `frontend/src/services/authService.ts` *(Added demo mutation toasts)*
- `frontend/src/services/aiService.ts` *(Fixed empty array fallback)*
- `frontend/src/services/integrationService.ts` *(Fixed empty array fallback)*

### Test Files Created
- `backend/tests/test_stage1_security_integrity.py`
- `backend/tests/test_stage2_project_context.py`
- `backend/tests/test_stage4_missing_endpoints.py`
- `backend/tests/test_stage6_background_processing.py`
- `backend/tests/test_sdk.py`

---

## Machine Learning & Advanced Observability Extension Points

The platform is cleanly architected for direct plug-in of future Scikit-learn / PyTorch ML pipelines:
1. **Unsupervised Anomaly Model Insertion**:
   - `apps/anomalies/services.py` contains `evaluate_endpoint_anomalies`. The existing deterministic rule model (`cp-rule-detector-v1.0`) can be seamlessly supplemented or replaced by calling an `IsolationForest` or `OneClassSVM` model trained on historical `TelemetryEvent` hourly buckets.
2. **Feature Extraction Pipeline**:
   - `aggregate_endpoint_metrics_task` computes high-dimension feature vectors (`response_time_ms` quantiles, status code entropy, error rates, request volume velocity).
3. **Incident Correlation & Root Cause Analysis**:
   - `apps/ai_assistant/services.py` (`get_or_create_investigation`) exposes telemetry evidence vectors directly to LLM prompts, mapping deployment events and metric anomalies to structured hypotheses and remediation checklists.

