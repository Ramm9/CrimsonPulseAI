from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema
from apps.endpoints.models import Endpoint
from apps.endpoints.serializers import EndpointSerializer
from apps.telemetry.models import TelemetryEvent
from common.exceptions import NotFoundError

class EndpointListView(APIView):
    """
    List discovered API endpoints for a project or workspace,
    with filtering, searching, and sorting support.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: EndpointSerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        queryset = Endpoint.objects.filter(
            project__organization__memberships__user=request.user,
        )

        proj_param = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_param and proj_param != 'all':
            queryset = queryset.filter(Q(project__id=proj_param) | Q(project__slug=proj_param))

        # Filter by Environment
        env = request.query_params.get('environment') or request.query_params.get('env')
        if env and env != 'all':
            queryset = queryset.filter(
                Q(telemetry_events__environment=env) | Q(project__environment=env)
            ).distinct()

        # Filter by timeRange (active endpoints in selected window)
        time_range = request.query_params.get('timeRange') or request.query_params.get('range')
        if time_range and time_range != 'all':
            from apps.metrics.services import calculate_time_windows
            start_time, end_time, _, _ = calculate_time_windows(time_range)
            queryset = queryset.filter(
                Q(telemetry_events__timestamp__gte=start_time, telemetry_events__timestamp__lte=end_time) |
                Q(last_activity__gte=start_time)
            ).distinct()

        # Filter by HTTP method
        method = request.query_params.get('method')
        if method and method.upper() != 'ALL':
            queryset = queryset.filter(method=method.upper())

        # Exclude preflight OPTIONS if requested
        if request.query_params.get('excludeOptions', '').lower() in ('true', '1') or request.query_params.get('hide_options', '').lower() in ('true', '1'):
            queryset = queryset.exclude(method='OPTIONS')

        # Filter by health status
        health = request.query_params.get('health')
        if health:
            queryset = queryset.filter(health=health)

        # Search in path
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(path__icontains=search)

        # Sorting
        sort_by = request.query_params.get('sortBy', 'requestCount')
        sort_order = request.query_params.get('sortOrder', 'desc')
        sort_field_map = {
            'requestCount': 'request_count',
            'errorRate': 'error_rate',
            'p95Latency': 'p95_latency',
            'lastActivity': 'last_activity',
        }
        db_sort = sort_field_map.get(sort_by, 'request_count')
        if sort_order == 'desc':
            db_sort = f"-{db_sort}"

        endpoints = queryset.order_by(db_sort)
        serializer = EndpointSerializer(endpoints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class EndpointDetailView(APIView):
    """Retrieve detailed telemetry profile for a specific endpoint."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: EndpointSerializer})
    def get(self, request, endpoint_id: str):
        # Support flexible ID matching (e.g. ep_01, ep-001)
        endpoint = Endpoint.objects.filter(
            project__organization__memberships__user=request.user,
        ).filter(
            Q(id=endpoint_id) |
            Q(id=endpoint_id.replace('-', '_')) |
            Q(id=endpoint_id.replace('_', '-'))
        ).first()

        if not endpoint:
            raise NotFoundError(f'Endpoint "{endpoint_id}" not found.')

        serializer = EndpointSerializer(endpoint)
        return Response(serializer.data, status=status.HTTP_200_OK)

class EndpointMetricsView(APIView):
    """
    Returns time-series metric windows for a specific endpoint across 1h, 6h, 12h, or 24h.
    Calculates actual hourly metric buckets from real TelemetryEvent records.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, endpoint_id: str):
        endpoint = Endpoint.objects.filter(
            project__organization__memberships__user=request.user,
        ).filter(
            Q(id=endpoint_id) |
            Q(id=endpoint_id.replace('-', '_')) |
            Q(id=endpoint_id.replace('_', '-'))
        ).first()

        if not endpoint:
            raise NotFoundError(f'Endpoint "{endpoint_id}" not found.')

        time_range = request.query_params.get('timeRange', '24h')
        hours_map = {'1h': 1, '6h': 6, '12h': 12, '24h': 24, '7d': 168}
        hours = hours_map.get(time_range, 24)

        now = timezone.now()
        start_time = now - timedelta(hours=hours)

        events = TelemetryEvent.objects.filter(
            endpoint=endpoint,
            timestamp__gte=start_time,
        ).order_by('timestamp')

        # Bucket into hourly windows (or 10-minute buckets for 1h)
        step_minutes = 5 if hours <= 1 else 60
        total_steps = (hours * 60) // step_minutes

        metric_windows = []
        for step in range(total_steps):
            window_start = start_time + timedelta(minutes=step * step_minutes)
            window_end = window_start + timedelta(minutes=step_minutes)

            window_events = [e for e in events if window_start <= e.timestamp < window_end]
            req_count = len(window_events)

            if req_count > 0:
                latencies = sorted([e.response_time_ms for e in window_events])
                err_count = sum(1 for e in window_events if e.status_code >= 400)
                p50_idx = int(0.50 * (req_count - 1))
                p95_idx = int(0.95 * (req_count - 1))

                avg_lat = round(sum(latencies) / req_count, 1)
                p50_lat = round(latencies[p50_idx], 1)
                p95_lat = round(latencies[p95_idx], 1)
                err_rate = round((err_count / req_count) * 100, 2)
            else:
                avg_lat = endpoint.avg_latency
                p50_lat = endpoint.p50_latency
                p95_lat = endpoint.p95_latency
                err_rate = 0.0

            metric_windows.append({
                'timestamp': window_start.isoformat(),
                'requests': req_count,
                'p95Latency': p95_lat,
                'p50Latency': p50_lat,
                'errorRate': err_rate,
                'avgLatency': avg_lat,
            })

        return Response(metric_windows, status=status.HTTP_200_OK)

