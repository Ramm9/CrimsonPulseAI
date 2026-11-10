from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Avg
from drf_spectacular.utils import extend_schema
from apps.anomalies.models import Anomaly
from apps.anomalies.serializers import AnomalySerializer, UpdateAnomalyStatusSerializer
from common.exceptions import NotFoundError

class AnomalyListView(APIView):
    """
    List detected anomalies across the workspace or filtered by project,
    severity, status, endpoint, or text search.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: AnomalySerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        queryset = Anomaly.objects.filter(
            project__organization__memberships__user=request.user,
        ).select_related('endpoint', 'project')

        proj_id = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_id and proj_id != 'all':
            queryset = queryset.filter(Q(project__id=proj_id) | Q(project__slug=proj_id))

        # Filter by Environment
        env = request.query_params.get('environment') or request.query_params.get('env')
        if env and env != 'all':
            queryset = queryset.filter(
                Q(endpoint__telemetry_events__environment=env) | Q(project__environment=env)
            ).distinct()

        # Filter by timeRange (anomalies detected within window)
        time_range = request.query_params.get('timeRange') or request.query_params.get('range')
        if time_range and time_range != 'all':
            from apps.metrics.services import calculate_time_windows
            start_time, end_time, _, _ = calculate_time_windows(time_range)
            queryset = queryset.filter(detected_at__gte=start_time, detected_at__lte=end_time)

        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        endpoint_id = request.query_params.get('endpointId')
        if endpoint_id:
            queryset = queryset.filter(endpoint__id=endpoint_id)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(endpoint__path__icontains=search) |
                Q(description__icontains=search) |
                Q(metric__icontains=search)
            )

        anomalies = queryset.order_by('-detected_at')
        serializer = AnomalySerializer(anomalies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class AnomalyDetailView(APIView):
    """Retrieve or update an individual anomaly's lifecycle status."""
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, user, anomaly_id: str) -> Anomaly:
        anomaly = Anomaly.objects.filter(
            project__organization__memberships__user=user,
        ).filter(
            Q(id=anomaly_id) |
            Q(id=anomaly_id.replace('-', '_')) |
            Q(id=anomaly_id.replace('_', '-'))
        ).select_related('endpoint', 'project').first()

        if not anomaly:
            raise NotFoundError(f'Anomaly "{anomaly_id}" not found.')
        return anomaly

    @extend_schema(responses={200: AnomalySerializer})
    def get(self, request, anomaly_id: str):
        anomaly = self.get_object(request.user, anomaly_id)
        serializer = AnomalySerializer(anomaly)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UpdateAnomalyStatusSerializer, responses={200: AnomalySerializer})
    def patch(self, request, anomaly_id: str):
        anomaly = self.get_object(request.user, anomaly_id)
        serializer = UpdateAnomalyStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        anomaly.status = serializer.validated_data['status']
        anomaly.save(update_fields=['status', 'updated_at'])
        return Response(AnomalySerializer(anomaly).data, status=status.HTTP_200_OK)

class AnomalyStatsView(APIView):
    """
    Returns aggregate counts, severity breakdown, and average anomaly scores.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Anomaly.objects.filter(
            project__organization__memberships__user=request.user,
        )

        proj_id = request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_id and proj_id != 'all':
            queryset = queryset.filter(Q(project__id=proj_id) | Q(project__slug=proj_id))

        total = queryset.count()
        active = queryset.filter(status='active').count()
        acknowledged = queryset.filter(status='acknowledged').count()
        resolved = queryset.filter(status='resolved').count()
        false_positive = queryset.filter(status='false_positive').count()

        by_severity = {
            'critical': queryset.filter(severity='critical').count(),
            'high': queryset.filter(severity='high').count(),
            'medium': queryset.filter(severity='medium').count(),
            'low': queryset.filter(severity='low').count(),
        }

        avg_score_res = queryset.aggregate(avg=Avg('anomaly_score'))
        avg_score = round(avg_score_res['avg'] or 0.0, 2)

        return Response({
            'total': total,
            'active': active,
            'acknowledged': acknowledged,
            'resolved': resolved,
            'falsPositive': false_positive,
            'bySeverity': by_severity,
            'avgScore': avg_score,
        }, status=status.HTTP_200_OK)

