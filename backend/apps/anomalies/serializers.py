from rest_framework import serializers
from apps.anomalies.models import Anomaly

class AnomalySerializer(serializers.ModelSerializer):
    """Formats Anomaly matching frontend Anomaly interface."""
    projectId = serializers.CharField(source='project_id', read_only=True)
    endpointId = serializers.CharField(source='endpoint_id', read_only=True)
    endpoint = serializers.CharField(source='endpoint.path', read_only=True)
    method = serializers.CharField(source='endpoint.method', read_only=True)
    baselineValue = serializers.FloatField(source='baseline_value')
    observedValue = serializers.FloatField(source='observed_value')
    anomalyScore = serializers.FloatField(source='anomaly_score')
    modelVersion = serializers.CharField(source='model_version')
    detectedAt = serializers.DateTimeField(source='detected_at')
    relatedIncidentId = serializers.CharField(source='related_incident_id', allow_null=True, required=False)

    class Meta:
        model = Anomaly
        fields = [
            'id',
            'projectId',
            'endpointId',
            'endpoint',
            'method',
            'severity',
            'metric',
            'baselineValue',
            'observedValue',
            'anomalyScore',
            'modelVersion',
            'description',
            'detectedAt',
            'status',
            'relatedIncidentId',
        ]

class UpdateAnomalyStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['active', 'acknowledged', 'resolved', 'false_positive'])

