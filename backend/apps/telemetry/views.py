from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema
from apps.telemetry.models import TelemetryEvent
from apps.telemetry.serializers import (
    TelemetryEventSerializer,
    IngestEventItemSerializer,
)
from apps.telemetry.authentication import ProjectAPIKeyAuthentication
from apps.telemetry.services import process_telemetry_batch
from apps.projects.models import Project
from apps.organizations.models import OrganizationMembership
from common.exceptions import NotFoundError, AuthenticationFailedError

class TelemetryIngestView(APIView):
    """
    High-throughput ingestion gateway for the CrimsonPulse Python SDK.
    Secured by project API key passed in 'X-CrimsonPulse-Key' header.
    Accepts single telemetry objects or batches of events.
    """
    authentication_classes = [ProjectAPIKeyAuthentication]
    permission_classes = []

    @extend_schema(request=IngestEventItemSerializer(many=True))
    def post(self, request):
        project = getattr(request, 'project', None)
        if not project:
            # Check header directly in case DRF authentication was bypassed (e.g. test client)
            api_key_header = request.headers.get('X-CrimsonPulse-Key')
            if not api_key_header:
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer cpk_'):
                    api_key_header = auth_header[7:].strip()

            if api_key_header:
                from common.utils import hash_api_key
                from apps.projects.models import ProjectAPIKey
                key_hash = hash_api_key(api_key_header.strip())
                api_key_obj = ProjectAPIKey.objects.select_related('project').filter(
                    key_hash=key_hash,
                    status='active',
                ).first()
                if api_key_obj:
                    project = api_key_obj.project
                    request.project = project

        if not project:
            raise AuthenticationFailedError('Valid X-CrimsonPulse-Key header is required for telemetry ingestion.')

        raw_data = request.data
        if isinstance(raw_data, list):
            events = raw_data
        elif isinstance(raw_data, dict) and 'events' in raw_data and isinstance(raw_data['events'], list):
            events = raw_data['events']
        elif isinstance(raw_data, dict):
            events = [raw_data]
        else:
            return Response(
                {'error': True, 'message': 'Invalid payload format. Expected JSON object or array.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ingest_stats = process_telemetry_batch(project, events)
        return Response(
            {
                'success': True,
                'accepted': ingest_stats['accepted'],
                'duplicates': ingest_stats['duplicates'],
                'rejected': ingest_stats['rejected'],
                'ingested': ingest_stats['ingested'],
                'projectId': project.id,
                'timestamp': timezone.now().isoformat(),
            },
            status=status.HTTP_202_ACCEPTED,
        )

class LiveTrafficFeedView(APIView):
    """
    Returns recent live telemetry events for a project or all projects in the user's workspace.
    Used by the Live Traffic dashboard view and real-time feeds.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: TelemetryEventSerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        limit = min(int(request.query_params.get('limit', 50)), 200)

        queryset = TelemetryEvent.objects.filter(
            project__organization__memberships__user=request.user,
        )

        proj_param = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_param and proj_param != 'all':
            from django.db.models import Q
            queryset = queryset.filter(Q(project__id=proj_param) | Q(project__slug=proj_param))

        events = queryset.select_related('project', 'endpoint').order_by('-timestamp')[:limit]
        serializer = TelemetryEventSerializer(events, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SDKStatusView(APIView):
    """
    Calculates SDK pipeline connection status derived from real telemetry events.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id: str):
        project = Project.objects.filter(
            id=project_id,
            organization__memberships__user=request.user,
        ).first()

        if not project:
            raise NotFoundError(f'Project "{project_id}" not found.')

        latest_event = TelemetryEvent.objects.filter(project=project).order_by('-timestamp').first()

        if not latest_event:
            return Response({
                'status': 'disconnected',
                'connected': False,
                'lastSeen': None,
                'message': 'No telemetry has been received from this project yet.',
            }, status=status.HTTP_200_OK)

        now = timezone.now()
        age = now - latest_event.timestamp
        is_active = age <= timedelta(minutes=15)

        return Response({
            'status': 'connected' if is_active else 'inactive',
            'connected': is_active,
            'lastSeen': latest_event.timestamp.isoformat(),
            'eventCount': TelemetryEvent.objects.filter(project=project).count(),
            'message': 'Telemetry Pipeline Connected' if is_active else 'Telemetry pipeline inactive for over 15 minutes',
        }, status=status.HTTP_200_OK)
