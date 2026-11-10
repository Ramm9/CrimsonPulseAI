from rest_framework import serializers
from apps.incidents.models import Incident, IncidentComment, IncidentTimelineEvent
from apps.accounts.serializers import UserSerializer

class IncidentCommentSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source='user_id', read_only=True)
    userName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = IncidentComment
        fields = ['id', 'userId', 'userName', 'content', 'createdAt']

    def get_userName(self, obj) -> str:
        return obj.user.name if obj.user else 'System Agent'

class IncidentTimelineEventSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='event_type')
    userId = serializers.CharField(source='user_id', read_only=True)
    userName = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField()

    class Meta:
        model = IncidentTimelineEvent
        fields = ['id', 'type', 'description', 'timestamp', 'userId', 'userName', 'metadata']

    def get_userName(self, obj) -> str | None:
        return obj.user.name if obj.user else None

class IncidentSerializer(serializers.ModelSerializer):
    """Formats Incident matching frontend Incident interface."""
    projectId = serializers.CharField(source='project_id', read_only=True)
    endpoint = serializers.CharField(source='endpoint_path')
    occurrenceCount = serializers.IntegerField(source='occurrence_count')
    firstDetected = serializers.DateTimeField(source='first_detected')
    lastOccurred = serializers.DateTimeField(source='last_occurred')
    assignee = UserSerializer(read_only=True)
    relatedAnomalyIds = serializers.SerializerMethodField()
    aiSummary = serializers.CharField(source='ai_summary', allow_blank=True, required=False)
    comments = IncidentCommentSerializer(many=True, read_only=True)
    timeline = IncidentTimelineEventSerializer(many=True, read_only=True)
    deploymentInfo = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id',
            'projectId',
            'title',
            'description',
            'severity',
            'status',
            'endpoint',
            'method',
            'occurrenceCount',
            'firstDetected',
            'lastOccurred',
            'assignee',
            'relatedAnomalyIds',
            'aiSummary',
            'comments',
            'timeline',
            'deploymentInfo',
        ]

    def get_relatedAnomalyIds(self, obj) -> list[str]:
        return list(obj.anomalies.values_list('id', flat=True))

    def get_deploymentInfo(self, obj) -> dict:
        return {
            'version': obj.deployment_version,
            'deployedAt': obj.created_at.isoformat(),
            'deployedBy': obj.deployment_by,
            'commitHash': obj.deployment_commit,
            'changelog': obj.deployment_changelog or 'Automated release deployment',
        }

class UpdateIncidentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['open', 'acknowledged', 'investigating', 'resolved'])

class AddCommentSerializer(serializers.Serializer):
    content = serializers.CharField(required=True)
    userId = serializers.CharField(required=False, allow_blank=True)

class AssignIncidentSerializer(serializers.Serializer):
    userId = serializers.CharField(required=True)

