import pytest
from django.db import IntegrityError
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
        email='security@pulse-audit.internal',
        name='Security Engineer',
        password='Password123!',
        role='admin',
    )
    org = Organization.objects.create(name='Security Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    project = Project.objects.create(organization=org, name='Core Security API', base_url='https://sec.internal')

    full_key, prefix, masked_key, hashed_key = generate_api_key(project.environment)
    api_key = ProjectAPIKey.objects.create(
        project=project,
        name='Test Security Key',
        key_prefix=prefix,
        masked_key=masked_key,
        key_hash=hashed_key,
    )
    return user, project, full_key

@pytest.mark.django_db
class TestStage1SecurityAndIntegrity:
    def test_sensitive_headers_never_persisted(self, api_client, project_setup):
        user, project, full_key = project_setup

        payload = [
            {
                'endpoint': '/api/v1/secure-data/',
                'method': 'POST',
                'statusCode': 200,
                'responseTime': 85.0,
                'requestHeaders': {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.super-secret-token',
                    'Cookie': 'sessionid=sec_session_cookie_12345; csrftoken=abc',
                    'Set-Cookie': 'auth_token=jwt_cookie_value_999; Secure; HttpOnly',
                    'X-Api-Key': 'secret_external_partner_key_xyz',
                    'X-Auth-Token': 'secret_auth_token_value',
                    'X-Access-Token': 'secret_access_token',
                    'X-Refresh-Token': 'secret_refresh_token',
                    'X-CrimsonPulse-Key': full_key,
                    'Custom-Auth-Secret': 'confidential_password_123',
                    'User-Agent': 'CrimsonPulse-Python-SDK/1.0.0',
                    'Accept': 'application/json',
                    'X-Request-Id': 'req_a8f9c2d1',
                },
            }
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data['accepted'] == 1
        assert res.data['duplicates'] == 0

        # Retrieve stored event from PostgreSQL / SQLite
        event = TelemetryEvent.objects.get(project=project, raw_path='/api/v1/secure-data/')
        saved_headers = event.request_headers

        # Verify safe headers ARE preserved
        assert saved_headers.get('User-Agent') == 'CrimsonPulse-Python-SDK/1.0.0'
        assert saved_headers.get('Accept') == 'application/json'
        assert saved_headers.get('X-Request-Id') == 'req_a8f9c2d1'

        # Verify sensitive headers are NEVER persisted (case-insensitive check)
        header_keys_lower = [k.lower() for k in saved_headers.keys()]
        assert 'authorization' not in header_keys_lower
        assert 'cookie' not in header_keys_lower
        assert 'set-cookie' not in header_keys_lower
        assert 'x-api-key' not in header_keys_lower
        assert 'x-auth-token' not in header_keys_lower
        assert 'x-access-token' not in header_keys_lower
        assert 'x-refresh-token' not in header_keys_lower
        assert 'x-crimsonpulse-key' not in header_keys_lower
        assert 'custom-auth-secret' not in header_keys_lower

        # Verify no sensitive values leak anywhere in saved headers
        headers_str = str(saved_headers).lower()
        assert 'super-secret-token' not in headers_str
        assert 'sec_session_cookie' not in headers_str
        assert 'secret_external_partner_key' not in headers_str
        assert 'confidential_password' not in headers_str

    def test_query_string_sensitive_param_redacted(self, api_client, project_setup):
        user, project, full_key = project_setup

        payload = [
            {
                'endpoint': '/api/v1/search/',
                'method': 'GET',
                'statusCode': 200,
                'requestQuery': 'q=laptop&token=secret_oauth_token_123&api_key=partner_key_456&page=2',
            }
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED

        event = TelemetryEvent.objects.get(project=project, raw_path='/api/v1/search/')
        query = event.request_query

        # Preserves legitimate parameters
        assert 'q=laptop' in query
        assert 'page=2' in query

        # Redacts sensitive parameter values
        assert 'secret_oauth_token_123' not in query
        assert 'partner_key_456' not in query
        assert 'token=[REDACTED]' in query
        assert 'api_key=[REDACTED]' in query

    def test_error_message_apiKey_masked(self, api_client, project_setup):
        user, project, full_key = project_setup

        raw_api_key_leak = 'cpk_live_48f9a12c8b7e6d5c4b3a2019e8d7c6b5'
        payload = [
            {
                'endpoint': '/api/v1/auth/callback/',
                'method': 'POST',
                'statusCode': 500,
                'errorMessage': f"Failed connecting with key {raw_api_key_leak} and Bearer eyJhbGciOiJIUzI1Ni.jwt",
            }
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=payload,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED

        event = TelemetryEvent.objects.get(project=project, raw_path='/api/v1/auth/callback/')
        assert raw_api_key_leak not in event.error_message
        assert 'cpk_live_****[REDACTED]' in event.error_message
        assert 'Bearer [REDACTED]' in event.error_message

    def test_idempotency_prevents_duplicate_events(self, api_client, project_setup):
        user, project, full_key = project_setup

        batch = [
            {
                'eventId': 'evt_order_1001_idemp',
                'endpoint': '/api/v1/orders/1001/',
                'method': 'POST',
                'statusCode': 201,
                'responseTime': 150.0,
            }
        ]

        # First ingestion
        res1 = api_client.post(
            '/api/v1/ingest/events/',
            data=batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res1.status_code == status.HTTP_202_ACCEPTED
        assert res1.data['accepted'] == 1
        assert res1.data['duplicates'] == 0
        assert TelemetryEvent.objects.filter(project=project, event_id='evt_order_1001_idemp').count() == 1

        # Second ingestion with identical eventId
        res2 = api_client.post(
            '/api/v1/ingest/events/',
            data=batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res2.status_code == status.HTTP_202_ACCEPTED
        assert res2.data['accepted'] == 0
        assert res2.data['duplicates'] == 1

        # Total in DB must remain exactly 1
        assert TelemetryEvent.objects.filter(project=project, event_id='evt_order_1001_idemp').count() == 1

    def test_duplicate_events_do_not_increase_counters(self, api_client, project_setup):
        user, project, full_key = project_setup

        batch = [
            {
                'eventId': 'evt_counter_check_99',
                'endpoint': '/api/v1/counter-check/',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 100.0,
            }
        ]

        # First ingestion
        api_client.post(
            '/api/v1/ingest/events/',
            data=batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        ep = Endpoint.objects.get(project=project, path='/api/v1/counter-check/')
        assert ep.request_count == 1
        assert ep.status_2xx == 1

        # Resend duplicate batch 3 more times
        for _ in range(3):
            dup_res = api_client.post(
                '/api/v1/ingest/events/',
                data=batch,
                format='json',
                HTTP_X_CRIMSONPULSE_KEY=full_key,
            )
            assert dup_res.data['accepted'] == 0
            assert dup_res.data['duplicates'] == 1

        # Refresh endpoint from DB and ensure counters NEVER increased
        ep.refresh_from_db()
        assert ep.request_count == 1
        assert ep.status_2xx == 1

    def test_accurate_counts_reported(self, api_client, project_setup):
        user, project, full_key = project_setup

        mixed_batch = [
            {'eventId': 'evt_mix_1', 'endpoint': '/api/v1/mix/1/', 'method': 'GET', 'statusCode': 200},
            {'eventId': 'evt_mix_2', 'endpoint': '/api/v1/mix/2/', 'method': 'GET', 'statusCode': 200},
            {'eventId': 'evt_mix_1', 'endpoint': '/api/v1/mix/1/', 'method': 'GET', 'statusCode': 200}, # In-batch duplicate
            {'not_an_endpoint': 'malformed'}, # Rejected item
        ]

        res = api_client.post(
            '/api/v1/ingest/events/',
            data=mixed_batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data['accepted'] == 2
        assert res.data['duplicates'] == 1
        assert res.data['rejected'] == 1
        assert res.data['ingested'] == 2

    def test_database_uniqueness_constraint_enforced(self, project_setup):
        user, project, full_key = project_setup

        ep = Endpoint.objects.create(project=project, method='GET', path='/api/v1/db-constraint-test/')

        # First direct ORM creation
        TelemetryEvent.objects.create(
            project=project,
            endpoint=ep,
            event_id='evt_db_strict_unique_1',
            raw_path='/api/v1/db-constraint-test/',
            normalized_path='/api/v1/db-constraint-test/',
            method='GET',
            status_code=200,
            response_time_ms=50.0,
            timestamp=project.created_at,
        )

        # Second creation with identical (project, event_id) must raise IntegrityError at DB level
        with pytest.raises(IntegrityError):
            TelemetryEvent.objects.create(
                project=project,
                endpoint=ep,
                event_id='evt_db_strict_unique_1',
                raw_path='/api/v1/db-constraint-test/',
                normalized_path='/api/v1/db-constraint-test/',
                method='GET',
                status_code=200,
                response_time_ms=50.0,
                timestamp=project.created_at,
            )

