from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def aggregate_endpoint_metrics_task(self, endpoint_id: str):
    """
    Recalculates latency distributions and error rates for an endpoint
    from recent TelemetryEvent records.
    """
    try:
        endpoint = Endpoint.objects.filter(id=endpoint_id).first()
        if not endpoint:
            return {'status': 'skipped', 'reason': f'Endpoint {endpoint_id} not found'}

        # Calculate metrics from actual events in the last 24h
        since = timezone.now() - timedelta(hours=24)
        events = TelemetryEvent.objects.filter(endpoint=endpoint, timestamp__gte=since)
        count = events.count()

        if count == 0:
            return {'status': 'noop', 'endpoint_id': endpoint_id}

        durations = list(events.order_by('response_time_ms').values_list('response_time_ms', flat=True))
        status_5xx = events.filter(status_code__gte=500).count()
        status_4xx = events.filter(status_code__gte=400, status_code__lt=500).count()

        p50 = durations[int(count * 0.50)] if durations else 0.0
        p95 = durations[int(count * 0.95)] if durations else 0.0
        p99 = durations[int(count * 0.99)] if durations else 0.0
        avg_lat = round(sum(durations) / count, 2) if count else 0.0
        error_rate = round((status_5xx / count) * 100.0, 2) if count else 0.0

        # Determine health status
        if error_rate >= 10.0 or p95 >= 2000.0:
            health = 'critical'
        elif error_rate >= 2.0 or p95 >= 800.0:
            health = 'degraded'
        else:
            health = 'healthy'

        endpoint.request_count = count
        endpoint.avg_latency = avg_lat
        endpoint.p50_latency = p50
        endpoint.p95_latency = p95
        endpoint.p99_latency = p99
        endpoint.error_rate = error_rate
        endpoint.health = health
        endpoint.status_5xx = status_5xx
        endpoint.status_4xx = status_4xx
        endpoint.save()

        return {
            'status': 'success',
            'endpoint_id': endpoint_id,
            'request_count': count,
            'error_rate': error_rate,
            'p95': p95,
            'health': health,
        }
    except Exception as exc:
        logger.error("Error aggregating endpoint metrics for %s: %s", endpoint_id, exc)
        raise self.retry(exc=exc)

