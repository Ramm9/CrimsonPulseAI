import pytest
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.projects.services import create_project

@pytest.fixture
def auth_setup(db):
    user = User.objects.create_user(
        email='dev.security@crimsonpulse.ai',
        password='ValidPassword123!',
        name='Security Tester',
    )
    org = Organization.objects.create(name='Security Systems Org', slug='security-systems-org')
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project, default_key, full_key = create_project(
        organization=org,
        name='Gateway Engine',
        environment='production',
    )
    return user, org, project, default_key, full_key

@pytest.mark.django_db
class TestStage4MissingEndpoints:
    """Tests for API Key Rotation and JWT Logout with Token Blacklist."""

    def test_api_key_rotation_revokes_old_and_provisions_new(self, api_client, auth_setup):
        user, org, project, initial_key, initial_full_key = auth_setup
        api_client.force_authenticate(user=user)

        # 1. Rotate key via project-scoped route
        rotate_res = api_client.post(
            f'/api/v1/projects/{project.id}/keys/{initial_key.id}/rotate/',
            {'name': 'Rotated Gateway Key'},
            format='json',
        )
        assert rotate_res.status_code == status.HTTP_201_CREATED
        rotate_data = rotate_res.json()
        assert rotate_data['status'] == 'active'
        assert rotate_data['name'] == 'Rotated Gateway Key'
        assert 'fullKey' in rotate_data
        new_full_key = rotate_data['fullKey']
        assert new_full_key.startswith('cpk_live_')
        new_key_id = rotate_data['id']
        assert new_key_id != initial_key.id

        # 2. Verify database state: old key is revoked
        initial_key.refresh_from_db()
        assert initial_key.status == 'revoked'
        assert initial_key.revoked_at is not None

        # 3. Test telemetry ingest with old key fails
        api_client.force_authenticate(user=None)
        old_ingest = api_client.post(
            '/api/v1/ingest/events/',
            [{
                'endpoint': '/api/v1/test',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 45.0,
            }],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=initial_full_key,
        )
        assert old_ingest.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

        # 4. Test telemetry ingest with new key succeeds
        new_ingest = api_client.post(
            '/api/v1/ingest/events/',
            [{
                'endpoint': '/api/v1/test',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 45.0,
            }],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=new_full_key,
        )
        assert new_ingest.status_code == status.HTTP_202_ACCEPTED
        assert new_ingest.json()['accepted'] == 1

    def test_global_api_key_rotation_route(self, api_client, auth_setup):
        user, org, project, initial_key, initial_full_key = auth_setup
        api_client.force_authenticate(user=user)

        # Rotate key via global key route
        rotate_res = api_client.post(
            f'/api/v1/keys/{initial_key.id}/rotate/',
            format='json',
        )
        assert rotate_res.status_code == status.HTTP_201_CREATED
        data = rotate_res.json()
        assert 'fullKey' in data
        assert data['status'] == 'active'

    def test_jwt_logout_and_token_blacklist(self, api_client, auth_setup):
        user, org, project, _, _ = auth_setup

        # 1. Login to get fresh tokens
        login_res = api_client.post(
            '/api/v1/auth/login/',
            {'email': 'dev.security@crimsonpulse.ai', 'password': 'ValidPassword123!'},
            format='json',
        )
        assert login_res.status_code == status.HTTP_200_OK
        refresh_token = login_res.json()['tokens']['refresh']
        access_token = login_res.json()['tokens']['access']

        # 2. Verify token refresh works prior to logout
        refresh_pre = api_client.post(
            '/api/v1/auth/refresh/',
            {'refresh': refresh_token},
            format='json',
        )
        assert refresh_pre.status_code == status.HTTP_200_OK
        current_refresh = refresh_pre.json().get('refresh', refresh_token)

        # 3. Perform logout
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = api_client.post(
            '/api/v1/auth/logout/',
            {'refresh': current_refresh},
            format='json',
        )
        assert logout_res.status_code == status.HTTP_200_OK
        assert logout_res.json()['status'] == 'success'

        # 4. Attempting to use the blacklisted refresh token MUST fail
        api_client.credentials()  # Clear auth header
        refresh_post = api_client.post(
            '/api/v1/auth/refresh/',
            {'refresh': current_refresh},
            format='json',
        )
        assert refresh_post.status_code == status.HTTP_401_UNAUTHORIZED
