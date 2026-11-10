from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q
from apps.telemetry.models import TelemetryEvent
from apps.endpoints.models import Endpoint
from apps.projects.models import Project

def calculate_time_windows(time_range: str):
    """
    Returns (start_time, end_time, step_delta, num_steps) for a given time range string.
    """
    now = timezone.now()
    range_config = {
        '1h': (1, timedelta(minutes=5), 12),
        '6h': (6, timedelta(minutes=30), 12),
        '12h': (12, timedelta(hours=1), 12),
        '24h': (24, timedelta(hours=1), 24),
        '7d': (168, timedelta(hours=12), 14),
        '30d': (720, timedelta(days=1), 30),
    }

    hours, step_delta, num_steps = range_config.get(time_range, (24, timedelta(hours=1), 24))
    start_time = now - timedelta(hours=hours)
    return start_time, now, step_delta, num_steps

def get_traffic_metrics(
    user,
    project_id: str | None = None,
    time_range: str = '24h',
    environment: str | None = None,
    include_options: bool = False,
) -> list[dict]:
    """
    Calculates time-series metric windows from real TelemetryEvents.
    Filters by project, environment, and rolling time window.
    Excludes preflight OPTIONS requests from latency/volume curves unless explicitly requested.
    Returns: list of dicts matching frontend MetricWindow:
      [{ timestamp, requests, p95Latency, p50Latency, avgLatency, errorRate }]
    """
    start_time, now, step_delta, num_steps = calculate_time_windows(time_range)

    events_qs = TelemetryEvent.objects.filter(
        project__organization__memberships__user=user,
        timestamp__gte=start_time,
        timestamp__lte=now,
    )

    if project_id and project_id != 'all':
        events_qs = events_qs.filter(Q(project__id=project_id) | Q(project__slug=project_id))

    if environment and environment != 'all':
        events_qs = events_qs.filter(environment=environment)

    if not include_options:
        events_qs = events_qs.exclude(method='OPTIONS')

    all_events = list(events_qs.order_by('timestamp').values('timestamp', 'response_time_ms', 'status_code'))

    windows = []
    for step in range(num_steps):
        win_start = start_time + (step * step_delta)
        win_end = win_start + step_delta

        bucket_events = [
            e for e in all_events
            if win_start <= e['timestamp'] < win_end
        ]
        count = len(bucket_events)

        if count > 0:
            latencies = sorted([e['response_time_ms'] for e in bucket_events])
            errors = sum(1 for e in bucket_events if e['status_code'] >= 400)

            p50_idx = int(0.50 * (count - 1))
            p95_idx = int(0.95 * (count - 1))

            avg_lat = round(sum(latencies) / count, 1)
            p50_lat = round(latencies[p50_idx], 1)
            p95_lat = round(latencies[p95_idx], 1)
            err_rate = round((errors / count) * 100, 2)
        else:
            avg_lat = 0
            p50_lat = 0
            p95_lat = 0
            err_rate = 0.0

        windows.append({
            'timestamp': win_start.isoformat(),
            'requests': count,
            'p95Latency': p95_lat,
            'p50Latency': p50_lat,
            'avgLatency': avg_lat,
            'errorRate': err_rate,
        })

    return windows

def get_dashboard_summary(
    user,
    project_id: str | None = None,
    time_range: str = '24h',
    environment: str | None = None,
    include_options: bool = False,
) -> dict:
    """
    Aggregates high-level telemetry, KPI metrics, and health overview
    for the selected project, environment, and rolling time window.
    Calculates true percentiles (P50, P95, P99) and genuine window-over-window trends.
    """
    start_time, now, _, _ = calculate_time_windows(time_range)

    telemetry_qs = TelemetryEvent.objects.filter(
        project__organization__memberships__user=user,
        timestamp__gte=start_time,
        timestamp__lte=now,
    )

    endpoints_qs = Endpoint.objects.filter(project__organization__memberships__user=user)

    if project_id and project_id != 'all':
        telemetry_qs = telemetry_qs.filter(Q(project__id=project_id) | Q(project__slug=project_id))
        endpoints_qs = endpoints_qs.filter(Q(project__id=project_id) | Q(project__slug=project_id))

    if environment and environment != 'all':
        telemetry_qs = telemetry_qs.filter(environment=environment)
        endpoints_qs = endpoints_qs.filter(
            Q(telemetry_events__environment=environment) | Q(project__environment=environment)
        ).distinct()

    app_requests = telemetry_qs.exclude(method='OPTIONS').count()
    preflight_requests = telemetry_qs.filter(method='OPTIONS').count()

    if not include_options:
        telemetry_qs = telemetry_qs.exclude(method='OPTIONS')
        endpoints_qs = endpoints_qs.exclude(method='OPTIONS')
        total_requests = app_requests
    else:
        total_requests = app_requests + preflight_requests

    total_endpoints = endpoints_qs.count()
    healthy_endpoints = endpoints_qs.filter(health='healthy').count()

    # Latency and error distributions
    if total_requests > 0:
        latencies = list(telemetry_qs.order_by('response_time_ms').values_list('response_time_ms', flat=True))
        n = len(latencies)
        avg_lat = round(sum(latencies) / n, 1)
        p50_lat = round(latencies[int(0.50 * (n - 1))], 1)
        p95_lat = round(latencies[int(0.95 * (n - 1))], 1)
        p99_lat = round(latencies[int(0.99 * (n - 1))], 1)

        err_4xx = telemetry_qs.filter(status_code__gte=400, status_code__lt=500).count()
        err_5xx = telemetry_qs.filter(status_code__gte=500).count()
        total_errors = err_4xx + err_5xx
        error_rate = round((total_errors / total_requests) * 100, 2)
        client_error_rate = round((err_4xx / total_requests) * 100, 2)
        server_error_rate = round((err_5xx / total_requests) * 100, 2)

        last_ev = telemetry_qs.order_by('-timestamp').first()
        last_event_timestamp = last_ev.timestamp.isoformat() if last_ev else None
    else:
        avg_lat = 0.0
        p50_lat = 0.0
        p95_lat = 0.0
        p99_lat = 0.0
        error_rate = 0.0
        client_error_rate = 0.0
        server_error_rate = 0.0
        # If no events in current window, check latest event timestamp overall for freshness
        any_last = TelemetryEvent.objects.filter(
            project__organization__memberships__user=user
        )
        if project_id and project_id != 'all':
            any_last = any_last.filter(Q(project__id=project_id) | Q(project__slug=project_id))
        if environment and environment != 'all':
            any_last = any_last.filter(environment=environment)
        last_record = any_last.order_by('-timestamp').first()
        last_event_timestamp = last_record.timestamp.isoformat() if last_record else None

    # Calculate previous window metrics for genuine trend percentages
    window_duration = now - start_time
    prev_start = start_time - window_duration
    prev_qs = TelemetryEvent.objects.filter(
        project__organization__memberships__user=user,
        timestamp__gte=prev_start,
        timestamp__lt=start_time,
    )
    if project_id and project_id != 'all':
        prev_qs = prev_qs.filter(Q(project__id=project_id) | Q(project__slug=project_id))
    if environment and environment != 'all':
        prev_qs = prev_qs.filter(environment=environment)
    if not include_options:
        prev_qs = prev_qs.exclude(method='OPTIONS')

    prev_requests = prev_qs.count()
    if prev_requests > 0:
        requests_change = round(((total_requests - prev_requests) / prev_requests) * 100, 1)
        prev_errors = prev_qs.filter(status_code__gte=400).count()
        prev_err_rate = (prev_errors / prev_requests) * 100
        error_rate_change = round(error_rate - prev_err_rate, 2)
        prev_lats = list(prev_qs.order_by('response_time_ms').values_list('response_time_ms', flat=True))
        prev_p95 = prev_lats[int(0.95 * (len(prev_lats) - 1))]
        p95_change = round(((p95_lat - prev_p95) / prev_p95) * 100, 1) if prev_p95 > 0 else 0.0
    else:
        requests_change = 0.0 if total_requests == 0 else 100.0
        error_rate_change = 0.0
        p95_change = 0.0

    return {
        'totalRequests': total_requests,
        'appRequests': app_requests,
        'preflightRequests': preflight_requests,
        'avgLatency': avg_lat,
        'p50Latency': p50_lat,
        'p95Latency': p95_lat,
        'p99Latency': p99_lat,
        'errorRate': error_rate,
        'clientErrorRate': client_error_rate,
        'serverErrorRate': server_error_rate,
        'totalEndpoints': total_endpoints,
        'healthyEndpoints': healthy_endpoints,
        'requestsChange': requests_change,
        'errorRateChange': error_rate_change,
        'p95Change': p95_change,
        'lastEventTimestamp': last_event_timestamp,
        'timeRange': time_range,
        'environment': environment or 'all',
        'policy': 'preflight_excluded_by_default' if not include_options else 'preflight_included',
    }

