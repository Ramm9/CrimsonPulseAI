from django.db import models
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from common.utils import generate_id

def default_snapshot_id() -> str:
    return generate_id('snp')

class EndpointMetricSnapshot(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_snapshot_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='metric_snapshots',
    )
    endpoint = models.ForeignKey(
        Endpoint,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='metric_snapshots',
    )
    window_start = models.DateTimeField(db_index=True)
    window_end = models.DateTimeField(db_index=True)
    request_count = models.IntegerField(default=0)
    avg_latency = models.FloatField(default=0.0)
    p50_latency = models.FloatField(default=0.0)
    p95_latency = models.FloatField(default=0.0)
    p99_latency = models.FloatField(default=0.0)
    error_count = models.IntegerField(default=0)
    error_rate = models.FloatField(default=0.0)
    status_distribution = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cp_metric_snapshots'
        verbose_name = 'Metric Snapshot'
        verbose_name_plural = 'Metric Snapshots'
        ordering = ['-window_start']
        indexes = [
            models.Index(fields=['project', '-window_start']),
            models.Index(fields=['endpoint', '-window_start']),
        ]

    def __str__(self):
        return f"Snapshot {self.window_start.strftime('%Y-%m-%d %H:%M')} -> {self.request_count} reqs ({self.avg_latency}ms)"

