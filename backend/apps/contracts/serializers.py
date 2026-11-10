from rest_framework import serializers
from apps.contracts.models import APIContract, ContractViolation

class ContractSpecSerializer(serializers.ModelSerializer):
    """Formats APIContract matching frontend ContractSpec interface."""
    projectId = serializers.CharField(source='project_id', read_only=True)
    uploadedAt = serializers.DateTimeField(source='uploaded_at', read_only=True)
    endpointCount = serializers.IntegerField(source='endpoint_count', read_only=True)

    class Meta:
        model = APIContract
        fields = [
            'id',
            'projectId',
            'name',
            'version',
            'uploadedAt',
            'endpointCount',
            'status',
        ]

class ContractViolationSerializer(serializers.ModelSerializer):
    """Formats ContractViolation matching frontend ContractViolation interface."""
    specId = serializers.CharField(source='spec_id', read_only=True)
    detectedAt = serializers.DateTimeField(source='detected_at', read_only=True)

    class Meta:
        model = ContractViolation
        fields = [
            'id',
            'specId',
            'endpoint',
            'method',
            'type',
            'field',
            'expected',
            'observed',
            'severity',
            'detectedAt',
        ]

class UploadSpecSerializer(serializers.Serializer):
    projectId = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(required=True, max_length=255)
    version = serializers.CharField(required=False, default='v1.0')
    content = serializers.CharField(required=False, allow_blank=True, default='')

