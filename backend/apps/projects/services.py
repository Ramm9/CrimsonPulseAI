from django.db import transaction
from django.utils import timezone
from apps.projects.models import Project, ProjectAPIKey
from common.utils import generate_api_key
from common.exceptions import NotFoundError, ValidationError

def create_project(
    organization,
    name: str,
    description: str = '',
    environment: str = 'production',
    base_url: str = '',
) -> tuple[Project, ProjectAPIKey, str]:
    """
    Creates a new Project for an Organization and immediately provisions
    a default cryptographically secure API key.
    Returns:
      (project, default_api_key, full_secret_key)
    """
    with transaction.atomic():
        project = Project.objects.create(
            organization=organization,
            name=name,
            description=description,
            environment=environment,
            base_url=base_url,
        )

        full_key, prefix, masked_key, hashed_key = generate_api_key(environment)
        api_key = ProjectAPIKey.objects.create(
            project=project,
            name='Default Key',
            key_prefix=prefix,
            masked_key=masked_key,
            key_hash=hashed_key,
        )

    return project, api_key, full_key

def generate_project_key(project: Project, name: str) -> tuple[ProjectAPIKey, str]:
    """
    Generates a new API Key for a project. Returns the masked database record
    and the single-exposure full plaintext key.
    """
    if not name or not name.strip():
        raise ValidationError('Key name is required.')

    full_key, prefix, masked_key, hashed_key = generate_api_key(project.environment)
    api_key = ProjectAPIKey.objects.create(
        project=project,
        name=name.strip(),
        key_prefix=prefix,
        masked_key=masked_key,
        key_hash=hashed_key,
    )
    return api_key, full_key

def revoke_project_key(project: Project, key_id: str) -> ProjectAPIKey:
    """
    Revokes an existing active API key.
    """
    try:
        api_key = project.api_keys.get(id=key_id)
    except ProjectAPIKey.DoesNotExist:
        raise NotFoundError('API key not found.')

    if api_key.status == 'revoked':
        return api_key

    api_key.status = 'revoked'
    api_key.revoked_at = timezone.now()
    api_key.save(update_fields=['status', 'revoked_at'])
    return api_key

def rotate_project_key(project: Project, key_id: str, new_name: str | None = None) -> tuple[ProjectAPIKey, str]:
    """
    Revokes the old key and generates a replacement.
    """
    with transaction.atomic():
        old_key = revoke_project_key(project, key_id)
        name = new_name or f"{old_key.name} (Rotated)"
        return generate_project_key(project, name)

