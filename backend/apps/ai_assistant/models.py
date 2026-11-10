from django.db import models
from django.utils import timezone
from apps.incidents.models import Incident
from common.utils import generate_id

def default_investigation_id() -> str:
    return generate_id('inv')

def default_message_id() -> str:
    return generate_id('msg')

def default_card_id() -> str:
    return generate_id('evd')

def default_checklist_id() -> str:
    return generate_id('chk')

class Investigation(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_investigation_id,
        editable=False,
    )
    incident = models.OneToOneField(
        Incident,
        on_delete=models.CASCADE,
        related_name='investigation',
    )
    suggested_actions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_investigations'
        verbose_name = 'Investigation'
        verbose_name_plural = 'Investigations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Investigation for Incident: {self.incident.title}"

class InvestigationMessage(models.Model):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_message_id,
        editable=False,
    )
    investigation = models.ForeignKey(
        Investigation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='assistant')
    content = models.TextField()
    evidence_refs = models.JSONField(default=list, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'cp_investigation_messages'
        verbose_name = 'Investigation Message'
        verbose_name_plural = 'Investigation Messages'
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}..."

class EvidenceCard(models.Model):
    TYPE_CHOICES = (
        ('metric', 'Metric'),
        ('log', 'Log'),
        ('deployment', 'Deployment'),
        ('pattern', 'Pattern'),
        ('correlation', 'Correlation'),
    )

    SEVERITY_CHOICES = (
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_card_id,
        editable=False,
    )
    investigation = models.ForeignKey(
        Investigation,
        on_delete=models.CASCADE,
        related_name='evidence_cards',
    )
    title = models.CharField(max_length=255)
    card_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='metric')
    content = models.TextField()
    source = models.CharField(max_length=255, blank=True, default='')
    verified = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='info')

    class Meta:
        db_table = 'cp_evidence_cards'
        verbose_name = 'Evidence Card'
        verbose_name_plural = 'Evidence Cards'
        ordering = ['id']

    def __str__(self):
        return f"{self.title} ({self.card_type})"

class DebugChecklistItem(models.Model):
    PRIORITY_CHOICES = (
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_checklist_id,
        editable=False,
    )
    investigation = models.ForeignKey(
        Investigation,
        on_delete=models.CASCADE,
        related_name='debug_checklist',
    )
    label = models.CharField(max_length=512)
    completed = models.BooleanField(default=False)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='medium')

    class Meta:
        db_table = 'cp_debug_checklist_items'
        verbose_name = 'Debug Checklist Item'
        verbose_name_plural = 'Debug Checklist Items'
        ordering = ['id']

    def __str__(self):
        return f"[{'X' if self.completed else ' '}] {self.label}"

