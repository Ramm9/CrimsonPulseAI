import pytest
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey

@pytest.fixture
def org_and_user(db):
    user = User.objects.create_user(
        email='lead@nexus.internal',
        name='Lead Engineer',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Nexus Core Org', created_by=user)
    membership = OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    return org, user

@pytest.fixture
def other_org_and_user(db):
    user = User.objects.create_user(
        email='other@competitor.com',
        name='Other User',
        password='Password123!',
        role='developer',
    )
    org = Organization.objects.create(name='Other Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    return org, user

@pytest.mark.django_db
class TestProjects:
    def test_create_project_provisions_default_key(self, api_client, org_and_user):
        org, user = org_and_user
        api_client.force_authenticate(user=user)

        payload = {
            'name': 'Payment Service',
            'description': 'Handles checkout transactions',
            'environment': 'production',
            'baseUrl': 'https://pay.nexus.internal',
        }
        res = api_client.post('/api/v1/projects/', data=payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.data
        assert data['name'] == 'Payment Service'
        assert data['slug'] == 'payment-service'
        assert data['environment'] == 'production'
        assert data['baseUrl'] == 'https://pay.nexus.internal'
        assert 'fullKey' in data
        assert data['fullKey'].startswith('cpk_live_')
        assert 'apiKey' in data
        assert '****' in data['apiKey']

        # Ensure project exists in DB
        proj = Project.objects.get(id=data['id'])
        assert proj.organization == org
        assert proj.api_keys.count() == 1
        key = proj.api_keys.first()
        assert key.status == 'active'

    def test_list_projects_multi_tenant_isolation(self, api_client, org_and_user, other_org_and_user):
        org1, user1 = org_and_user
        org2, user2 = other_org_and_user

        proj1 = Project.objects.create(organization=org1, name='Org1 API', base_url='https://api1.com')
        proj2 = Project.objects.create(organization=org2, name='Org2 API', base_url='https://api2.com')

        # User 1 should only see Org1 project
        api_client.force_authenticate(user=user1)
        res1 = api_client.get('/api/v1/projects/')
        assert res1.status_code == status.HTTP_200_OK
        ids1 = [p['id'] for p in res1.data]
        assert proj1.id in ids1
        assert proj2.id not in ids1

        # User 2 should only see Org2 project
        api_client.force_authenticate(user=user2)
        res2 = api_client.get('/api/v1/projects/')
        assert res2.status_code == status.HTTP_200_OK
        ids2 = [p['id'] for p in res2.data]
        assert proj2.id in ids2
        assert proj1.id not in ids2

    def test_get_and_update_project(self, api_client, org_and_user):
        org, user = org_and_user
        proj = Project.objects.create(organization=org, name='Catalog API', base_url='https://catalog.com')
        api_client.force_authenticate(user=user)

        # Retrieve by slug or ID
        res = api_client.get(f'/api/v1/projects/{proj.slug}/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['id'] == proj.id

        # Update
        patch_res = api_client.patch(
            f'/api/v1/projects/{proj.id}/',
            data={'name': 'Catalog Service V2', 'baseUrl': 'https://v2.catalog.com'},
            format='json',
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data['name'] == 'Catalog Service V2'
        assert patch_res.data['baseUrl'] == 'https://v2.catalog.com'

    def test_generate_and_revoke_api_key(self, api_client, org_and_user):
        org, user = org_and_user
        proj = Project.objects.create(organization=org, name='Auth Proxy', base_url='https://auth.com')
        api_client.force_authenticate(user=user)

        # Generate new key
        gen_res = api_client.post(
            f'/api/v1/projects/{proj.id}/keys/',
            data={'name': 'CI/CD Pipeline Key'},
            format='json',
        )
        assert gen_res.status_code == status.HTTP_201_CREATED
        key_data = gen_res.data
        assert 'fullKey' in key_data
        assert key_data['name'] == 'CI/CD Pipeline Key'
        key_id = key_data['id']

        # Revoke key
        rev_res = api_client.post(f'/api/v1/projects/{proj.id}/keys/{key_id}/revoke/')
        assert rev_res.status_code == status.HTTP_200_OK
        assert rev_res.data['status'] == 'revoked'

        # Verify DB status
        key_obj = ProjectAPIKey.objects.get(id=key_id)
        assert key_obj.status == 'revoked'
        assert key_obj.revoked_at is not None

