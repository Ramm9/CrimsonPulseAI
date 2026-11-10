from django.db import models
from django.utils import timezone
from apps.projects.models import Project
from common.utils import generate_id
from common.constants import HTTP_METHOD_CHOICES

def default_spec_id() -> str:
    return generate_id('spec')

def default_violation_id() -> str:
    return generate_id('viol')

class APIContract(models.Model):
    STATUS_CHOICES = (
        ('valid', 'Valid'),
        ('violations_found', 'Violations Found'),
        ('pending', 'Pending'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_spec_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='contracts',
    )
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=64, default='v1.0')
    endpoint_count = models.IntegerField(default=0)
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default='pending',
    )
    raw_content = models.TextField(blank=True, default='')
    parsed_spec = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cp_contracts'
        verbose_name = 'API Contract'
        verbose_name_plural = 'API Contracts'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} {self.version} ({self.status})"

class ContractViolation(models.Model):
    TYPE_CHOICES = (
        ('missing_field', 'Missing Field'),
        ('unexpected_field', 'Unexpected Field'),
        ('type_mismatch', 'Type Mismatch'),
        ('status_code_mismatch', 'Status Code Mismatch'),
        ('breaking_change', 'Breaking Change'),
    )

    SEVERITY_CHOICES = (
        ('error', 'Error'),
        ('warning', 'Warning'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_violation_id,
        editable=False,
    )
    spec = models.ForeignKey(
        APIContract,
        on_delete=models.CASCADE,
        related_name='violations',
    )
    endpoint = models.CharField(max_length=512)
    method = models.CharField(max_length=16, choices=HTTP_METHOD_CHOICES, default='GET')
    type = models.CharField(max_length=64, choices=TYPE_CHOICES, default='breaking_change')
    field = models.CharField(max_length=255, blank=True, default='')
    expected = models.TextField()
    observed = models.TextField()
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='warning')
    detected_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'cp_contract_violations'
        verbose_name = 'Contract Violation'
        verbose_name_plural = 'Contract Violations'
        ordering = ['-detected_at']

    def __str__(self):
        return f"[{self.severity}] {self.method} {self.endpoint} -> {self.type}"

