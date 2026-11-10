from rest_framework import serializers
from apps.projects.models import Project, ProjectAPIKey
from common.constants import ENVIRONMENT_CHOICES

class ProjectSerializer(serializers.ModelSerializer):
    """Formats Project payload matching frontend Project interface in types/index.ts."""
    baseUrl = serializers.URLField(source='base_url')
    endpointCount = serializers.SerializerMethodField()
    totalRequests = serializers.SerializerMethodField()
    errorRate = serializers.SerializerMethodField()
    apiKey = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'environment',
            'baseUrl',
            'endpointCount',
            'totalRequests',
            'errorRate',
            'health',
            'apiKey',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['id', 'slug', 'endpointCount', 'totalRequests', 'errorRate', 'apiKey', 'createdAt', 'updatedAt']

    def get_endpointCount(self, obj) -> int:
        return obj.endpoints.count() if hasattr(obj, 'endpoints') else 0

    def get_totalRequests(self, obj) -> int:
        if hasattr(obj, 'telemetry_events'):
            return obj.telemetry_events.count()
        return 0

    def get_errorRate(self, obj) -> float:
        if hasattr(obj, 'telemetry_events'):
            total = obj.telemetry_events.count()
            if total > 0:
                errors = obj.telemetry_events.filter(status_code__gte=400).count()
                return round((errors / total) * 100, 2)
        return 0.0

    def get_apiKey(self, obj) -> str:
        first_key = obj.api_keys.filter(status='active').first()
        return first_key.masked_key if first_key else 'cpk_none'

class CreateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    environment = serializers.ChoiceField(choices=ENVIRONMENT_CHOICES, default='production')
    baseUrl = serializers.URLField(required=True)

class ProjectAPIKeySerializer(serializers.ModelSerializer):
    """Formats API key object matching frontend ApiKey interface."""
    key = serializers.CharField(source='masked_key', read_only=True)
    prefix = serializers.CharField(source='key_prefix', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastUsed = serializers.DateTimeField(source='last_used_at', read_only=True)

    class Meta:
        model = ProjectAPIKey
        fields = ['id', 'name', 'key', 'prefix', 'createdAt', 'lastUsed', 'status']
        read_only_fields = ['id', 'key', 'prefix', 'createdAt', 'lastUsed', 'status']

class GenerateKeySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)

