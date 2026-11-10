# CrimsonPulse Python SDK

Official telemetry collector and Django instrumentation middleware for **CrimsonPulse AI** — AI-Powered API Intelligence & Incident Management Platform.

## Quickstart

### 1. Installation

```bash
pip install crimsonpulse
```

### 2. Django Integration

Add the middleware to your Django `settings.py`:

```python
MIDDLEWARE = [
    # Add CrimsonPulse middleware near top or after security middleware
    'crimsonpulse.middleware.CrimsonPulseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # ... other middlewares
]

# CrimsonPulse Configuration
CRIMSONPULSE_CONFIG = {
    'API_KEY': os.environ.get('CRIMSONPULSE_API_KEY', 'cpk_live_your_project_key'),
    'API_URL': os.environ.get('CRIMSONPULSE_API_URL', 'http://localhost:8000/api/v1/ingest/events/'),
    'ENVIRONMENT': os.environ.get('CRIMSONPULSE_ENV', 'production'),
    'APP_VERSION': '2.4.1',
    'CAPTURE_HEADERS': False,  # Secure default: prevents credential leakage
    'CAPTURE_QUERY': True,
    'BATCH_SIZE': 20,
    'FLUSH_INTERVAL': 2.0,
}
```

### 3. Programmatic Usage (Flask, FastAPI, Celery, or Scripts)

```python
from crimsonpulse import init, get_client

init(
    api_key='cpk_live_your_project_key',
    environment='production',
    app_version='1.0.0',
)

client = get_client()
client.track_event(
    endpoint='/api/v1/orders',
    method='POST',
    status_code=201,
    response_time_ms=75.4,
)
```

## Security & Reliability Guarantee
- **Fail-Open Architecture**: Any telemetry submission error or backend unavailability never disrupts or delays the host application's HTTP response.
- **Client-Side Sanitization**: `Authorization`, `Cookie`, `Set-Cookie`, and sensitive tokens are strictly scrubbed prior to dispatch.
- **Asynchronous Batching**: Telemetry is buffered in a bounded thread-safe queue and transmitted in background worker batches.

