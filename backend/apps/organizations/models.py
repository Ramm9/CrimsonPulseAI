from django.db import models
from django.conf import settings
from django.utils.text import slugify
from common.utils import generate_id
from common.constants import ROLE_CHOICES, ROLE_DEVELOPER, ROLE_OWNER

def default_org_id() -> str:
    return generate_id('org')

def default_membership_id() -> str:
    return generate_id('mem')

class Organization(models.Model):
    PLAN_CHOICES = (
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    )

    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_org_id,
        editable=False,
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    plan = models.CharField(max_length=32, choices=PLAN_CHOICES, default='pro')
    retention_days = models.PositiveIntegerField(default=30)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_organizations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cp_organizations'
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'workspace'
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

class OrganizationMembership(models.Model):
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_membership_id,
        editable=False,
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_DEVELOPER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cp_organization_memberships'
        verbose_name = 'Organization Membership'
        verbose_name_plural = 'Organization Memberships'
        unique_together = ('organization', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} -> {self.organization.name} ({self.role})"

