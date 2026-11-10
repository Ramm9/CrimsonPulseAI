import os
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class CrimsonPulseConfig:
    """Configuration settings for CrimsonPulse telemetry collection."""
    api_key: str = field(
        default_factory=lambda: (
            os.environ.get('CRIMSONPULSE_PROJECT_KEY')
            or os.environ.get('CRIMSONPULSE_API_KEY')
            or ''
        )
    )
    api_url: str = field(
        default_factory=lambda: os.environ.get(
            'CRIMSONPULSE_API_URL', 'http://localhost:8000/api/v1/ingest/events/'
        )
    )
    environment: str = field(default_factory=lambda: os.environ.get('CRIMSONPULSE_ENV', 'production'))
    app_version: str = field(default_factory=lambda: os.environ.get('CRIMSONPULSE_APP_VERSION', '1.0.0'))

    # Security: Default to False to ensure headers like Authorization or Cookie are never sent
    capture_headers: bool = False
    capture_query: bool = True

    # Performance & Batching
    batch_size: int = 20
    flush_interval: float = 2.0  # seconds
    max_queue_size: int = 1000
    timeout: float = 5.0  # HTTP request timeout
    enabled: bool = True

    @classmethod
    def from_django_settings(cls) -> 'CrimsonPulseConfig':
        """Instantiate configuration from Django settings if available, otherwise from env."""
        try:
            from django.conf import settings
            import logging
            sdk_logger = logging.getLogger('crimsonpulse')

            # Support both CRIMSONPULSE_CONFIG and CRIMSONPULSE dictionaries
            dj_conf = getattr(settings, 'CRIMSONPULSE_CONFIG', None)
            if dj_conf is None:
                dj_conf = getattr(settings, 'CRIMSONPULSE', {})

            if not isinstance(dj_conf, dict):
                dj_conf = {}

            # Support both API_KEY and PROJECT_KEY, plus environment variables
            api_key = (
                dj_conf.get('API_KEY')
                or dj_conf.get('PROJECT_KEY')
                or os.environ.get('CRIMSONPULSE_PROJECT_KEY')
                or os.environ.get('CRIMSONPULSE_API_KEY')
                or ''
            )

            # Detect placeholder/masked keys
            if api_key and '****' in str(api_key):
                sdk_logger.warning(
                    "[CrimsonPulse SDK] Configured API key '%s' appears to be masked ('****'). "
                    "Make sure to provide the full raw secret key generated from the CrimsonPulse dashboard.",
                    api_key,
                )

            api_url = (
                dj_conf.get('API_URL')
                or os.environ.get('CRIMSONPULSE_API_URL')
                or 'http://localhost:8000/api/v1/ingest/events/'
            )

            # Normalization: Ensure api_url ends with /events/ if user supplied base /api/v1/ingest/
            if api_url.rstrip('/').endswith('/ingest'):
                api_url = api_url.rstrip('/') + '/events/'

            environment = (
                dj_conf.get('ENVIRONMENT')
                or dj_conf.get('ENV')
                or os.environ.get('CRIMSONPULSE_ENVIRONMENT')
                or os.environ.get('CRIMSONPULSE_ENV')
                or 'production'
            )

            app_version = (
                dj_conf.get('APP_VERSION')
                or dj_conf.get('SERVICE_NAME')
                or os.environ.get('CRIMSONPULSE_APP_VERSION')
                or '1.0.0'
            )

            capture_headers = dj_conf.get('CAPTURE_HEADERS', False)
            capture_query = dj_conf.get('CAPTURE_QUERY', True)
            batch_size = int(dj_conf.get('BATCH_SIZE', 20))
            flush_interval = float(dj_conf.get('FLUSH_INTERVAL', 2.0))
            max_queue_size = int(dj_conf.get('MAX_QUEUE_SIZE', 1000))
            timeout = float(dj_conf.get('TIMEOUT', 5.0))
            enabled = bool(dj_conf.get('ENABLED', True))

            return cls(
                api_key=str(api_key).strip(),
                api_url=str(api_url).strip(),
                environment=str(environment).strip(),
                app_version=str(app_version).strip(),
                capture_headers=bool(capture_headers),
                capture_query=bool(capture_query),
                batch_size=batch_size,
                flush_interval=flush_interval,
                max_queue_size=max_queue_size,
                timeout=timeout,
                enabled=enabled,
            )
        except Exception as exc:
            import logging
            logging.getLogger('crimsonpulse').debug("Error reading Django settings for CrimsonPulse: %s", exc)
            return cls()

