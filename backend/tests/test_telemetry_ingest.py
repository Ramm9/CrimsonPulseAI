import pytest
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from common.utils import generate_api_key

@pytest.fixture
def project_setup(db):
    user = User.objects.create_user(
        email='telemetry@nexus.internal',
        name='Telemetry Admin',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Telemetry Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project = Project.objects.create(organization=org, name='Order Service', base_url='https://orders.io')

    full_key, prefix, masked_key, hashed_key = generate_api_key(project.environment)
    api_key = ProjectAPIKey.objects.create(
        project=project,
        name='Test Ingestion Key',
        key_prefix=prefix,
        masked_key=masked_key,
        key_hash=hashed_key,
    )

    return user, project, api_key, full_key

@pytest.mark.django_db
class TestTelemetryIngest:
    def test_ingest_without_key_rejected(self, api_client):
        payload = [{'endpoint': '/api/v1/test/', 'method': 'GET', 'statusCode': 200}]
        res = api_client.post('/api/v1/ingest/events/', data=payload, format='json')
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_ingest_with_invalid_key_rejected(self, api_client):
        payload = [{'endpoint': '/api/v1/test/', 'method': 'GET', 'statusCode': 200}]
        res = api_client.post(
            '/api/v1/ingest/events/',
            data=payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY='cpk_live_invalidkey1234567890',
        )
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_successful_ingestion_and_endpoint_discovery(self, api_client, project_setup):
        user, project, api_key, full_key = project_setup

        batch = [
            {
                'endpoint': '/api/v1/orders/1824/',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 120.0,
                'appVersion': '2.4.1',
            },
            {
                'endpoint': '/api/v1/orders/1825/',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 80.0,
                'appVersion': '2.4.1',
            },
            {
                'endpoint': '/api/v1/orders/1826/',
                'method': 'GET',
                'statusCode': 500,
                'responseTime': 450.0,
                'error': 'Database timeout',
                'appVersion': '2.4.1',
            },
            {
                'endpoint': '/api/v1/payments/',
                'method': 'POST',
                'statusCode': 201,
                'responseTime': 210.0,
                'appVersion': '2.4.1',
            },
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data['success'] is True
        assert res.data['ingested'] == 4

        # Verify Endpoint Auto-Discovery & Path Normalization
        # /api/v1/orders/1824/ and /api/v1/orders/1825/ and 1826 should merge into /api/v1/orders/{id}/
        orders_ep = Endpoint.objects.get(project=project, method='GET', path='/api/v1/orders/{id}/')
        assert orders_ep.request_count == 3
        assert orders_ep.status_2xx == 2
        assert orders_ep.status_5xx == 1
        assert orders_ep.status_4xx == 0
        assert orders_ep.error_rate > 0

        # Payments endpoint
        pay_ep = Endpoint.objects.get(project=project, method='POST', path='/api/v1/payments/')
        assert pay_ep.request_count == 1
        assert pay_ep.status_2xx == 1

        # Check TelemetryEvent rows in DB
        assert TelemetryEvent.objects.filter(project=project).count() == 4

    def test_live_traffic_feed(self, api_client, project_setup):
        user, project, api_key, full_key = project_setup

        # Ingest an event
        api_client.post(
            '/api/v1/ingest/events/',
            data=[{'endpoint': '/api/v1/users/42/', 'method': 'GET', 'statusCode': 200, 'responseTime': 55.0}],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )

        # Authenticate user and fetch live traffic
        api_client.force_authenticate(user=user)
        res = api_client.get(f'/api/v1/projects/{project.id}/traffic/')
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) >= 1
        assert res.data[0]['endpoint'] == '/api/v1/users/{id}/'
        assert res.data[0]['statusCode'] == 200

    def test_sdk_status_active_after_ingestion(self, api_client, project_setup):
        user, project, api_key, full_key = project_setup

        api_client.force_authenticate(user=user)

        # Before telemetry, status is disconnected
        before_res = api_client.get(f'/api/v1/projects/{project.id}/sdk/status/')
        assert before_res.status_code == status.HTTP_200_OK
        assert before_res.data['status'] == 'disconnected'
        assert before_res.data['connected'] is False

        # Ingest telemetry event
        api_client.post(
            '/api/v1/ingest/events/',
            data=[{'endpoint': '/api/v1/ping/', 'method': 'GET', 'statusCode': 200, 'responseTime': 15.0}],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )

        # Now status should be connected
        after_res = api_client.get(f'/api/v1/projects/{project.id}/sdk/status/')
        assert after_res.status_code == status.HTTP_200_OK
        assert after_res.data['status'] == 'connected'
        assert after_res.data['connected'] is True
        assert after_res.data['lastSeen'] is not None

