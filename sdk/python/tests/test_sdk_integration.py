import pytest
import time
import queue
from django.test import RequestFactory
from django.http import HttpResponse, JsonResponse
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.services import create_project
from apps.telemetry.models import TelemetryEvent
from apps.endpoints.models import Endpoint

import crimsonpulse
from crimsonpulse import CrimsonPulseConfig, CrimsonPulseClient, CrimsonPulseMiddleware
from crimsonpulse.scrubber import scrub_headers, scrub_query_string
from crimsonpulse.middleware import set_middleware_client

@pytest.fixture
def test_project(db):
    user = User.objects.create_user(
        email='sdk.test@crimsonpulse.ai',
        password='TestPassword123!',
        name='SDK Engineer',
    )
    org = Organization.objects.create(name='SDK Test Org', slug='sdk-test-org')
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project, default_key, full_key = create_project(
        organization=org,
        name='Monitored Microservice',
        environment='production',
    )
    return project, default_key, full_key

class TestSDKClientAndScrubber:
    """Test unit capabilities of the CrimsonPulse Python SDK."""

    def test_client_side_header_scrubbing(self):
        headers = {
            'Authorization': 'Bearer super_secret_jwt_token',
            'Cookie': 'sessionid=xyz; csrftoken=abc',
            'X-Api-Key': 'cpk_live_raw_api_key_secret',
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0',
        }
        scrubbed = scrub_headers(headers)
        assert 'Authorization' not in scrubbed
        assert 'Cookie' not in scrubbed
        assert 'X-Api-Key' not in scrubbed
        assert scrubbed['Content-Type'] == 'application/json'
        assert scrubbed['User-Agent'] == 'Mozilla/5.0'

    def test_client_side_query_string_scrubbing(self):
        query = "page=2&limit=50&token=secret_oauth_token&api_key=cpk_live_123&sort=desc"
        scrubbed = scrub_query_string(query)
        assert 'token=[REDACTED]' in scrubbed
        assert 'api_key=[REDACTED]' in scrubbed
        assert 'secret_oauth_token' not in scrubbed
        assert 'cpk_live_123' not in scrubbed
        assert 'page=2' in scrubbed
        assert 'limit=50' in scrubbed

    def test_fail_open_queue_overflow(self):
        """When the bounded queue is completely full, SDK drops events without blocking or raising."""
        config = CrimsonPulseConfig(
            api_key='cpk_live_fake',
            max_queue_size=5,
            enabled=True,
        )
        client = CrimsonPulseClient(config)

        # Fill the queue to capacity
        for i in range(5):
            client._queue.put({'i': i})

        # 6th event must be dropped gracefully without raising queue.Full
        enqueued = client.enqueue({'i': 6})
        assert enqueued is False

@pytest.mark.django_db
class TestSDKDjangoMiddlewareIntegration:
    """Tests integrating CrimsonPulseMiddleware with Django requests."""

    def test_middleware_records_successful_request(self, test_project):
        project, default_key, full_key = test_project
        rf = RequestFactory()
        request = rf.get('/api/v1/orders/123/', {'filter': 'active', 'token': 'sensitive_jwt'})
        request.META['HTTP_AUTHORIZATION'] = 'Bearer secret_access_token'
        request.META['HTTP_USER_AGENT'] = 'TestClient/1.0'

        # Configure SDK client
        config = CrimsonPulseConfig(
            api_key=full_key,
            environment='production',
            app_version='1.4.2',
            capture_headers=False,  # Default: do not capture
            capture_query=True,
        )
        client = CrimsonPulseClient(config)
        set_middleware_client(client)

        def view(req):
            time.sleep(0.01)  # Simulate 10ms processing
            return JsonResponse({'order_id': 123, 'status': 'completed'})

        middleware = CrimsonPulseMiddleware(view)
        response = middleware(request)

        assert response.status_code == 200
        assert client._queue.qsize() == 1

        event = client._queue.get_nowait()
        assert event['endpoint'] == '/api/v1/orders/123/'
        assert event['method'] == 'GET'
        assert event['statusCode'] == 200
        assert event['responseTime'] >= 10.0
        assert event['environment'] == 'production'
        assert event['appVersion'] == '1.4.2'
        assert 'event_id' in event

        # Sensitive data check
        assert 'request_headers' not in event or 'authorization' not in event.get('request_headers', {})
        assert 'token=[REDACTED]' in event.get('request_query', '')
        assert 'sensitive_jwt' not in event.get('request_query', '')

    def test_middleware_captures_unhandled_exception(self, test_project):
        project, default_key, full_key = test_project
        rf = RequestFactory()
        request = rf.get('/api/v1/faulty/')

        config = CrimsonPulseConfig(api_key=full_key, enabled=True)
        client = CrimsonPulseClient(config)
        set_middleware_client(client)

        def broken_view(req):
            raise ValueError("Database connection pool exhausted")

        middleware = CrimsonPulseMiddleware(broken_view)

        with pytest.raises(ValueError, match="Database connection pool exhausted"):
            middleware(request)

        # Exception was re-raised for Django to handle, but telemetry was safely captured
        assert client._queue.qsize() == 1
        event = client._queue.get_nowait()
        assert event['endpoint'] == '/api/v1/faulty/'
        assert event['statusCode'] == 500
        assert 'ValueError: Database connection pool exhausted' in event['error']

    def test_end_to_end_sdk_dispatch_and_ingestion(self, test_project):
        from rest_framework.test import APIClient
        api_client = APIClient()
        project, default_key, full_key = test_project

        # Track event using SDK client directly
        config = CrimsonPulseConfig(
            api_key=full_key,
            api_url='/api/v1/ingest/events/',
        )
        client = CrimsonPulseClient(config)

        tracked = client.track_event(
            endpoint='/api/v1/payments/process',
            method='POST',
            status_code=201,
            response_time_ms=112.5,
            event_id='evt_sdk_e2e_01',
        )
        assert tracked is True

        # Send via DRF test client to verify full server-side processing
        batch = [client._queue.get_nowait()]
        res = api_client.post(
            '/api/v1/ingest/events/',
            batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == 202
        assert res.json()['accepted'] == 1

        # Verify PostgreSQL database persistence and endpoint creation
        db_event = TelemetryEvent.objects.filter(project=project, event_id='evt_sdk_e2e_01').first()
        assert db_event is not None
        assert db_event.method == 'POST'
        assert db_event.status_code == 201
        assert db_event.response_time_ms == 112.5

        db_endpoint = Endpoint.objects.filter(project=project, path='/api/v1/payments/process/', method='POST').first()
        assert db_endpoint is not None
        assert db_endpoint.request_count >= 1
