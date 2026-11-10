from django.db import models
from apps.projects.models import Project
from common.utils import generate_id
from common.constants import (
    HEALTH_CHOICES,
    HEALTH_HEALTHY,
    HTTP_METHOD_CHOICES,
)

def default_endpoint_id() -> str:
    return generate_id('ep')

class Endpoint(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_endpoint_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='endpoints',
    )
    method = models.CharField(max_length=16, choices=HTTP_METHOD_CHOICES)
    path = models.CharField(max_length=512, db_index=True)
    request_count = models.BigIntegerField(default=0)
    avg_latency = models.FloatField(default=0.0)
    p50_latency = models.FloatField(default=0.0)
    p95_latency = models.FloatField(default=0.0)
    p99_latency = models.FloatField(default=0.0)
    error_rate = models.FloatField(default=0.0)
    health = models.CharField(
        max_length=32,
        choices=HEALTH_CHOICES,
        default=HEALTH_HEALTHY,
    )
    last_activity = models.DateTimeField(null=True, blank=True)

    # Status code distribution counters
    status_2xx = models.IntegerField(default=0)
    status_3xx = models.IntegerField(default=0)
    status_4xx = models.IntegerField(default=0)
    status_5xx = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_endpoints'
        verbose_name = 'Endpoint'
        verbose_name_plural = 'Endpoints'
        unique_together = ('project', 'method', 'path')
        ordering = ['-request_count']

    def __str__(self):
        return f"{self.method} {self.path} ({self.project.name})"

