from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from apps.incidents.models import Incident
from apps.ai_assistant.models import Investigation, DebugChecklistItem
from apps.ai_assistant.serializers import (
    AIInvestigationSerializer,
    AIMessageSerializer,
    SendAIMessageSerializer,
    ToggleChecklistSerializer,
    DebugChecklistItemSerializer,
)
from apps.ai_assistant.services import (
    get_or_create_investigation,
    send_investigation_message,
)
from common.exceptions import NotFoundError

class InvestigationDetailView(APIView):
    """
    Retrieve or synthesize an AI investigation for a given incident ID.
    Always maintains strict isolation per incident.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: AIInvestigationSerializer})
    def get(self, request, incident_id: str):
        incident = Incident.objects.filter(
            project__organization__memberships__user=request.user,
        ).filter(
            Q(id=incident_id) |
            Q(id=incident_id.replace('-', '_')) |
            Q(id=incident_id.replace('_', '-'))
        ).first()

        if not incident:
            raise NotFoundError(f'Incident "{incident_id}" not found.')

        investigation = get_or_create_investigation(incident)
        serializer = AIInvestigationSerializer(investigation)
        return Response(serializer.data, status=status.HTTP_200_OK)

class InvestigationMessageView(APIView):
    """Send an inquiry to the investigation assistant and receive contextual telemetry-backed response."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=SendAIMessageSerializer, responses={201: AIMessageSerializer})
    def post(self, request, investigation_id: str):
        investigation = Investigation.objects.filter(
            id=investigation_id,
            incident__project__organization__memberships__user=request.user,
        ).first()

        if not investigation:
            raise NotFoundError(f'Investigation "{investigation_id}" not found.')

        serializer = SendAIMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ai_response = send_investigation_message(investigation, serializer.validated_data['message'])
        return Response(AIMessageSerializer(ai_response).data, status=status.HTTP_201_CREATED)

class ChecklistToggleView(APIView):
    """Toggle completion status of a debug checklist step."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ToggleChecklistSerializer, responses={200: DebugChecklistItemSerializer})
    def patch(self, request, item_id: str):
        item = DebugChecklistItem.objects.filter(
            id=item_id,
            investigation__incident__project__organization__memberships__user=request.user,
        ).first()

        if not item:
            raise NotFoundError(f'Checklist item "{item_id}" not found.')

        serializer = ToggleChecklistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item.completed = serializer.validated_data['completed']
        item.save(update_fields=['completed'])

        return Response(DebugChecklistItemSerializer(item).data, status=status.HTTP_200_OK)

class SuggestedQuestionsView(APIView):
    """Returns curated follow-up investigation questions."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([
            'What was the root cause of this incident?',
            'Which deployment triggered this issue?',
            'Are there any related anomalies across other endpoints?',
            'What is the estimated blast radius?',
            'Show me the connection pool metrics over time',
            'Were there similar incidents in the past 90 days?',
            'What remediation steps do you recommend?',
            'Is this affecting any downstream services?',
        ], status=status.HTTP_200_OK)

