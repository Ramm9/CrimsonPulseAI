from rest_framework import serializers
from apps.ai_assistant.models import (
    Investigation,
    InvestigationMessage,
    EvidenceCard,
    DebugChecklistItem,
)

class AIMessageSerializer(serializers.ModelSerializer):
    evidenceRefs = serializers.ListField(source='evidence_refs', read_only=True)

    class Meta:
        model = InvestigationMessage
        fields = ['id', 'role', 'content', 'timestamp', 'evidenceRefs']

class EvidenceCardSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='card_type')

    class Meta:
        model = EvidenceCard
        fields = ['id', 'title', 'type', 'content', 'source', 'verified', 'data', 'severity']

class DebugChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebugChecklistItem
        fields = ['id', 'label', 'completed', 'priority']

class AIInvestigationSerializer(serializers.ModelSerializer):
    incidentId = serializers.CharField(source='incident_id', read_only=True)
    messages = AIMessageSerializer(many=True, read_only=True)
    evidenceCards = EvidenceCardSerializer(source='evidence_cards', many=True, read_only=True)
    suggestedActions = serializers.ListField(source='suggested_actions', read_only=True)
    debugChecklist = DebugChecklistItemSerializer(source='debug_checklist', many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Investigation
        fields = [
            'id',
            'incidentId',
            'messages',
            'evidenceCards',
            'suggestedActions',
            'debugChecklist',
            'createdAt',
        ]

class SendAIMessageSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)

class ToggleChecklistSerializer(serializers.Serializer):
    completed = serializers.BooleanField(required=True)

