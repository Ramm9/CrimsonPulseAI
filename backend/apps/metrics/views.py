from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.metrics.services import get_traffic_metrics, get_dashboard_summary

class TrafficMetricsView(APIView):
    """
    Returns time-series metric windows for the dashboard charts
    across requested time range (1h, 6h, 12h, 24h, 7d, 30d) and environment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id: str | None = None):
        time_range = request.query_params.get('timeRange') or request.query_params.get('range') or '24h'
        proj_id = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        env = request.query_params.get('environment') or request.query_params.get('env')
        include_opts = request.query_params.get('includeOptions', '').lower() in ('true', '1')

        metrics = get_traffic_metrics(
            request.user,
            project_id=proj_id,
            time_range=time_range,
            environment=env,
            include_options=include_opts,
        )
        return Response(metrics, status=status.HTTP_200_OK)

class DashboardOverviewView(APIView):
    """
    High-level system health and telemetry overview for the System Overview dashboard,
    filtered by project, environment, and time window.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id: str | None = None):
        proj_id = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        env = request.query_params.get('environment') or request.query_params.get('env')
        time_range = request.query_params.get('timeRange') or request.query_params.get('range') or '24h'
        include_opts = request.query_params.get('includeOptions', '').lower() in ('true', '1')

        summary = get_dashboard_summary(
            request.user,
            project_id=proj_id,
            time_range=time_range,
            environment=env,
            include_options=include_opts,
        )
        return Response(summary, status=status.HTTP_200_OK)

