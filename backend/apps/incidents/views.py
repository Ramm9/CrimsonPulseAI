from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from apps.incidents.models import Incident, IncidentComment, IncidentTimelineEvent
from apps.accounts.models import User
from apps.incidents.serializers import (
    IncidentSerializer,
    UpdateIncidentStatusSerializer,
    AddCommentSerializer,
    AssignIncidentSerializer,
)
from common.exceptions import NotFoundError

class IncidentBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_incident(self, user, incident_id: str) -> Incident:
        incident = Incident.objects.filter(
            project__organization__memberships__user=user,
        ).filter(
            Q(id=incident_id) |
            Q(id=incident_id.replace('-', '_')) |
            Q(id=incident_id.replace('_', '-'))
        ).select_related('project', 'endpoint', 'assignee').prefetch_related('comments', 'timeline', 'anomalies').first()

        if not incident:
            raise NotFoundError(f'Incident "{incident_id}" not found.')
        return incident

class IncidentListView(APIView):
    """List and filter incidents across user projects."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: IncidentSerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        queryset = Incident.objects.filter(
            project__organization__memberships__user=request.user,
        ).select_related('project', 'endpoint', 'assignee').prefetch_related('comments', 'timeline', 'anomalies')

        proj_id = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_id and proj_id != 'all':
            queryset = queryset.filter(Q(project__id=proj_id) | Q(project__slug=proj_id))

        env = request.query_params.get('environment') or request.query_params.get('env')
        if env and env != 'all':
            queryset = queryset.filter(
                Q(endpoint__telemetry_events__environment=env) | Q(project__environment=env)
            ).distinct()

        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(endpoint_path__icontains=search)
            )

        incidents = queryset.order_by('-last_occurred')
        serializer = IncidentSerializer(incidents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class IncidentDetailView(IncidentBaseView):
    """Retrieve or update status of an individual incident."""

    @extend_schema(responses={200: IncidentSerializer})
    def get(self, request, incident_id: str):
        incident = self.get_incident(request.user, incident_id)
        serializer = IncidentSerializer(incident)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UpdateIncidentStatusSerializer, responses={200: IncidentSerializer})
    def patch(self, request, incident_id: str):
        incident = self.get_incident(request.user, incident_id)
        serializer = UpdateIncidentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        prev_status = incident.status

        if prev_status != new_status:
            incident.status = new_status
            incident.save(update_fields=['status', 'updated_at'])

            # Timeline event
            IncidentTimelineEvent.objects.create(
                incident=incident,
                event_type='status_change',
                description=f"Status changed from {prev_status} to {new_status}",
                user=request.user,
                metadata={'from': prev_status, 'to': new_status},
                timestamp=timezone.now(),
            )

        return Response(IncidentSerializer(incident).data, status=status.HTTP_200_OK)

class IncidentCommentView(IncidentBaseView):
    """Add a developer comment to an incident."""

    @extend_schema(request=AddCommentSerializer, responses={200: IncidentSerializer})
    def post(self, request, incident_id: str):
        incident = self.get_incident(request.user, incident_id)
        serializer = AddCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        content = serializer.validated_data['content']
        IncidentComment.objects.create(
            incident=incident,
            user=request.user,
            content=content,
        )

        IncidentTimelineEvent.objects.create(
            incident=incident,
            event_type='comment',
            description=f"{request.user.name} added a comment",
            user=request.user,
            timestamp=timezone.now(),
        )

        fresh_incident = self.get_incident(request.user, incident_id)
        return Response(IncidentSerializer(fresh_incident).data, status=status.HTTP_200_OK)

class IncidentAssignView(IncidentBaseView):
    """Assign an incident to an engineer."""

    @extend_schema(request=AssignIncidentSerializer, responses={200: IncidentSerializer})
    def post(self, request, incident_id: str):
        incident = self.get_incident(request.user, incident_id)
        serializer = AssignIncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = User.objects.filter(id=serializer.validated_data['userId']).first()
        if not target_user:
            raise NotFoundError('User to assign not found.')

        incident.assignee = target_user
        incident.save(update_fields=['assignee', 'updated_at'])

        IncidentTimelineEvent.objects.create(
            incident=incident,
            event_type='assignment',
            description=f"Assigned incident to {target_user.name}",
            user=request.user,
            timestamp=timezone.now(),
        )

        fresh_incident = self.get_incident(request.user, incident_id)
        return Response(IncidentSerializer(fresh_incident).data, status=status.HTTP_200_OK)
