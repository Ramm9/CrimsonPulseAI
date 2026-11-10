from django.db import models
from django.utils import timezone
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.incidents.models import Incident
from common.utils import generate_id
from common.constants import (
    SEVERITY_CHOICES,
    SEVERITY_MEDIUM,
    ANOMALY_STATUS_CHOICES,
    ANOMALY_STATUS_ACTIVE,
    HTTP_METHOD_CHOICES,
)

def default_anomaly_id() -> str:
    return generate_id('anom')

class Anomaly(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_anomaly_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='anomalies',
    )
    endpoint = models.ForeignKey(
        Endpoint,
        on_delete=models.CASCADE,
        related_name='anomalies',
    )
    related_incident = models.ForeignKey(
        Incident,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anomalies',
    )
    severity = models.CharField(
        max_length=32,
        choices=SEVERITY_CHOICES,
        default=SEVERITY_MEDIUM,
    )
    status = models.CharField(
        max_length=32,
        choices=ANOMALY_STATUS_CHOICES,
        default=ANOMALY_STATUS_ACTIVE,
    )
    metric = models.CharField(max_length=64) # e.g. 'Latency (P95)', 'Error Rate'
    baseline_value = models.FloatField(default=0.0)
    observed_value = models.FloatField(default=0.0)
    anomaly_score = models.FloatField(default=0.0) # 0.0 - 1.0
    model_version = models.CharField(max_length=64, default='cp-rule-detector-v1.0')
    description = models.TextField()
    detected_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_anomalies'
        verbose_name = 'Anomaly'
        verbose_name_plural = 'Anomalies'
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.endpoint.method} {self.endpoint.path} - {self.metric} ({self.severity}) [{self.anomaly_score}]"

