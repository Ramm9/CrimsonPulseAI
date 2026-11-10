from django.db import models
from django.utils.text import slugify
from apps.organizations.models import Organization
from common.utils import generate_id
from common.constants import (
    ENVIRONMENT_CHOICES,
    ENV_PRODUCTION,
    HEALTH_CHOICES,
    HEALTH_HEALTHY,
)

def default_project_id() -> str:
    return generate_id('proj')

def default_api_key_id() -> str:
    return generate_id('key')

class Project(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_project_id,
        editable=False,
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='projects',
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default='')
    environment = models.CharField(
        max_length=32,
        choices=ENVIRONMENT_CHOICES,
        default=ENV_PRODUCTION,
    )
    base_url = models.URLField(max_length=512)
    health = models.CharField(
        max_length=32,
        choices=HEALTH_CHOICES,
        default=HEALTH_HEALTHY,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_projects'
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.environment})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'project'
            slug = base_slug
            counter = 1
            while Project.objects.filter(organization=self.organization, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

class ProjectAPIKey(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('revoked', 'Revoked'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_api_key_id,
        editable=False,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='api_keys',
    )
    name = models.CharField(max_length=255)
    key_prefix = models.CharField(max_length=16, default='cpk_live')
    key_hash = models.CharField(max_length=255, db_index=True)
    masked_key = models.CharField(max_length=32)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='active')
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'cp_project_api_keys'
        verbose_name = 'Project API Key'
        verbose_name_plural = 'Project API Keys'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} [{self.masked_key}] ({self.status})"

