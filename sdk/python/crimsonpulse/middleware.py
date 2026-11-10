import time
import uuid
import logging
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from crimsonpulse.config import CrimsonPulseConfig
from crimsonpulse.client import CrimsonPulseClient
from crimsonpulse.scrubber import scrub_headers, scrub_query_string

logger = logging.getLogger('crimsonpulse')

# Singleton client instance for middleware reuse
_client_instance: Optional[CrimsonPulseClient] = None

def get_middleware_client() -> CrimsonPulseClient:
    global _client_instance
    if _client_instance is None:
        config = CrimsonPulseConfig.from_django_settings()
        _client_instance = CrimsonPulseClient(config)
    return _client_instance

def set_middleware_client(client: CrimsonPulseClient):
    global _client_instance
    _client_instance = client

class CrimsonPulseMiddleware:
    """
    Production-grade Django middleware for non-invasive, high-precision API telemetry.
    Uses Python's monotonic high-resolution timer (time.perf_counter) to accurately
    measure request latency with minimal CPU overhead.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.client = get_middleware_client()

    def __call__(self, request):
        if not self.client.config.enabled:
            return self.get_response(request)

        # Monotonic timer for nanosecond-precision latency
        start_time = time.perf_counter()

        response = None
        error_info = None

        try:
            response = self.get_response(request)
        except Exception as exc:
            error_info = {
                'error_type': exc.__class__.__name__,
                'error_message': str(exc)[:500],
            }
            # Re-raise to preserve Django's standard exception processing
            raise
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            status_code = response.status_code if response is not None else 500

            # Check if an exception was caught via process_exception
            if hasattr(request, '_crimsonpulse_exception'):
                error_info = request._crimsonpulse_exception

            self._record_telemetry(request, status_code, duration_ms, error_info)

        return response

    def process_exception(self, request, exception):
        """Captures unhandled exceptions before standard Django error views run."""
        request._crimsonpulse_exception = {
            'error_type': exception.__class__.__name__,
            'error_message': str(exception)[:500],
        }
        return None

    def _record_telemetry(
        self,
        request,
        status_code: int,
        duration_ms: float,
        error_info: Optional[Dict[str, str]] = None,
    ):
        """Constructs and safely enqueues the telemetry event in background queue."""
        try:
            # 1. Endpoint normalization
            path = request.path
            resolver_match = getattr(request, 'resolver_match', None)
            if resolver_match and hasattr(resolver_match, 'route') and resolver_match.route:
                r = resolver_match.route.lstrip('/')
                r = re.sub(r'^\^|\$$', '', r)
                r = re.sub(r'\(\?P<[a-zA-Z_0-9]+>[^)]+\)', '{id}', r)
                r = re.sub(r'<(?:[a-zA-Z_0-9]+:)?([a-zA-Z_0-9]+)>', '{id}', r)
                r = r.replace('^', '').replace('$', '').replace('(', '').replace(')', '')
                endpoint = f"/{r}"
            else:
                endpoint = path

            # 2. Extract Client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0].strip()
            else:
                client_ip = request.META.get('REMOTE_ADDR')

            # 3. Query string handling
            raw_query = request.META.get('QUERY_STRING', '')
            scrubbed_query = scrub_query_string(raw_query) if self.client.config.capture_query else ''

            # 4. Header handling (strictly opt-in and scrubbed)
            scrubbed_headers = {}
            if self.client.config.capture_headers:
                raw_headers = {
                    k[5:].replace('_', '-').lower(): v
                    for k, v in request.META.items()
                    if k.startswith('HTTP_')
                }
                scrubbed_headers = scrub_headers(raw_headers)

            event: Dict[str, Any] = {
                'event_id': f"evt_{uuid.uuid4().hex[:16]}",
                'endpoint': endpoint,
                'method': request.method.upper(),
                'statusCode': status_code,
                'responseTime': round(duration_ms, 2),
                'environment': self.client.config.environment,
                'appVersion': self.client.config.app_version,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }

            if error_info:
                event['error'] = f"{error_info['error_type']}: {error_info['error_message']}"

            if client_ip:
                event['client_ip'] = client_ip

            if scrubbed_query:
                event['request_query'] = scrubbed_query

            if scrubbed_headers:
                event['request_headers'] = scrubbed_headers

            user_agent = request.META.get('HTTP_USER_AGENT')
            if user_agent:
                event['user_agent'] = user_agent[:255]

            # Fail-open enqueue
            self.client.enqueue(event)

        except Exception as e:
            logger.debug("Failed to record CrimsonPulse telemetry in middleware: %s", e)


class PulseMonitoringMiddleware(CrimsonPulseMiddleware):
    """
    Deprecated alias for CrimsonPulseMiddleware.
    Maintained for backwards-compatibility with initial documentation and integration guides.
    """

    def __init__(self, get_response):
        import warnings
        warnings.warn(
            "PulseMonitoringMiddleware is deprecated and will be removed in future releases. "
            "Use crimsonpulse.middleware.CrimsonPulseMiddleware instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(get_response)


