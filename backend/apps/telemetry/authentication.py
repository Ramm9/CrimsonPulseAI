from rest_framework import authentication
from django.utils import timezone
from apps.projects.models import ProjectAPIKey
from common.utils import hash_api_key
from common.exceptions import AuthenticationFailedError

class ProjectAPIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticates SDK ingestion requests using the project API key.
    Checks header 'X-CrimsonPulse-Key' or 'Authorization: Bearer cpk_...'.
    """
    def authenticate(self, request):
        api_key_header = request.headers.get('X-CrimsonPulse-Key')

        if not api_key_header:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer cpk_'):
                api_key_header = auth_header[7:].strip()

        if not api_key_header:
            return None  # Pass to next authenticator or fail permission

        raw_key = api_key_header.strip()
        key_hash = hash_api_key(raw_key)

        api_key_obj = ProjectAPIKey.objects.select_related('project', 'project__organization').filter(
            key_hash=key_hash,
            status='active',
        ).first()

        if not api_key_obj:
            raise AuthenticationFailedError('Invalid or revoked CrimsonPulse API key.')

        # Update last_used_at timestamp asynchronously/safely
        ProjectAPIKey.objects.filter(pk=api_key_obj.pk).update(last_used_at=timezone.now())

        # Attach project to request
        request.project = api_key_obj.project
        # Return dummy user (or anonymous user) and auth object
        return (api_key_obj.project.organization.created_by, api_key_obj)

