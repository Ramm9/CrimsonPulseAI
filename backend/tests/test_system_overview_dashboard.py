import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from common.utils import normalize_path

@pytest.fixture
def system_overview_setup(db):
    user = User.objects.create_user(
        email='auditor@crimsonpulse.internal',
        name='Observability Auditor',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Audit Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')

    project_a = Project.objects.create(
        organization=org,
        name='HomeSyncAI',
        slug='homesyncai',
        base_url='http://localhost:8001',
        environment='development',
    )
    project_b = Project.objects.create(
        organization=org,
        name='ShopX',
        slug='shopx',
        base_url='http://localhost:9000',
        environment='production',
    )

    ep_a1 = Endpoint.objects.create(
        project=project_a,
        method='GET',
        path='/api/houses/',
        request_count=50,
        avg_latency=45.0,
        p50_latency=40.0,
        p95_latency=85.0,
        error_rate=0.0,
        health='healthy',
    )
    ep_a2 = Endpoint.objects.create(
        project=project_a,
        method='POST',
        path='/api/houses/',
        request_count=10,
        avg_latency=120.0,
        p50_latency=110.0,
        p95_latency=190.0,
        error_rate=10.0,
        health='healthy',
    )
    ep_a_opt = Endpoint.objects.create(
        project=project_a,
        method='OPTIONS',
        path='/api/houses/',
        request_count=50,
        avg_latency=2.0,
        p50_latency=2.0,
        p95_latency=3.0,
        error_rate=0.0,
        health='healthy',
    )

    now = timezone.now()

    # Telemetry for Project A in 'development'
    # 10 GET events with known latencies: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    for i, lat in enumerate([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]):
        TelemetryEvent.objects.create(
            project=project_a,
            endpoint=ep_a1,
            raw_path='/api/houses/',
            normalized_path='/api/houses/',
            method='GET',
            status_code=200 if i < 9 else 500, # 1 error out of 10 -> 10% error rate
            response_time_ms=lat,
            environment='development',
            timestamp=now - timedelta(minutes=5 * i),
        )

    # 5 OPTIONS events in 'development'
    for _ in range(5):
        TelemetryEvent.objects.create(
            project=project_a,
            endpoint=ep_a_opt,
            raw_path='/api/houses/',
            normalized_path='/api/houses/',
            method='OPTIONS',
            status_code=200,
            response_time_ms=2.5,
            environment='development',
            timestamp=now - timedelta(minutes=2),
        )

    # 3 events in 'staging' for Project A
    for _ in range(3):
        TelemetryEvent.objects.create(
            project=project_a,
            endpoint=ep_a1,
            raw_path='/api/houses/',
            normalized_path='/api/houses/',
            method='GET',
            status_code=200,
            response_time_ms=30.0,
            environment='staging',
            timestamp=now - timedelta(minutes=15),
        )

    # 2 events in Project B ('production')
    ep_b1 = Endpoint.objects.create(
        project=project_b,
        method='GET',
        path='/api/v1/products/',
        request_count=2,
        health='healthy',
    )
    TelemetryEvent.objects.create(
        project=project_b,
        endpoint=ep_b1,
        raw_path='/api/v1/products/',
        normalized_path='/api/v1/products/',
        method='GET',
        status_code=200,
        response_time_ms=15.0,
        environment='production',
        timestamp=now - timedelta(minutes=1),
    )

    return user, project_a, project_b, ep_a1, ep_a2, ep_a_opt


@pytest.mark.django_db
class TestSystemOverviewDashboard:
    """Automated verification suite for CrimsonPulse AI System Overview dashboard."""

    def test_route_normalization_no_regex_artifacts(self):
        """Verify normalize_path completely strips Django router regex artifacts."""
        cases = [
            ('^api/houses/$', '/api/houses/'),
            ('^api/houses/(?P<pk>[^/.]+)/$', '/api/houses/{id}/'),
            ('/api/houses/(/', '/api/houses/{id}/'),
            ('/api/houses/$/', '/api/houses/'),
            ('api/v1/devices/123/status', '/api/v1/devices/{id}/status/'),
            ('/api/houses/1500/', '/api/houses/{id}/'),
            ('/api/users/123e4567-e89b-12d3-a456-426614174000/', '/api/users/{id}/'),
            ('/api/users/7f9a12c8-8921-4f30-8012-984218a00192', '/api/users/{id}/'),
        ]
        for raw, expected in cases:
            normalized = normalize_path(raw)
            assert normalized == expected, f"Failed: normalize_path({raw!r}) -> {normalized!r}, expected {expected!r}"

    def test_dashboard_summary_environment_filtering(self, api_client, system_overview_setup):
        """Verify dashboard summary strictly isolates environment metrics."""
        user, project_a, project_b, ep_a1, ep_a2, ep_a_opt = system_overview_setup
        api_client.force_authenticate(user=user)

        # 1. Query Project A with environment=development
        # Development has 10 GET events (OPTIONS excluded by default)
        res_dev = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert res_dev.status_code == status.HTTP_200_OK
        data_dev = res_dev.data
        assert data_dev['totalRequests'] == 10
        assert data_dev['errorRate'] == 10.0
        assert data_dev['lastEventTimestamp'] is not None

        # 2. Query Project A with environment=staging
        # Staging has 3 GET events
        res_stg = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=staging&timeRange=24h')
        assert res_stg.status_code == status.HTTP_200_OK
        data_stg = res_stg.data
        assert data_stg['totalRequests'] == 3
        assert data_stg['errorRate'] == 0.0

        # 3. Query Project A with environment=production
        # Project A has 0 events in production
        res_prod = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=production&timeRange=24h')
        assert res_prod.status_code == status.HTTP_200_OK
        data_prod = res_prod.data
        assert data_prod['totalRequests'] == 0
        assert data_prod['errorRate'] == 0.0
        assert data_prod['avgLatency'] == 0.0
        assert data_prod['p95Latency'] == 0.0

    def test_dashboard_summary_real_p95_calculation(self, api_client, system_overview_setup):
        """Verify P50 and P95 are calculated using true percentiles, NOT fake multipliers (avg_lat * 1.5)."""
        user, project_a, project_b, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        # Latencies were [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        # avg = 55.0
        # If legacy fake formula was used: avg * 1.5 = 82.5
        # Real percentile index int(0.95 * 9) = 8 -> 90.0
        # P50 index int(0.50 * 9) = 4 -> 50.0
        assert data['avgLatency'] == 55.0
        assert data['p50Latency'] == 50.0
        assert data['p95Latency'] == 90.0
        assert data['p95Latency'] != 82.5, "P95 was incorrectly calculated using avg * 1.5 multiplier!"

    def test_options_cors_preflight_exclusion(self, api_client, system_overview_setup):
        """Verify OPTIONS preflight requests are excluded by default and included when requested."""
        user, project_a, _, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        # By default includeOptions=False: 10 GET requests
        res_default = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert res_default.status_code == status.HTTP_200_OK
        assert res_default.data['totalRequests'] == 10

        # With includeOptions=true: 10 GET + 5 OPTIONS = 15 requests
        res_with_opts = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h&includeOptions=true')
        assert res_with_opts.status_code == status.HTTP_200_OK
        assert res_with_opts.data['totalRequests'] == 15

    def test_traffic_metrics_environment_and_options_filtering(self, api_client, system_overview_setup):
        """Verify time-series traffic metrics respect environment and OPTIONS exclusion."""
        user, project_a, _, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=1h')
        assert res.status_code == status.HTTP_200_OK
        windows = res.data
        assert len(windows) == 12

        total_window_requests = sum(w['requests'] for w in windows)
        assert total_window_requests == 10

        # Staging query for traffic metrics
        res_stg = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=staging&timeRange=1h')
        assert res_stg.status_code == status.HTTP_200_OK
        total_stg_requests = sum(w['requests'] for w in res_stg.data)
        assert total_stg_requests == 3

    def test_cross_project_isolation(self, api_client, system_overview_setup):
        """Verify Project B metrics are completely isolated from Project A."""
        user, project_a, project_b, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        # Query Project B (1 event in production)
        res_b = api_client.get(f'/api/v1/dashboard/?projectId={project_b.id}&environment=production&timeRange=24h')
        assert res_b.status_code == status.HTTP_200_OK
        assert res_b.data['totalRequests'] == 1
        assert res_b.data['avgLatency'] == 15.0

        # Query Project B in development (should be 0, no leakage from Project A)
        res_b_dev = api_client.get(f'/api/v1/dashboard/?projectId={project_b.id}&environment=development&timeRange=24h')
        assert res_b_dev.status_code == status.HTTP_200_OK
        assert res_b_dev.data['totalRequests'] == 0

    def test_endpoints_api_method_and_options_filtering(self, api_client, system_overview_setup):
        """Verify endpoint list filters by method, environment, and preflight exclusion."""
        user, project_a, _, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        # 1. Without excludeOptions: all 3 endpoints for Project A
        res_all = api_client.get(f'/api/v1/endpoints/?projectId={project_a.id}')
        assert res_all.status_code == status.HTTP_200_OK
        methods = [ep['method'] for ep in res_all.data]
        assert 'OPTIONS' in methods

        # 2. With excludeOptions=true: OPTIONS endpoint is filtered out
        res_no_opts = api_client.get(f'/api/v1/endpoints/?projectId={project_a.id}&excludeOptions=true')
        assert res_no_opts.status_code == status.HTTP_200_OK
        methods_no_opts = [ep['method'] for ep in res_no_opts.data]
        assert 'OPTIONS' not in methods_no_opts
        assert len(methods_no_opts) == 2

        # 3. Method filter for POST only
        res_post = api_client.get(f'/api/v1/endpoints/?projectId={project_a.id}&method=POST')
        assert res_post.status_code == status.HTTP_200_OK
        assert len(res_post.data) == 1
        assert res_post.data[0]['method'] == 'POST'

    def test_all_five_time_range_options(self, api_client, system_overview_setup):
        """
        Verify exact timestamp boundary behavior and window counts for all 5 time-range options:
        1H, 6H, 24H, 7D, 30D, and safe fallback for invalid window.
        """
        user, project_a, _, ep_a1, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        # Clear existing telemetry for project_a to test exact boundaries
        TelemetryEvent.objects.filter(project=project_a).delete()

        now = timezone.now()
        # Known timestamped events:
        # Event 1: 30m ago  -> in 1h, 6h, 24h, 7d, 30d
        # Event 2: 3h ago   -> in 6h, 24h, 7d, 30d (NOT in 1h)
        # Event 3: 18h ago  -> in 24h, 7d, 30d (NOT in 1h, 6h)
        # Event 4: 4d ago   -> in 7d, 30d (NOT in 1h, 6h, 24h)
        # Event 5: 20d ago  -> in 30d (NOT in 1h, 6h, 24h, 7d)
        # Event 6: 45d ago  -> OUTSIDE all windows
        offsets = [
            timedelta(minutes=30),
            timedelta(hours=3),
            timedelta(hours=18),
            timedelta(days=4),
            timedelta(days=20),
            timedelta(days=45),
        ]
        for idx, offset in enumerate(offsets):
            TelemetryEvent.objects.create(
                project=project_a,
                endpoint=ep_a1,
                raw_path='/api/houses/',
                normalized_path='/api/houses/',
                method='GET',
                status_code=200,
                response_time_ms=50.0 + (idx * 10),
                environment='development',
                timestamp=now - offset,
            )

        # 1. Test 1H: exactly 1 event (30m ago)
        res_1h = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=1h')
        assert res_1h.status_code == status.HTTP_200_OK
        assert res_1h.data['totalRequests'] == 1
        # Traffic chart windows for 1h: 12 steps of 5 min
        tr_1h = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=1h')
        assert len(tr_1h.data) == 12

        # 2. Test 6H: exactly 2 events (30m, 3h ago)
        res_6h = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=6h')
        assert res_6h.status_code == status.HTTP_200_OK
        assert res_6h.data['totalRequests'] == 2
        # Traffic chart windows for 6h: 12 steps of 30 min
        tr_6h = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=6h')
        assert len(tr_6h.data) == 12

        # 3. Test 24H: exactly 3 events (30m, 3h, 18h ago)
        res_24h = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert res_24h.status_code == status.HTTP_200_OK
        assert res_24h.data['totalRequests'] == 3
        # Traffic chart windows for 24h: 24 steps of 1 hour
        tr_24h = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert len(tr_24h.data) == 24

        # 4. Test 7D: exactly 4 events (30m, 3h, 18h, 4d ago)
        res_7d = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=7d')
        assert res_7d.status_code == status.HTTP_200_OK
        assert res_7d.data['totalRequests'] == 4
        # Traffic chart windows for 7d: 14 steps of 12 hours
        tr_7d = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=7d')
        assert len(tr_7d.data) == 14

        # 5. Test 30D: exactly 5 events (30m, 3h, 18h, 4d, 20d ago; 45d excluded)
        res_30d = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=30d')
        assert res_30d.status_code == status.HTTP_200_OK
        assert res_30d.data['totalRequests'] == 5
        # Traffic chart windows for 30d: 30 steps of 1 day
        tr_30d = api_client.get(f'/api/v1/metrics/traffic/?projectId={project_a.id}&environment=development&timeRange=30d')
        assert len(tr_30d.data) == 30

        # 6. Test invalid time range safely falls back to 24H
        res_invalid = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=invalid_val')
        assert res_invalid.status_code == status.HTTP_200_OK
        assert res_invalid.data['totalRequests'] == 3 # 24h window has 3

    def test_low_sample_endpoint_health_scenarios(self, api_client, system_overview_setup):
        """
        Verify all 8 endpoint health scenarios:
        1. One successful request -> unknown (Insufficient Data)
        2. One HTTP 401 -> unknown (Insufficient Data, explains 401)
        3. One HTTP 404 -> unknown (Insufficient Data, explains 404)
        4. One HTTP 500 -> unknown (Insufficient Data, explains 500, no critical alert)
        5. Four successful requests -> unknown (Insufficient Data)
        6. Four requests with multiple server failures (2x 500) -> critical
        7. Five requests with sustained error rate -> critical
        8. High latency with no errors -> critical (>2000ms)
        """
        user, project_a, _, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        from apps.telemetry.services import process_telemetry_batch
        from apps.endpoints.serializers import EndpointSerializer

        def ingest_single(path: str, method: str, status_code: int, latency: float = 100.0):
            payload = [{
                'path': path,
                'method': method,
                'statusCode': status_code,
                'responseTime': latency,
                'environment': 'development',
                'timestamp': timezone.now().isoformat(),
            }]
            process_telemetry_batch(project_a, payload)
            ep = Endpoint.objects.get(project=project_a, path=path, method=method)
            return ep, EndpointSerializer(ep).data

        # Scenario 1: One successful request (1 req, 200)
        ep1, data1 = ingest_single('/api/test/one-success/', 'GET', 200)
        assert ep1.health == 'unknown'
        assert 'Insufficient data' in data1['healthReason']

        # Scenario 2: One HTTP 401
        ep2, data2 = ingest_single('/api/test/one-401/', 'GET', 401)
        assert ep2.health == 'unknown'
        assert 'Insufficient data' in data2['healthReason']
        assert '4xx client error' in data2['healthReason']

        # Scenario 3: One HTTP 404
        ep3, data3 = ingest_single('/api/test/one-404/', 'GET', 404)
        assert ep3.health == 'unknown'
        assert 'Insufficient data' in data3['healthReason']
        assert '4xx client error' in data3['healthReason']

        # Scenario 4: One HTTP 500 (sample size 1 does not open critical alert)
        ep4, data4 = ingest_single('/api/test/one-500/', 'GET', 500)
        assert ep4.health == 'unknown'
        assert '1x 500 error' in data4['healthReason']
        assert 'monitoring for recurrence' in data4['healthReason']

        # Scenario 5: Four successful requests
        for _ in range(4):
            ingest_single('/api/test/four-success/', 'GET', 200)
        ep5 = Endpoint.objects.get(project=project_a, path='/api/test/four-success/', method='GET')
        data5 = EndpointSerializer(ep5).data
        assert ep5.health == 'unknown'
        assert 'Insufficient data (4 reqs)' in data5['healthReason']

        # Scenario 6: Four requests with multiple server failures (2x 200, 2x 500)
        ingest_single('/api/test/four-multiple-fail/', 'GET', 200)
        ingest_single('/api/test/four-multiple-fail/', 'GET', 200)
        ingest_single('/api/test/four-multiple-fail/', 'GET', 500)
        ep6, data6 = ingest_single('/api/test/four-multiple-fail/', 'GET', 500)
        assert ep6.health == 'critical'
        assert 'repeated server errors' in data6['healthReason']

        # Scenario 7: Five requests with sustained error rate (3x 200, 2x 500 -> 40% 5xx)
        for _ in range(3):
            ingest_single('/api/test/five-sustained-err/', 'GET', 200)
        ingest_single('/api/test/five-sustained-err/', 'GET', 500)
        ep7, data7 = ingest_single('/api/test/five-sustained-err/', 'GET', 500)
        assert ep7.health == 'critical'
        assert 'elevated server errors' in data7['healthReason']

        # Scenario 8: High latency with no errors (5 reqs, avg latency 2500ms > 2000ms, 0 errors)
        for _ in range(5):
            ep8, data8 = ingest_single('/api/test/high-latency/', 'GET', 200, latency=2500.0)
        assert ep8.health == 'critical'
        assert 'severe latency degradation' in data8['healthReason']

    def test_options_traffic_accounting_separate(self, api_client, system_overview_setup):
        """Verify explicit separate accounting for Application Requests and OPTIONS Preflights."""
        user, project_a, _, _, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        res = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h')
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        # In system_overview_setup:
        # appRequests: 10 GET requests
        # preflightRequests: 5 OPTIONS requests
        assert 'appRequests' in data
        assert 'preflightRequests' in data
        assert data['appRequests'] == 10
        assert data['preflightRequests'] == 5
        # By default preflights are excluded from totalRequests KPI
        assert data['totalRequests'] == 10
        assert data['policy'] == 'preflight_excluded_by_default'

        # When includeOptions=true: totalRequests = appRequests + preflightRequests = 15
        res_with_opts = api_client.get(f'/api/v1/dashboard/?projectId={project_a.id}&environment=development&timeRange=24h&includeOptions=true')
        assert res_with_opts.status_code == status.HTTP_200_OK
        assert res_with_opts.data['totalRequests'] == 15
        assert res_with_opts.data['appRequests'] == 10
        assert res_with_opts.data['preflightRequests'] == 5
        assert res_with_opts.data['policy'] == 'preflight_included'

    def test_open_incidents_scoped_to_project_and_environment(self, api_client, system_overview_setup):
        """Verify Open Incidents query is scoped strictly to project and environment."""
        user, project_a, project_b, ep_a1, _, _ = system_overview_setup
        api_client.force_authenticate(user=user)

        from apps.incidents.models import Incident

        # Create an open incident for Project A in development
        inc_a = Incident.objects.create(
            project=project_a,
            endpoint=ep_a1,
            title='Error surge on /api/houses/',
            description='Elevated 5xx errors observed',
            severity='critical',
            status='open',
        )

        # Query Project A in development
        res_a = api_client.get(f'/api/v1/incidents/?projectId={project_a.id}&environment=development&status=open')
        assert res_a.status_code == status.HTTP_200_OK
        incident_ids = [inc['id'] for inc in res_a.data]
        assert inc_a.id in incident_ids

        # Query Project B (should NOT contain inc_a)
        res_b = api_client.get(f'/api/v1/incidents/?projectId={project_b.id}&status=open')
        assert res_b.status_code == status.HTTP_200_OK
        incident_ids_b = [inc['id'] for inc in res_b.data]
        assert inc_a.id not in incident_ids_b

