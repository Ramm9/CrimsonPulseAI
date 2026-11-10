from django.db import models
from django.utils import timezone
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.accounts.models import User
from common.utils import generate_id
from common.constants import (
    SEVERITY_CHOICES,
    SEVERITY_MEDIUM,
    INCIDENT_STATUS_CHOICES,
    INCIDENT_STATUS_OPEN,
    HTTP_METHOD_CHOICES,
)

def default_incident_id() -> str:
    return generate_id('inc')

def default_comment_id() -> str:
    return generate_id('cmt')

def default_timeline_id() -> str:
    return generate_id('tl')

class Incident(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_incident_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='incidents',
    )
    endpoint = models.ForeignKey(
        Endpoint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents',
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(
        max_length=32,
        choices=SEVERITY_CHOICES,
        default=SEVERITY_MEDIUM,
    )
    status = models.CharField(
        max_length=32,
        choices=INCIDENT_STATUS_CHOICES,
        default=INCIDENT_STATUS_OPEN,
    )
    method = models.CharField(max_length=16, choices=HTTP_METHOD_CHOICES, default='GET')
    endpoint_path = models.CharField(max_length=512)
    occurrence_count = models.IntegerField(default=1)
    first_detected = models.DateTimeField(default=timezone.now)
    last_occurred = models.DateTimeField(default=timezone.now)
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_incidents',
    )
    ai_summary = models.TextField(blank=True, default='')

    # Deployment context
    deployment_version = models.CharField(max_length=64, blank=True, default='2.4.1')
    deployment_commit = models.CharField(max_length=64, blank=True, default='a8f9c2d')
    deployment_by = models.CharField(max_length=255, blank=True, default='CI/CD Pipeline')
    deployment_changelog = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_incidents'
        verbose_name = 'Incident'
        verbose_name_plural = 'Incidents'
        ordering = ['-last_occurred']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} ({self.status})"

class IncidentComment(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_comment_id,
        editable=False,
    )
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incident_comments',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cp_incident_comments'
        verbose_name = 'Incident Comment'
        verbose_name_plural = 'Incident Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment on {self.incident.title} by {self.user}"

class IncidentTimelineEvent(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_timeline_id,
        editable=False,
    )
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='timeline',
    )
    event_type = models.CharField(max_length=64) # status_change, comment, assignment, resolved, etc.
    description = models.TextField()
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timeline_events',
    )
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'cp_incident_timeline_events'
        verbose_name = 'Incident Timeline Event'
        verbose_name_plural = 'Incident Timeline Events'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.event_type}: {self.description}"

