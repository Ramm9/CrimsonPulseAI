# CrimsonPulse AI — Backend Architecture & System Design

## 1. Architectural Style: Modular Monolith
CrimsonPulse AI backend is structured as a **Django-based Modular Monolith**. We intentionally avoid microservices complexity while maintaining strict domain separation through decoupled Django apps.

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── config/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   └── celery.py
├── apps/
│   ├── accounts/          # Custom User model, auth serializers, profile management
│   ├── organizations/     # Multi-tenant organizations & role-based memberships
│   ├── projects/          # Project entities, cryptographic API key generation & hashing
│   ├── endpoints/         # Discovered HTTP routes & normalized API explorer
│   ├── telemetry/         # Batch ingestion gateway, high-throughput storage
│   ├── metrics/           # Hourly rollups, percentiles (P50/P95/P99), dashboard KPIs
│   ├── anomalies/         # Rule-based detector, extensible ML interface
│   ├── incidents/         # Incident grouping, lifecycle status, timeline activity
│   ├── contracts/         # OpenAPI specification parser, drift & violation analysis
│   ├── integrations/      # SDK heartbeat, webhook delivery & third-party configs
│   ├── notifications/     # Event alerts, dispatch channels
│   └── ai_assistant/      # Evidence snapshots, investigation chat, debug checklists
├── common/
│   ├── permissions.py     # Organization & project-level RBAC permissions
│   ├── pagination.py      # Standardized cursor & page number pagination
│   ├── exceptions.py      # Custom DRF exception handling & error responses
│   ├── utils.py           # Route normalizer, ID generators, hash helpers
│   └── constants.py       # Global enums, metric thresholds
└── tests/                 # Automated test suite
```

## 2. Layered Responsibilities
1. **Views & ViewSets**: Accept requests, invoke serializers for validation, call domain services, return HTTP status responses. No business logic in views.
2. **Serializers**: Validate input types and business constraints, format output representations matching frontend contracts.
3. **Services**: Encapsulate transactional mutations, API key generation, telemetry aggregation, rule evaluations.
4. **Selectors & Querysets**: Encapsulate optimized read operations, `select_related` and `prefetch_related` lookups.
5. **Permissions**: Enforce multi-tenant access control at the database query level.

