from rest_framework import serializers
from apps.endpoints.models import Endpoint

class StatusDistributionSerializer(serializers.Serializer):
    def to_representation(self, instance):
        return {
            '2xx': instance.status_2xx,
            '3xx': instance.status_3xx,
            '4xx': instance.status_4xx,
            '5xx': instance.status_5xx,
        }

class EndpointSerializer(serializers.ModelSerializer):
    """Formats Endpoint matching frontend Endpoint interface."""
    projectId = serializers.CharField(source='project_id', read_only=True)
    requestCount = serializers.IntegerField(source='request_count', read_only=True)
    avgLatency = serializers.FloatField(source='avg_latency', read_only=True)
    p50Latency = serializers.FloatField(source='p50_latency', read_only=True)
    p95Latency = serializers.FloatField(source='p95_latency', read_only=True)
    p99Latency = serializers.FloatField(source='p99_latency', read_only=True)
    errorRate = serializers.FloatField(source='error_rate', read_only=True)
    lastActivity = serializers.SerializerMethodField()
    statusDistribution = serializers.SerializerMethodField()
    healthReason = serializers.SerializerMethodField()

    class Meta:
        model = Endpoint
        fields = [
            'id',
            'projectId',
            'method',
            'path',
            'requestCount',
            'avgLatency',
            'p50Latency',
            'p95Latency',
            'p99Latency',
            'errorRate',
            'health',
            'healthReason',
            'lastActivity',
            'statusDistribution',
        ]

    def get_healthReason(self, obj) -> str:
        count = obj.request_count
        if count < 5:
            if obj.status_5xx >= 2:
                return f"Critical — repeated server errors ({obj.status_5xx}x 5xx in {count} requests)"
            if obj.status_5xx == 1:
                return f"Insufficient data ({count} reqs, 1x 500 error) — monitoring for recurrence"
            if obj.status_4xx > 0:
                return f"Insufficient data ({count} reqs, {obj.status_4xx}x 4xx client error) — baseline establishing"
            return f"Insufficient data ({count} reqs) — baseline establishing"

        if obj.status_5xx >= 3 or (count > 0 and (obj.status_5xx / count) >= 0.05):
            rate = round((obj.status_5xx / count) * 100, 1)
            return f"Critical — elevated server errors ({rate}% 5xx)"
        if obj.avg_latency > 2000:
            return f"Critical — severe latency degradation ({round(obj.avg_latency)}ms > 2000ms)"
        if obj.status_5xx > 0:
            rate = round((obj.status_5xx / count) * 100, 1)
            return f"Degraded — intermittent server errors ({rate}% 5xx)"
        if count > 0 and (obj.status_4xx / count) >= 0.20:
            rate = round((obj.status_4xx / count) * 100, 1)
            return f"Degraded — elevated client error rate ({rate}% 4xx)"
        if obj.avg_latency > 600:
            return f"Degraded — elevated latency ({round(obj.avg_latency)}ms > 600ms)"
        return "Operating within expected baseline tolerances"

    def get_lastActivity(self, obj) -> str:
        return obj.last_activity.isoformat() if obj.last_activity else obj.created_at.isoformat()

    def get_statusDistribution(self, obj) -> dict:
        return {
            '2xx': obj.status_2xx,
            '3xx': obj.status_3xx,
            '4xx': obj.status_4xx,
            '5xx': obj.status_5xx,
        }

