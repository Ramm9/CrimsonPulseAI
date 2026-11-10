from rest_framework import serializers
from apps.telemetry.models import TelemetryEvent
from common.constants import HTTP_METHODS

class TelemetryEventSerializer(serializers.ModelSerializer):
    """Formats TelemetryEvent matching frontend TelemetryEvent interface."""
    projectId = serializers.CharField(source='project_id', read_only=True)
    endpoint = serializers.CharField(source='normalized_path', read_only=True)
    statusCode = serializers.IntegerField(source='status_code', read_only=True)
    responseTime = serializers.FloatField(source='response_time_ms', read_only=True)
    appVersion = serializers.CharField(source='app_version', read_only=True)
    error = serializers.CharField(source='error_message', read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)

    class Meta:
        model = TelemetryEvent
        fields = [
            'id',
            'projectId',
            'endpoint',
            'method',
            'statusCode',
            'responseTime',
            'timestamp',
            'environment',
            'appVersion',
            'error',
        ]

class IngestEventItemSerializer(serializers.Serializer):
    endpoint = serializers.CharField(required=True, max_length=512)
    method = serializers.ChoiceField(choices=HTTP_METHODS, default='GET')
    statusCode = serializers.IntegerField(required=False, default=200)
    status_code = serializers.IntegerField(required=False)
    responseTime = serializers.FloatField(required=False, default=0.0)
    response_time_ms = serializers.FloatField(required=False)
    timestamp = serializers.DateTimeField(required=False)
    environment = serializers.CharField(required=False, default='production')
    appVersion = serializers.CharField(required=False, allow_blank=True, default='')
    version = serializers.CharField(required=False, allow_blank=True, default='')
    error = serializers.CharField(required=False, allow_blank=True, default='')
    errorMessage = serializers.CharField(required=False, allow_blank=True, default='')
    errorType = serializers.CharField(required=False, allow_blank=True, default='')
    errorStack = serializers.CharField(required=False, allow_blank=True, default='')
    ipAddress = serializers.CharField(required=False, allow_blank=True, default='')
    client_ip = serializers.CharField(required=False, allow_blank=True, default='')
    userAgent = serializers.CharField(required=False, allow_blank=True, default='')
    requestHeaders = serializers.DictField(required=False, default=dict)
    requestQuery = serializers.CharField(required=False, allow_blank=True, default='')

