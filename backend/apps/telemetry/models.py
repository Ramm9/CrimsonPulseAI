from django.db import models
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from common.utils import generate_id
from common.constants import (
    ENVIRONMENT_CHOICES,
    ENV_PRODUCTION,
    HTTP_METHOD_CHOICES,
)

def default_telemetry_id() -> str:
    return generate_id('tel')

class TelemetryEvent(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_telemetry_id,
        editable=False,
    )
    event_id = models.CharField(
        max_length=128,
        db_index=True,
        default=default_telemetry_id,
        help_text='Unique event ID or idempotency key from client SDK',
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='telemetry_events',
    )
    endpoint = models.ForeignKey(
        Endpoint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='telemetry_events',
    )
    raw_path = models.CharField(max_length=512)
    normalized_path = models.CharField(max_length=512, db_index=True)
    method = models.CharField(max_length=16, choices=HTTP_METHOD_CHOICES)
    status_code = models.IntegerField(db_index=True)
    response_time_ms = models.FloatField(db_index=True)
    environment = models.CharField(
        max_length=32,
        choices=ENVIRONMENT_CHOICES,
        default=ENV_PRODUCTION,
    )
    app_version = models.CharField(max_length=64, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    error_type = models.CharField(max_length=255, blank=True, default='')
    error_stack = models.TextField(blank=True, default='')
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    request_headers = models.JSONField(default=dict, blank=True)
    request_query = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cp_telemetry_events'
        verbose_name = 'Telemetry Event'
        verbose_name_plural = 'Telemetry Events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['project', '-timestamp']),
            models.Index(fields=['endpoint', '-timestamp']),
            models.Index(fields=['status_code', '-timestamp']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'event_id'],
                name='unique_project_event_id',
            ),
        ]

    def __str__(self):
        return f"{self.method} {self.raw_path} -> {self.status_code} ({self.response_time_ms}ms)"

