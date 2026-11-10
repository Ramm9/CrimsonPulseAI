import pytest
import time
from datetime import timedelta
from django.utils import timezone
from django.db import connection, IntegrityError
from django.test import RequestFactory
from django.http import JsonResponse, HttpResponse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.projects.services import create_project
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.telemetry.tasks import aggregate_endpoint_metrics_task
from apps.anomalies.models import Anomaly
from apps.anomalies.tasks import evaluate_endpoint_anomalies_task
from apps.incidents.models import Incident, IncidentTimelineEvent

import crimsonpulse
from crimsonpulse import CrimsonPulseConfig, CrimsonPulseClient, CrimsonPulseMiddleware
from crimsonpulse.middleware import set_middleware_client


# ==============================================================================
# TEST FIXTURES
# ==============================================================================

@pytest.fixture
def acceptance_env(db):
    """
    Creates a clean enterprise test environment with an organization,
    owner user, and production project with a generated API key.
    """
    user = User.objects.create_user(
        email='lead.architect@crimsonpulse.ai',
        password='ProductionReadyPassword2026!',
        name='Principal QA Architect',
    )
    org = Organization.objects.create(
        name='CrimsonPulse Acceptance Labs',
        slug='crimsonpulse-acceptance-labs',
    )
    OrganizationMembership.objects.create(
        organization=org,
        user=user,
        role='owner',
    )
    project, default_key_obj, full_api_key = create_project(
        organization=org,
        name='ShopX Core Microservice',
        environment='production',
        base_url='https://shopx.acceptance.internal',
    )
    return {
        'user': user,
        'organization': org,
        'project': project,
        'key_obj': default_key_obj,
        'api_key': full_api_key,
    }


# ==============================================================================
# TEST 1: CLEAN POSTGRESQL / DATABASE ENVIRONMENT
# ==============================================================================

@pytest.mark.django_db
class Test1_CleanDatabaseEnvironment:
    """
    Verifies clean database setup, schema integrity, and database constraints.
    """

    def test_database_engine_configuration(self):
        """Verify PostgreSQL driver availability and engine fallback logic."""
        import psycopg
        assert psycopg.__version__ is not None, "psycopg 3 must be installed"

        from django.conf import settings
        engine = settings.DATABASES['default']['ENGINE']
        # Django supports both postgresql and sqlite3 fallback
        assert 'postgresql' in engine or 'sqlite3' in engine

    def test_schema_models_and_tables_exist(self):
        """Confirm all core model tables exist in the current database."""
        table_names = connection.introspection.table_names()
        expected_tables = [
            'cp_users',
            'cp_organizations',
            'cp_organization_memberships',
            'cp_projects',
            'cp_project_api_keys',
            'cp_endpoints',
            'cp_telemetry_events',
            'cp_anomalies',
            'cp_incidents',
            'cp_incident_timeline_events',
            'cp_contracts',
        ]
        for tbl in expected_tables:
            assert tbl in table_names, f"Expected table {tbl} was not found in database"

    def test_telemetry_uniqueness_constraint_declared(self):
        """Verify unique_project_event_id constraint is explicitly declared on TelemetryEvent."""
        constraints = TelemetryEvent._meta.constraints
        unique_names = [c.name for c in constraints]
        assert 'unique_project_event_id' in unique_names, (
            "TelemetryEvent must enforce unique_project_event_id constraint"
        )


# ==============================================================================
# TEST 2: REAL SDK INTEGRATION (SHOPX MONITORED DJANGO APP)
# ==============================================================================

@pytest.mark.django_db
class Test2_RealSDKIntegration_ShopX:
    """
    Simulates a real external application 'ShopX' integrating CrimsonPulse SDK.
    Captures requests via CrimsonPulseMiddleware and persists telemetry.
    """

    def test_shopx_request_capture_and_ingestion(self, acceptance_env, api_client):
        project = acceptance_env['project']
        api_key = acceptance_env['api_key']

        # 1. Setup ShopX SDK configuration
        config = CrimsonPulseConfig(
            api_key=api_key,
            environment='production',
            app_version='2.1.0-shopx',
            capture_headers=False,
            capture_query=True,
        )
        sdk_client = CrimsonPulseClient(config)
        # Shutdown worker thread to capture items deterministically in memory queue for inspection
        sdk_client.shutdown()
        set_middleware_client(sdk_client)

        # 2. Simulate ShopX endpoints and requests
        rf = RequestFactory()

        # ShopX View 1: GET /api/products/
        def shopx_products_view(req):
            time.sleep(0.015)  # 15ms latency
            return JsonResponse({'products': [{'id': 1, 'name': 'Crimson Mechanical Keyboard', 'price': 149.99}]})

        req1 = rf.get('/api/products/', {'category': 'electronics'})
        mw1 = CrimsonPulseMiddleware(shopx_products_view)
        res1 = mw1(req1)
        assert res1.status_code == 200

        # ShopX View 2: POST /api/orders/
        def shopx_orders_view(req):
            time.sleep(0.025)  # 25ms latency
            return JsonResponse({'order_id': 'ord_98765', 'status': 'created', 'total': 149.99}, status=201)

        req2 = rf.post('/api/orders/', data={'product_id': 1, 'quantity': 1}, content_type='application/json')
        mw2 = CrimsonPulseMiddleware(shopx_orders_view)
        res2 = mw2(req2)
        assert res2.status_code == 201

        # ShopX View 3: GET /api/inventory/fail/ (500 Server Error)
        def shopx_inventory_error_view(req):
            raise RuntimeError("ShopX Inventory Connection Pool Depleted")

        req3 = rf.get('/api/inventory/fail/')
        mw3 = CrimsonPulseMiddleware(shopx_inventory_error_view)
        with pytest.raises(RuntimeError, match="Connection Pool Depleted"):
            mw3(req3)

        # 3. Verify SDK captured all 3 events
        assert sdk_client._queue.qsize() == 3
        captured_events = []
        while not sdk_client._queue.empty():
            captured_events.append(sdk_client._queue.get_nowait())

        # Inspect captured telemetry payload
        endpoints_captured = [e['endpoint'] for e in captured_events]
        assert '/api/products/' in endpoints_captured
        assert '/api/orders/' in endpoints_captured
        assert '/api/inventory/fail/' in endpoints_captured

        # 4. Dispatch telemetry to CrimsonPulse backend
        ingest_res = api_client.post(
            '/api/v1/ingest/events/',
            data=captured_events,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=api_key,
        )
        assert ingest_res.status_code == status.HTTP_202_ACCEPTED
        assert ingest_res.data['accepted'] == 3
        assert ingest_res.data['duplicates'] == 0
        assert ingest_res.data['rejected'] == 0

        # 5. Verify database records in PostgreSQL / SQLite
        db_events = TelemetryEvent.objects.filter(project=project)
        assert db_events.count() == 3

        # Verify endpoint discovery
        discovered = Endpoint.objects.filter(project=project).values_list('path', 'method')
        assert ('/api/products/', 'GET') in discovered
        assert ('/api/orders/', 'POST') in discovered
        assert ('/api/inventory/fail/', 'GET') in discovered


# ==============================================================================
# TEST 3: SECURITY AND DEDUPLICATION
# ==============================================================================

@pytest.mark.django_db
class Test3_SecurityAndDeduplication:
    """
    Verifies sanitization of credentials/headers and event idempotency.
    """

    def test_sensitive_headers_and_tokens_never_persisted(self, acceptance_env, api_client):
        project = acceptance_env['project']
        api_key = acceptance_env['api_key']

        # Construct raw payload containing sensitive tokens that should be scrubbed/sanitized
        payload = [
            {
                'event_id': 'evt_security_test_001',
                'endpoint': '/api/v1/payments/checkout/',
                'method': 'POST',
                'statusCode': 200,
                'responseTime': 45.0,
                'request_headers': {
                    'Authorization': 'Bearer super_secret_jwt_token',
                    'Cookie': 'sessionid=sec_sess_8912; csrftoken=csr_xyz',
                    'x-api-key': 'cpk_live_raw_api_secret',
                    'Content-Type': 'application/json',
                    'User-Agent': 'ShopX-Client/2.0',
                },
                'request_query': 'user_id=42&token=ultra_secret_access_token&apikey=cpk_live_123',
                'errorMessage': 'Failed with token ultra_secret_access_token in auth check',
            }
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=api_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED

        # Inspect database
        event = TelemetryEvent.objects.get(project=project, event_id='evt_security_test_001')
        stored_headers = event.request_headers

        # Secrets must be sanitized/redacted
        for secret_key in ['Authorization', 'authorization', 'Cookie', 'cookie', 'x-api-key', 'X-Api-Key']:
            if secret_key in stored_headers:
                assert stored_headers[secret_key] == '[REDACTED]'

        assert 'super_secret_jwt_token' not in str(stored_headers)
        assert 'sec_sess_8912' not in str(stored_headers)
        assert 'cpk_live_raw_api_secret' not in str(stored_headers)

        # Query parameter sanitization
        assert 'token=[REDACTED]' in event.request_query
        assert 'apikey=[REDACTED]' in event.request_query
        assert 'ultra_secret_access_token' not in event.request_query

    def test_event_idempotency_and_counter_integrity(self, acceptance_env, api_client):
        project = acceptance_env['project']
        api_key = acceptance_env['api_key']

        event_payload = [
            {
                'event_id': 'evt_idempotent_test_999',
                'endpoint': '/api/v1/cart/items/',
                'method': 'POST',
                'statusCode': 200,
                'responseTime': 50.0,
            }
        ]

        # First ingestion
        res1 = api_client.post(
            '/api/v1/ingest/events/',
            data=event_payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=api_key,
        )
        assert res1.status_code == status.HTTP_202_ACCEPTED
        assert res1.data['accepted'] == 1
        assert res1.data['duplicates'] == 0

        endpoint = Endpoint.objects.get(project=project, path='/api/v1/cart/items/', method='POST')
        initial_requests = endpoint.request_count
        assert initial_requests == 1
        total_events_before = TelemetryEvent.objects.filter(project=project).count()

        # Second ingestion with identical event_id
        res2 = api_client.post(
            '/api/v1/ingest/events/',
            data=event_payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=api_key,
        )
        assert res2.status_code == status.HTTP_202_ACCEPTED
        assert res2.data['accepted'] == 0
        assert res2.data['duplicates'] == 1

        # Confirm counters did not increment
        endpoint.refresh_from_db()
        assert endpoint.request_count == initial_requests, "Duplicate event must not increment request count"
        assert TelemetryEvent.objects.filter(project=project).count() == total_events_before

    def test_invalid_and_revoked_api_keys_rejected(self, acceptance_env, api_client):
        # 1. Test completely invalid API key
        res_invalid = api_client.post(
            '/api/v1/ingest/events/',
            data=[{'endpoint': '/test/', 'method': 'GET', 'statusCode': 200}],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY='cpk_live_invalid_nonexistent_key_999',
        )
        assert res_invalid.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

        # 2. Revoke the project's valid key
        key_obj = acceptance_env['key_obj']
        key_obj.status = 'revoked'
        key_obj.save()

        res_revoked = api_client.post(
            '/api/v1/ingest/events/',
            data=[{'endpoint': '/test/', 'method': 'GET', 'statusCode': 200}],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=acceptance_env['api_key'],
        )
        assert res_revoked.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


# ==============================================================================
# TEST 4: BACKGROUND PROCESSING (CELERY TASKS)
# ==============================================================================

@pytest.mark.django_db
class Test4_BackgroundProcessing:
    """
    Verifies Celery metric aggregation and anomaly detection tasks.
    """

    def test_celery_metric_aggregation_task(self, acceptance_env):
        project = acceptance_env['project']
        now = timezone.now()

        endpoint = Endpoint.objects.create(
            project=project,
            path='/api/v1/reports/export/',
            method='GET',
            health='healthy',
        )

        # Seed 10 events: 8 successful (200), 2 failures (500)
        events = []
        for i in range(8):
            events.append(TelemetryEvent(
                project=project,
                endpoint=endpoint,
                event_id=f'evt_celery_agg_{i}',
                raw_path='/api/v1/reports/export/',
                normalized_path='/api/v1/reports/export/',
                method='GET',
                status_code=200,
                response_time_ms=50.0 + (i * 10.0),
                timestamp=now - timedelta(minutes=5),
            ))
        for i in range(8, 10):
            events.append(TelemetryEvent(
                project=project,
                endpoint=endpoint,
                event_id=f'evt_celery_agg_{i}',
                raw_path='/api/v1/reports/export/',
                normalized_path='/api/v1/reports/export/',
                method='GET',
                status_code=500,
                response_time_ms=500.0,
                timestamp=now - timedelta(minutes=5),
            ))
        TelemetryEvent.objects.bulk_create(events)

        # Execute Celery aggregation task synchronously via apply
        task_res = aggregate_endpoint_metrics_task.apply(args=[endpoint.id])
        assert task_res.status == 'SUCCESS'
        result = task_res.result
        assert result['status'] == 'success'
        assert result['endpoint_id'] == endpoint.id
        assert result['request_count'] == 10
        assert result['error_rate'] == 20.0  # 2 out of 10

        # Verify database fields updated
        endpoint.refresh_from_db()
        assert endpoint.request_count == 10
        assert endpoint.error_rate == 20.0
        assert endpoint.health == 'critical'  # error_rate >= 10%
        assert endpoint.status_5xx == 2

    def test_celery_anomaly_evaluation_task_and_idempotency(self, acceptance_env):
        project = acceptance_env['project']
        now = timezone.now()

        endpoint = Endpoint.objects.create(
            project=project,
            path='/api/v1/search/query/',
            method='POST',
            health='healthy',
            request_count=10,
            error_rate=25.0,  # Escalated error rate
            avg_latency=150.0,
            p95_latency=200.0,
        )

        # Execute Celery anomaly evaluation task
        task_res1 = evaluate_endpoint_anomalies_task.apply(args=[endpoint.id])
        assert task_res1.status == 'SUCCESS'
        res1 = task_res1.result
        assert res1['status'] == 'success'
        assert res1['anomalies_created'] == 1

        # Run task a second time on the same state: verify no duplicate active anomalies
        task_res2 = evaluate_endpoint_anomalies_task.apply(args=[endpoint.id])
        assert task_res2.status == 'SUCCESS'
        res2 = task_res2.result
        assert res2['anomalies_created'] == 0


# ==============================================================================
# TEST 5: ANOMALY & INCIDENT WORKFLOW
# ==============================================================================

@pytest.mark.django_db
class Test5_AnomalyAndIncidentWorkflow:
    """
    Verifies detection rules, incident opening, timeline activity, and resolution.
    """

    def test_end_to_end_anomaly_and_incident_lifecycle(self, acceptance_env, api_client):
        project = acceptance_env['project']
        user = acceptance_env['user']

        # Authenticate API client for incident resolution
        login_res = api_client.post('/api/v1/auth/login/', data={
            'email': user.email,
            'password': 'ProductionReadyPassword2026!',
        }, format='json')
        token = login_res.data['token']
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        endpoint = Endpoint.objects.create(
            project=project,
            path='/api/v1/billing/charge/',
            method='POST',
            health='healthy',
            request_count=10,
            error_rate=0.0,
            avg_latency=45.0,
            p95_latency=60.0,
        )

        # 1. Normal traffic condition: 0 anomalies generated
        from apps.anomalies.services import evaluate_endpoint_anomalies
        anomalies_normal = evaluate_endpoint_anomalies(endpoint)
        assert len(anomalies_normal) == 0

        # 2. Abnormal traffic condition: Escalated error rate (15%)
        endpoint.error_rate = 15.0
        endpoint.save()

        anomalies_abnormal = evaluate_endpoint_anomalies(endpoint)
        assert len(anomalies_abnormal) == 1
        anomaly = anomalies_abnormal[0]
        assert anomaly.metric == 'Error Rate'
        assert anomaly.status == 'active'

        # 3. Verify incident created and linked
        incident = anomaly.related_incident
        assert incident is not None
        assert incident.status == 'open'
        assert 'Error Rate Surge' in incident.title
        assert incident.endpoint == endpoint

        # 4. Verify IncidentActivity timeline recorded
        timeline_events = IncidentTimelineEvent.objects.filter(incident=incident)
        assert timeline_events.exists()
        assert timeline_events.filter(event_type='created').exists()

        # 5. Resolve the incident via API PATCH
        resolve_res = api_client.patch(
            f'/api/v1/incidents/{incident.id}/',
            data={'status': 'resolved'},
            format='json',
        )
        assert resolve_res.status_code == status.HTTP_200_OK
        assert resolve_res.data['status'] == 'resolved'

        incident.refresh_from_db()
        assert incident.status == 'resolved'

        # Verify resolution recorded in timeline
        resolution_timeline = IncidentTimelineEvent.objects.filter(
            incident=incident,
            event_type='status_change',
        )
        assert resolution_timeline.exists()


# ==============================================================================
# TEST 6: MULTI-PROJECT ISOLATION
# ==============================================================================

@pytest.mark.django_db
class Test6_MultiProjectIsolation:
    """
    Verifies that Project Alpha and Project Beta data are strictly isolated.
    """

    def test_cross_project_isolation(self, api_client):
        # Create Project Alpha (Org Alpha)
        user_a = User.objects.create_user(email='user_a@alpha.test', password='Password123!', name='User A')
        org_a = Organization.objects.create(name='Org Alpha', slug='org-alpha')
        OrganizationMembership.objects.create(organization=org_a, user=user_a, role='owner')
        proj_alpha, _, key_alpha = create_project(organization=org_a, name='Project Alpha', environment='production')

        # Create Project Beta (Org Beta)
        user_b = User.objects.create_user(email='user_b@beta.test', password='Password123!', name='User B')
        org_b = Organization.objects.create(name='Org Beta', slug='org-beta')
        OrganizationMembership.objects.create(organization=org_b, user=user_b, role='owner')
        proj_beta, _, key_beta = create_project(organization=org_b, name='Project Beta', environment='staging')

        # Ingest telemetry for Project Alpha
        api_client.post('/api/v1/ingest/events/', data=[{
            'endpoint': '/api/alpha/catalog/',
            'method': 'GET',
            'statusCode': 200,
            'responseTime': 25.0,
        }], format='json', HTTP_X_CRIMSONPULSE_KEY=key_alpha)

        # Ingest telemetry for Project Beta
        api_client.post('/api/v1/ingest/events/', data=[{
            'endpoint': '/api/beta/checkout/',
            'method': 'POST',
            'statusCode': 201,
            'responseTime': 85.0,
        }], format='json', HTTP_X_CRIMSONPULSE_KEY=key_beta)

        # Log in as User A
        login_res_a = api_client.post('/api/v1/auth/login/', data={'email': user_a.email, 'password': 'Password123!'}, format='json')
        token_a = login_res_a.data['token']
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')

        # Query endpoints for Project Alpha
        res_endpoints_a = api_client.get(f'/api/v1/endpoints/?projectId={proj_alpha.id}')
        assert res_endpoints_a.status_code == status.HTTP_200_OK
        paths_a = [ep['path'] for ep in res_endpoints_a.data]
        assert '/api/alpha/catalog/' in paths_a
        assert '/api/beta/checkout/' not in paths_a

        # Query live traffic for Project Alpha
        res_traffic_a = api_client.get(f'/api/v1/projects/{proj_alpha.id}/traffic/')
        assert res_traffic_a.status_code == status.HTTP_200_OK
        traffic_paths_a = [t['endpoint'] for t in res_traffic_a.data]
        assert '/api/alpha/catalog/' in traffic_paths_a
        assert '/api/beta/checkout/' not in traffic_paths_a

        # Unauthorized attempt: User A attempts to query Project Beta's endpoints
        res_unauthorized = api_client.get(f'/api/v1/endpoints/?projectId={proj_beta.id}')
        # Should return 404, 403, or empty list (zero cross-project leakage)
        assert res_unauthorized.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN] or len(res_unauthorized.data) == 0


# ==============================================================================
# TEST 7: OFFLINE BEHAVIOR & DEMO MODE VERIFICATION
# ==============================================================================

@pytest.mark.django_db
class Test7_OfflineBehavior:
    """
    Verifies that frontend code clearly differentiates Demo Mode vs Live Connected,
    and warns users that local demo mutations are not saved to a backend server.
    """

    def test_frontend_offline_contract(self):
        from pathlib import Path

        repo_root = Path(__file__).resolve().parent.parent.parent
        app_store_path = repo_root / 'frontend' / 'src' / 'store' / 'appStore.ts'
        topbar_path = repo_root / 'frontend' / 'src' / 'components' / 'layout' / 'Topbar.tsx'
        api_service_path = repo_root / 'frontend' / 'src' / 'services' / 'api.ts'

        assert app_store_path.exists(), "appStore.ts must exist"
        assert topbar_path.exists(), "Topbar.tsx must exist"
        assert api_service_path.exists(), "api.ts must exist"

        topbar_content = topbar_path.read_text(encoding='utf-8')
        assert "Demo Mode — Backend Disconnected" in topbar_content
        assert "Live API Connected" in topbar_content

        api_service_content = api_service_path.read_text(encoding='utf-8')
        # Verify toast notifications for local unpersisted simulation
        assert "[Demo Mode]" in api_service_content
        assert "Backend is currently offline. This action was simulated in local memory and not committed to PostgreSQL." in api_service_content


# ==============================================================================
# TEST 8: SYSTEM HEALTH & INTEGRITY
# ==============================================================================

@pytest.mark.django_db
class Test8_SystemHealthAndIntegrity:
    """
    Confirms system health endpoint returns operational status.
    """

    def test_health_check_endpoint(self, api_client):
        res = api_client.get('/api/v1/health/')
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert data['status'] == 'healthy'
        assert data['service'] == 'CrimsonPulse AI Backend'
        assert 'version' in data
        assert 'timestamp' in data
