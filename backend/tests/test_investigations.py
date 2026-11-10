import pytest
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.incidents.models import Incident
from apps.ai_assistant.models import Investigation

@pytest.fixture
def investigation_setup(db):
    user = User.objects.create_user(
        email='investigator@nexus.internal',
        name='Principal SRE',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='AI Ops Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project = Project.objects.create(organization=org, name='Core API', base_url='https://core.io')

    ep1 = Endpoint.objects.create(
        project=project,
        method='POST',
        path='/api/v1/orders/',
        request_count=50,
        p95_latency=2100.0,
        error_rate=12.0,
        health='critical',
    )
    ep2 = Endpoint.objects.create(
        project=project,
        method='GET',
        path='/api/v1/products/',
        request_count=200,
        p95_latency=45.0,
        error_rate=0.0,
        health='healthy',
    )

    incident_a = Incident.objects.create(
        project=project,
        endpoint=ep1,
        title='Orders Latency Spike',
        description='P95 response time surged to 2100ms',
        severity='critical',
        status='open',
        method='POST',
        endpoint_path='/api/v1/orders/',
        deployment_version='2.4.1',
        deployment_commit='a8f9c2d',
    )

    incident_b = Incident.objects.create(
        project=project,
        endpoint=ep2,
        title='Contract Mismatch - Products',
        description='Unexpected schema returned from downstream catalog service',
        severity='medium',
        status='open',
        method='GET',
        endpoint_path='/api/v1/products/',
        deployment_version='2.3.9',
        deployment_commit='f4c1b8e',
    )

    return user, project, incident_a, incident_b

@pytest.mark.django_db
class TestInvestigations:
    def test_get_investigation_returns_evidence_and_checklist(self, api_client, investigation_setup):
        user, project, incident_a, incident_b = investigation_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/ai/investigations/{incident_a.id}/')
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        assert data['incidentId'] == incident_a.id
        assert len(data['messages']) >= 1
        assert len(data['evidenceCards']) >= 2
        assert len(data['debugChecklist']) >= 3
        assert len(data['suggestedActions']) >= 2

        # Check evidence cards
        cards = data['evidenceCards']
        metric_card = next(c for c in cards if c['type'] == 'metric')
        assert metric_card['verified'] is True
        assert 'Telemetry' in metric_card['source']

    def test_strict_incident_context_isolation(self, api_client, investigation_setup):
        user, project, incident_a, incident_b = investigation_setup
        api_client.force_authenticate(user=user)

        res_a = api_client.get(f'/api/v1/ai/investigations/{incident_a.id}/')
        res_b = api_client.get(f'/api/v1/ai/investigations/{incident_b.id}/')

        assert res_a.status_code == status.HTTP_200_OK
        assert res_b.status_code == status.HTTP_200_OK

        # Ensure IDs and contents do not bleed into each other
        assert res_a.data['id'] != res_b.data['id']
        assert res_a.data['incidentId'] == incident_a.id
        assert res_b.data['incidentId'] == incident_b.id

        content_a = res_a.data['messages'][0]['content']
        content_b = res_b.data['messages'][0]['content']
        assert 'Orders Latency Spike' in content_a
        assert 'Orders Latency Spike' not in content_b
        assert 'Contract Mismatch - Products' in content_b

    def test_send_message_and_toggle_checklist(self, api_client, investigation_setup):
        user, project, incident_a, incident_b = investigation_setup
        api_client.force_authenticate(user=user)

        # Get investigation
        init_res = api_client.get(f'/api/v1/ai/investigations/{incident_a.id}/')
        inv_id = init_res.data['id']
        chk_id = init_res.data['debugChecklist'][0]['id']

        # Send user message
        msg_res = api_client.post(
            f'/api/v1/ai/investigations/{inv_id}/messages/',
            data={'message': 'Which deployment caused this latency surge?'},
            format='json',
        )
        assert msg_res.status_code == status.HTTP_201_CREATED
        assert msg_res.data['role'] == 'assistant'
        assert len(msg_res.data['content']) > 20

        # Toggle checklist item
        chk_res = api_client.patch(
            f'/api/v1/ai/checklist/{chk_id}/',
            data={'completed': True},
            format='json',
        )
        assert chk_res.status_code == status.HTTP_200_OK
        assert chk_res.data['completed'] is True

