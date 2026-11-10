from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from common.constants import ROLE_OWNER

@transaction.atomic
def register_user(name: str, email: str, password: str, organization_name: str = '') -> dict:
    """
    Registers a new user, creates their primary organization and membership,
    and returns authenticated user data and JWT tokens.
    """
    email = email.strip().lower()
    user = User.objects.create_user(
        email=email,
        password=password,
        name=name,
        role=ROLE_OWNER,
    )

    # Determine organization name
    org_name = organization_name.strip() if organization_name and organization_name.strip() else f"{name}'s Workspace"
    organization = Organization.objects.create(
        name=org_name,
        created_by=user,
        plan='pro',
    )

    # Assign user as Owner of the organization
    OrganizationMembership.objects.create(
        organization=organization,
        user=user,
        role=ROLE_OWNER,
    )

    # Issue JWT tokens
    refresh = RefreshToken.for_user(user)

    return {
        'user': user,
        'organization': organization,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
    }

