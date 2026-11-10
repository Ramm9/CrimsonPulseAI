import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization, OrganizationMembership
from common.constants import ROLE_OWNER, ROLE_DEVELOPER

User = get_user_model()

@pytest.fixture
def client():
    return APIClient()

@pytest.mark.django_db
class TestAuthAndOrganization:
    def test_register_creates_user_org_and_tokens(self, client):
        payload = {
            'name': 'Alex Rivera',
            'email': 'alex.rivera@crimsonpulse.io',
            'password': 'SecurePassword123!',
            'organization_name': 'CrimsonPulse Labs',
        }
        response = client.post('/api/v1/auth/register/', payload, format='json')
        assert response.status_code == 201
        data = response.data

        assert 'token' in data
        assert 'tokens' in data
        assert data['tokens']['access'] is not None
        assert data['user']['email'] == 'alex.rivera@crimsonpulse.io'
        assert data['user']['name'] == 'Alex Rivera'
        assert data['user']['id'].startswith('usr_')
        assert data['organization']['name'] == 'CrimsonPulse Labs'
        assert data['organization']['slug'] == 'crimsonpulse-labs'

        # Verify DB records
        user = User.objects.get(email='alex.rivera@crimsonpulse.io')
        org = Organization.objects.get(name='CrimsonPulse Labs')
        membership = OrganizationMembership.objects.get(user=user, organization=org)
        assert membership.role == ROLE_OWNER

    def test_register_duplicate_email_rejected(self, client):
        User.objects.create_user(
            email='existing@crimsonpulse.io',
            password='Password123!',
            name='Existing User',
        )
        payload = {
            'name': 'Another User',
            'email': 'existing@crimsonpulse.io',
            'password': 'Password123!',
        }
        response = client.post('/api/v1/auth/register/', payload, format='json')
        assert response.status_code == 400

    def test_login_success(self, client):
        User.objects.create_user(
            email='test@crimsonpulse.io',
            password='ValidPassword123!',
            name='Test User',
        )
        response = client.post(
            '/api/v1/auth/login/',
            {'email': 'test@crimsonpulse.io', 'password': 'ValidPassword123!'},
            format='json',
        )
        assert response.status_code == 200
        assert 'token' in response.data
        assert 'tokens' in response.data

    def test_login_invalid_credentials(self, client):
        response = client.post(
            '/api/v1/auth/login/',
            {'email': 'test@crimsonpulse.io', 'password': 'WrongPassword!'},
            format='json',
        )
        assert response.status_code in [400, 401]

    def test_current_user_profile_requires_auth(self, client):
        response = client.get('/api/v1/auth/me/')
        assert response.status_code == 401

    def test_current_user_profile_and_update(self, client):
        user = User.objects.create_user(
            email='me@crimsonpulse.io',
            password='Password123!',
            name='Original Name',
        )
        client.force_authenticate(user=user)

        # GET
        get_res = client.get('/api/v1/auth/me/')
        assert get_res.status_code == 200
        assert get_res.data['name'] == 'Original Name'

        # PATCH
        patch_res = client.patch('/api/v1/auth/me/', {'name': 'Updated Name'}, format='json')
        assert patch_res.status_code == 200
        assert patch_res.data['name'] == 'Updated Name'

    def test_organization_current_and_members(self, client):
        user = User.objects.create_user(
            email='org_owner@crimsonpulse.io',
            password='Password123!',
            name='Org Owner',
        )
        org = Organization.objects.create(name='Nexus Corp', created_by=user)
        OrganizationMembership.objects.create(organization=org, user=user, role=ROLE_OWNER)

        client.force_authenticate(user=user)

        # Get current org
        res = client.get('/api/v1/organizations/current/')
        assert res.status_code == 200
        assert res.data['name'] == 'Nexus Corp'
        assert res.data['slug'] == 'nexus-corp'

        # Get members
        members_res = client.get('/api/v1/organizations/current/members/')
        assert members_res.status_code == 200
        assert len(members_res.data) == 1
        assert members_res.data[0]['email'] == 'org_owner@crimsonpulse.io'
        assert members_res.data[0]['role'] == ROLE_OWNER

        # Invite member
        invite_res = client.post(
            '/api/v1/organizations/current/invitations/',
            {'email': 'developer@nexus.com', 'role': ROLE_DEVELOPER},
            format='json',
        )
        assert invite_res.status_code == 201
        assert invite_res.data['email'] == 'developer@nexus.com'
        assert invite_res.data['role'] == ROLE_DEVELOPER

