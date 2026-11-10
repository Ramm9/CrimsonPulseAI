import pytest
import json
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.contracts.models import APIContract, ContractViolation

@pytest.fixture
def contracts_setup(db):
    user = User.objects.create_user(
        email='contracts@nexus.internal',
        name='API Architect',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Contracts Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project = Project.objects.create(organization=org, name='Catalog API', base_url='https://catalog.io')

    # Create one declared endpoint and one undeclared endpoint that has errors
    ep_declared = Endpoint.objects.create(
        project=project,
        method='GET',
        path='/api/v1/items/',
        request_count=100,
        status_2xx=100,
        health='healthy',
    )
    ep_undocumented = Endpoint.objects.create(
        project=project,
        method='POST',
        path='/api/v1/shadow-route/',
        request_count=50,
        status_5xx=10,
        health='critical',
    )

    return user, project, ep_declared, ep_undocumented

@pytest.mark.django_db
class TestContracts:
    def test_upload_and_validate_spec(self, api_client, contracts_setup):
        user, project, ep_declared, ep_undocumented = contracts_setup
        api_client.force_authenticate(user=user)

        sample_openapi_json = json.dumps({
            "openapi": "3.0.0",
            "info": {"title": "Catalog API Spec", "version": "1.2.0"},
            "paths": {
                "/api/v1/items/": {
                    "get": {
                        "summary": "List all catalog items",
                        "responses": {"200": {"description": "OK"}}
                    }
                }
            }
        })

        payload = {
            'projectId': project.id,
            'name': 'Catalog Core Spec',
            'version': '1.2.0',
            'content': sample_openapi_json,
        }

        res = api_client.post('/api/v1/contracts/specs/', data=payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.data
        assert data['name'] == 'Catalog Core Spec'
        assert data['version'] == '1.2.0'
        assert data['endpointCount'] >= 1
        assert data['status'] == 'violations_found' # Because ep_undocumented exists with errors

        spec_id = data['id']

        # Verify violations list
        viol_res = api_client.get(f'/api/v1/contracts/violations/?specId={spec_id}')
        assert viol_res.status_code == status.HTTP_200_OK
        violations = viol_res.data
        assert len(violations) >= 1

        # Check violation fields
        v_types = [v['type'] for v in violations]
        assert 'breaking_change' in v_types or 'status_code_mismatch' in v_types

    def test_get_spec_detail(self, api_client, contracts_setup):
        user, project, ep_declared, ep_undocumented = contracts_setup
        api_client.force_authenticate(user=user)

        spec = APIContract.objects.create(
            project=project,
            name='Payment Gateway Spec',
            version='2.0.0',
            endpoint_count=5,
            status='valid',
        )

        res = api_client.get(f'/api/v1/contracts/specs/{spec.id}/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['id'] == spec.id
        assert res.data['name'] == 'Payment Gateway Spec'
        assert res.data['status'] == 'valid'

