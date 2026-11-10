import pytest
from rest_framework import status
from django.utils import timezone
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident
from apps.contracts.models import APIContract
from common.utils import generate_api_key, hash_api_key

@pytest.fixture
def multi_project_setup(db):
    user = User.objects.create_user(
        email='lead.architect@crimsonpulse.ai',
        password='StrongPassword123!',
        name='Lead Architect',
    )
    org = Organization.objects.create(name='Pulse Engineering Corp', slug='pulse-eng-corp')
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')

    project_alpha = Project.objects.create(
        organization=org,
        name='Alpha Payments Service',
        slug='alpha-payments',
        environment='production',
        base_url='https://payments.example.com',
    )
    project_beta = Project.objects.create(
        organization=org,
        name='Beta Inventory Service',
        slug='beta-inventory',
        environment='production',
        base_url='https://inventory.example.com',
    )

    # Endpoints
    ep_alpha = Endpoint.objects.create(
        project=project_alpha,
        path='/api/v1/charges',
        method='POST',
        request_count=100,
        status_5xx=5,
        error_rate=5.0,
    )
    ep_beta = Endpoint.objects.create(
        project=project_beta,
        path='/api/v1/items',
        method='GET',
        request_count=200,
        status_5xx=0,
        error_rate=0.0,
    )

    # Telemetry events
    TelemetryEvent.objects.create(
        project=project_alpha,
        endpoint=ep_alpha,
        event_id='evt_alpha_01',
        method='POST',
        raw_path='/api/v1/charges',
        normalized_path='/api/v1/charges',
        status_code=201,
        response_time_ms=85.0,
        timestamp=timezone.now(),
    )
    TelemetryEvent.objects.create(
        project=project_beta,
        endpoint=ep_beta,
        event_id='evt_beta_01',
        method='GET',
        raw_path='/api/v1/items',
        normalized_path='/api/v1/items',
        status_code=200,
        response_time_ms=22.0,
        timestamp=timezone.now(),
    )

    # Anomalies
    anom_alpha = Anomaly.objects.create(
        project=project_alpha,
        endpoint=ep_alpha,
        severity='critical',
        status='active',
        metric='error_rate',
        baseline_value=0.5,
        observed_value=5.0,
        anomaly_score=0.92,
        description='Error rate anomaly',
        detected_at=timezone.now(),
    )
    anom_beta = Anomaly.objects.create(
        project=project_beta,
        endpoint=ep_beta,
        severity='low',
        status='resolved',
        metric='p95_latency',
        baseline_value=20.0,
        observed_value=35.0,
        anomaly_score=0.45,
        description='Latency elevation',
        detected_at=timezone.now(),
    )

    # Incidents
    inc_alpha = Incident.objects.create(
        project=project_alpha,
        endpoint=ep_alpha,
        title='Alpha Charges Payment Gateway Error Rate Spike',
        description='Payment charges failing with 500 status',
        severity='critical',
        status='open',
        endpoint_path='/api/v1/charges',
        first_detected=timezone.now(),
        last_occurred=timezone.now(),
    )
    inc_beta = Incident.objects.create(
        project=project_beta,
        endpoint=ep_beta,
        title='Beta Items Slight Latency Elevation',
        description='Inventory items response slightly elevated',
        severity='low',
        status='resolved',
        endpoint_path='/api/v1/items',
        first_detected=timezone.now(),
        last_occurred=timezone.now(),
    )

    # Contract specs
    APIContract.objects.create(
        project=project_alpha,
        name='Payments API Spec',
        version='v1.0.0',
        raw_content='openapi: 3.0.0\ninfo:\n  title: Alpha Payments\n  version: 1.0.0\npaths: {}',
    )
    APIContract.objects.create(
        project=project_beta,
        name='Inventory API Spec',
        version='v2.0.0',
        raw_content='openapi: 3.0.0\ninfo:\n  title: Beta Inventory\n  version: 2.0.0\npaths: {}',
    )

    return user, project_alpha, project_beta, ep_alpha, ep_beta, inc_alpha, inc_beta

@pytest.mark.django_db
class TestStage2ProjectContextConsistency:
    """Verify strict multi-project context isolation across all dashboard endpoints."""

    def test_live_traffic_filtering_by_project(self, api_client, multi_project_setup):
        user, alpha, beta, _, _, _, _ = multi_project_setup
        api_client.force_authenticate(user=user)

        # Alpha traffic query
        res_alpha = api_client.get(f'/api/v1/telemetry/traffic/?projectId={alpha.id}')
        assert res_alpha.status_code == status.HTTP_200_OK
        data_alpha = res_alpha.json()
        assert len(data_alpha) == 1
        assert data_alpha[0]['projectId'] == alpha.id
        assert data_alpha[0]['endpoint'] == '/api/v1/charges'

        # Beta traffic query
        res_beta = api_client.get(f'/api/v1/telemetry/traffic/?projectId={beta.id}')
        assert res_beta.status_code == status.HTTP_200_OK
        data_beta = res_beta.json()
        assert len(data_beta) == 1
        assert data_beta[0]['projectId'] == beta.id
        assert data_beta[0]['endpoint'] == '/api/v1/items'

    def test_endpoints_filtering_by_project(self, api_client, multi_project_setup):
        user, alpha, beta, ep_alpha, ep_beta, _, _ = multi_project_setup
        api_client.force_authenticate(user=user)

        # Alpha endpoints
        res_alpha = api_client.get(f'/api/v1/endpoints/?projectId={alpha.id}')
        assert res_alpha.status_code == status.HTTP_200_OK
        assert len(res_alpha.json()) == 1
        assert res_alpha.json()[0]['id'] == ep_alpha.id

        # Beta endpoints
        res_beta = api_client.get(f'/api/v1/endpoints/?projectId={beta.id}')
        assert res_beta.status_code == status.HTTP_200_OK
        assert len(res_beta.json()) == 1
        assert res_beta.json()[0]['id'] == ep_beta.id

    def test_anomalies_and_stats_filtering_by_project(self, api_client, multi_project_setup):
        user, alpha, beta, _, _, _, _ = multi_project_setup
        api_client.force_authenticate(user=user)

        # Alpha anomalies
        res_anom_alpha = api_client.get(f'/api/v1/anomalies/?projectId={alpha.id}')
        assert res_anom_alpha.status_code == status.HTTP_200_OK
        assert len(res_anom_alpha.json()) == 1
        assert res_anom_alpha.json()[0]['severity'] == 'critical'

        # Alpha stats
        res_stats_alpha = api_client.get(f'/api/v1/anomalies/stats/?projectId={alpha.id}')
        assert res_stats_alpha.status_code == status.HTTP_200_OK
        stats_alpha = res_stats_alpha.json()
        assert stats_alpha['total'] == 1
        assert stats_alpha['active'] == 1
        assert stats_alpha['resolved'] == 0
        assert stats_alpha['bySeverity']['critical'] == 1

        # Beta stats
        res_stats_beta = api_client.get(f'/api/v1/anomalies/stats/?projectId={beta.id}')
        assert res_stats_beta.status_code == status.HTTP_200_OK
        stats_beta = res_stats_beta.json()
        assert stats_beta['total'] == 1
        assert stats_beta['active'] == 0
        assert stats_beta['resolved'] == 1
        assert stats_beta['bySeverity']['critical'] == 0

    def test_incidents_filtering_by_project(self, api_client, multi_project_setup):
        user, alpha, beta, _, _, inc_alpha, inc_beta = multi_project_setup
        api_client.force_authenticate(user=user)

        # Alpha incidents
        res_alpha = api_client.get(f'/api/v1/incidents/?projectId={alpha.id}')
        assert res_alpha.status_code == status.HTTP_200_OK
        assert len(res_alpha.json()) == 1
        assert res_alpha.json()[0]['id'] == inc_alpha.id

        # Beta incidents
        res_beta = api_client.get(f'/api/v1/incidents/?projectId={beta.id}')
        assert res_beta.status_code == status.HTTP_200_OK
        assert len(res_beta.json()) == 1
        assert res_beta.json()[0]['id'] == inc_beta.id

    def test_contracts_filtering_by_project(self, api_client, multi_project_setup):
        user, alpha, beta, _, _, _, _ = multi_project_setup
        api_client.force_authenticate(user=user)

        res_alpha = api_client.get(f'/api/v1/contracts/specs/?projectId={alpha.id}')
        assert res_alpha.status_code == status.HTTP_200_OK
        assert len(res_alpha.json()) == 1
        assert res_alpha.json()[0]['name'] == 'Payments API Spec'

        res_beta = api_client.get(f'/api/v1/contracts/specs/?projectId={beta.id}')
        assert res_beta.status_code == status.HTTP_200_OK
        assert len(res_beta.json()) == 1
        assert res_beta.json()[0]['name'] == 'Inventory API Spec'
