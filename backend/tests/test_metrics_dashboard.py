import pytest
from rest_framework import status
from django.utils import timezone
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent

@pytest.fixture
def metrics_setup(db):
    user = User.objects.create_user(
        email='metrics@nexus.internal',
        name='Metrics Engineer',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Metrics Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project = Project.objects.create(organization=org, name='Gateway API', base_url='https://gateway.nexus.internal')

    # Create endpoints
    ep1 = Endpoint.objects.create(
        project=project,
        method='GET',
        path='/api/v1/orders/',
        request_count=100,
        avg_latency=120.0,
        p50_latency=100.0,
        p95_latency=220.0,
        error_rate=1.0,
        health='healthy',
        status_2xx=99,
        status_5xx=1,
    )
    ep2 = Endpoint.objects.create(
        project=project,
        method='POST',
        path='/api/v1/checkout/',
        request_count=50,
        avg_latency=450.0,
        p50_latency=400.0,
        p95_latency=900.0,
        error_rate=8.0,
        health='degraded',
        status_2xx=46,
        status_5xx=4,
    )

    # Ingest a few TelemetryEvent records
    now = timezone.now()
    TelemetryEvent.objects.create(
        project=project,
        endpoint=ep1,
        raw_path='/api/v1/orders/',
        normalized_path='/api/v1/orders/',
        method='GET',
        status_code=200,
        response_time_ms=110.0,
        timestamp=now,
    )
    TelemetryEvent.objects.create(
        project=project,
        endpoint=ep1,
        raw_path='/api/v1/orders/',
        normalized_path='/api/v1/orders/',
        method='GET',
        status_code=500,
        response_time_ms=500.0,
        timestamp=now,
    )

    return user, project, ep1, ep2

@pytest.mark.django_db
class TestMetricsDashboard:
    def test_traffic_metrics_windows_24h(self, api_client, metrics_setup):
        user, project, ep1, ep2 = metrics_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/metrics/traffic/?projectId={project.id}&timeRange=24h')
        assert res.status_code == status.HTTP_200_OK
        windows = res.data
        assert len(windows) == 24
        # Validate structure of each MetricWindow
        assert 'timestamp' in windows[0]
        assert 'requests' in windows[0]
        assert 'p95Latency' in windows[0]
        assert 'p50Latency' in windows[0]
        assert 'avgLatency' in windows[0]
        assert 'errorRate' in windows[0]

        # The last window (most recent) should contain our 2 ingested events
        recent_window = windows[-1]
        assert recent_window['requests'] == 2
        assert recent_window['errorRate'] == 50.0
        assert recent_window['p95Latency'] >= 110.0

    def test_empty_project_metrics_no_crash(self, api_client, db):
        # Test with a user and project that has zero telemetry
        user = User.objects.create_user(email='empty@org.com', name='Empty', password='Password123!')
        org = Organization.objects.create(name='Empty Org', created_by=user)
        OrganizationMembership.objects.create(organization=org, user=user, role='owner')
        project = Project.objects.create(organization=org, name='Empty Project', base_url='https://empty.com')

        api_client.force_authenticate(user=user)
        res = api_client.get(f'/api/v1/metrics/traffic/?projectId={project.id}&timeRange=24h')
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 24
        for w in res.data:
            assert w['requests'] == 0
            assert w['errorRate'] == 0.0

    def test_dashboard_summary_kpis(self, api_client, metrics_setup):
        user, project, ep1, ep2 = metrics_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/dashboard/?projectId={project.id}')
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert data['totalEndpoints'] == 2
        assert data['healthyEndpoints'] == 1
        assert data['totalRequests'] == 2
        assert data['errorRate'] == 50.0 # 1 out of 2 events is 500
        assert data['avgLatency'] > 0

    def test_endpoint_timeseries_metrics(self, api_client, metrics_setup):
        user, project, ep1, ep2 = metrics_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/endpoints/{ep1.id}/metrics/?timeRange=24h')
        assert res.status_code == status.HTTP_200_OK
        windows = res.data
        assert len(windows) == 24
        assert 'p95Latency' in windows[0]

