import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.core.management import call_command
from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.projects.models import Project, ProjectAPIKey
from apps.telemetry.models import TelemetryEvent
from apps.endpoints.models import Endpoint
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_invalid_credentials_returns_401(client):
    """
    Verify that login with non-existent or incorrect credentials
    returns HTTP 401 Unauthorized with standard error envelope.
    """
    response = client.post('/api/v1/auth/login/', {
        'email': 'nonexistent.user@example.com',
        'password': 'WrongPassword123!',
    }, format='json')

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert data.get('error') is True
    assert data.get('status_code') == 401
    assert 'Invalid email or password' in data.get('message', '')


@pytest.mark.django_db
def test_real_user_registration_creates_postgres_records(client):
    """
    Verify registration creates a real User, Organization, OrganizationMembership,
    and returns valid JWT tokens.
    """
    email = 'dev.lead@crimsonpulse-test.io'
    response = client.post('/api/v1/auth/register/', {
        'name': 'Dev Lead',
        'email': email,
        'password': 'SecurePassword2026!',
        'organization_name': 'DevOps Engineering Hub',
    }, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert 'token' in data
    assert 'tokens' in data
    assert data['tokens']['access'] == data['token']
    assert 'refresh' in data['tokens']
    assert data['user']['email'] == email
    assert data['organization']['name'] == 'DevOps Engineering Hub'

    # Verify directly in PostgreSQL
    user = User.objects.filter(email=email).first()
    assert user is not None
    assert user.name == 'Dev Lead'
    assert user.check_password('SecurePassword2026!')

    org = Organization.objects.filter(name='DevOps Engineering Hub').first()
    assert org is not None
    assert org.memberships.filter(user=user, role='owner').exists()


@pytest.mark.django_db
def test_duplicate_registration_rejected_400(client):
    """
    Verify that registering with an already existing email address
    is rejected with HTTP 400 Bad Request.
    """
    email = 'duplicate.test@crimsonpulse-test.io'
    client.post('/api/v1/auth/register/', {
        'name': 'Original User',
        'email': email,
        'password': 'Password123!',
    }, format='json')

    # Attempt duplicate registration
    response = client.post('/api/v1/auth/register/', {
        'name': 'Impostor User',
        'email': email,
        'password': 'DifferentPassword123!',
    }, format='json')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert data.get('error') is True
    assert 'already exists' in str(data.get('message', ''))


@pytest.mark.django_db
def test_valid_login_returns_jwt_and_profile(client):
    """
    Verify valid credentials authenticate successfully against PostgreSQL
    and return valid JWT tokens and user profile.
    """
    email = 'valid.login@crimsonpulse-test.io'
    client.post('/api/v1/auth/register/', {
        'name': 'Valid User',
        'email': email,
        'password': 'ValidPassword123!',
    }, format='json')

    response = client.post('/api/v1/auth/login/', {
        'email': email,
        'password': 'ValidPassword123!',
    }, format='json')

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert 'token' in data
    assert 'tokens' in data
    assert data['user']['email'] == email


@pytest.mark.django_db
def test_protected_endpoints_require_jwt_auth(client):
    """
    Verify unauthenticated requests to /auth/me/ receive HTTP 401,
    while Bearer-authenticated requests receive HTTP 200 with profile.
    """
    # 1. Unauthenticated request
    unauth_res = client.get('/api/v1/auth/me/')
    assert unauth_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Register & get real JWT
    email = 'auth.me.test@crimsonpulse-test.io'
    reg_res = client.post('/api/v1/auth/register/', {
        'name': 'Auth Me User',
        'email': email,
        'password': 'Password123!',
    }, format='json')
    token = reg_res.json()['token']

    # 3. Authenticated request with Bearer header
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    auth_res = client.get('/api/v1/auth/me/')
    assert auth_res.status_code == status.HTTP_200_OK
    assert auth_res.json()['email'] == email


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(client):
    """
    Verify that logging out blacklists the provided refresh token.
    """
    reg_res = client.post('/api/v1/auth/register/', {
        'name': 'Logout User',
        'email': 'logout.user@crimsonpulse-test.io',
        'password': 'Password123!',
    }, format='json')
    refresh_token = reg_res.json()['tokens']['refresh']
    access_token = reg_res.json()['tokens']['access']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    logout_res = client.post('/api/v1/auth/logout/', {'refresh': refresh_token}, format='json')
    assert logout_res.status_code == status.HTTP_200_OK

    # Attempting to refresh with the blacklisted token must now fail
    refresh_res = client.post('/api/v1/auth/refresh/', {'refresh': refresh_token}, format='json')
    assert refresh_res.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_empty_state_metrics_and_endpoints(client):
    """
    Verify that when no telemetry has been dispatched,
    metrics endpoints return genuine 0 counts, and endpoints/anomalies/incidents return empty arrays.
    """
    reg_res = client.post('/api/v1/auth/register/', {
        'name': 'Empty State User',
        'email': 'empty.state@crimsonpulse-test.io',
        'password': 'Password123!',
    }, format='json')
    token = reg_res.json()['token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # Overview metrics
    res_metrics = client.get('/api/v1/metrics/dashboard/')
    assert res_metrics.status_code == status.HTTP_200_OK
    summary = res_metrics.json()
    assert summary['totalRequests'] == 0
    assert summary['avgLatency'] == 0.0
    assert summary['errorRate'] == 0.0
    assert summary['totalEndpoints'] == 0

    # Endpoints list
    res_ep = client.get('/api/v1/endpoints/')
    assert res_ep.status_code == status.HTTP_200_OK
    assert res_ep.json() == []

    # Anomalies list
    res_anom = client.get('/api/v1/anomalies/')
    assert res_anom.status_code == status.HTTP_200_OK
    assert res_anom.json() == []

    # Incidents list
    res_inc = client.get('/api/v1/incidents/')
    assert res_inc.status_code == status.HTTP_200_OK
    assert res_inc.json() == []

    # Traffic feed
    res_traffic = client.get('/api/v1/traffic/')
    assert res_traffic.status_code == status.HTTP_200_OK
    assert res_traffic.json() == []


@pytest.mark.django_db
def test_live_sdk_telemetry_flow(client):
    """
    Verify that genuine telemetry dispatched with a project API key
    is ingested into PostgreSQL and reflected in live metrics and traffic.
    """
    # 1. Register user
    reg_res = client.post('/api/v1/auth/register/', {
        'name': 'Telemetry Tester',
        'email': 'telemetry.tester@crimsonpulse-test.io',
        'password': 'Password123!',
    }, format='json')
    user_token = reg_res.json()['token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token}')

    # 2. Create monitored project
    proj_res = client.post('/api/v1/projects/', {
        'name': 'Production Service Alpha',
        'description': 'Real monitored service',
        'environment': 'production',
        'baseUrl': 'https://api.servicealpha.io',
    }, format='json')
    assert proj_res.status_code == status.HTTP_201_CREATED
    project_id = proj_res.json()['id']

    # 3. Create project API key
    key_res = client.post(f'/api/v1/projects/{project_id}/keys/', {
        'name': 'SDK Primary Ingestion Key',
    }, format='json')
    assert key_res.status_code == status.HTTP_201_CREATED
    raw_api_key = key_res.json().get('raw_key') or key_res.json().get('fullKey') or key_res.json().get('key')
    assert raw_api_key.startswith('cpk_')

    # 4. Ingest real telemetry event via SDK gateway
    ingest_client = APIClient()
    ingest_client.credentials(HTTP_X_CRIMSONPULSE_KEY=raw_api_key)
    event_payload = {
        'endpoint': '/api/v1/orders/',
        'method': 'POST',
        'statusCode': 201,
        'responseTime': 65.4,
        'environment': 'production',
        'appVersion': '1.0.0',
    }
    ingest_res = ingest_client.post('/api/v1/ingest/events/', event_payload, format='json')
    assert ingest_res.status_code == status.HTTP_202_ACCEPTED
    assert ingest_res.json()['accepted'] == 1

    # 5. Verify metrics update
    dashboard_res = client.get(f'/api/v1/metrics/dashboard/?projectId={project_id}')
    assert dashboard_res.status_code == status.HTTP_200_OK
    metrics = dashboard_res.json()
    assert metrics['totalRequests'] == 1
    assert metrics['avgLatency'] == 65.4
    assert metrics['errorRate'] == 0.0

    # 6. Verify endpoint discovery
    endpoints_res = client.get(f'/api/v1/endpoints/?projectId={project_id}')
    assert endpoints_res.status_code == status.HTTP_200_OK
    eps = endpoints_res.json()
    assert len(eps) == 1
    assert eps[0]['path'] == '/api/v1/orders/'
    assert eps[0]['method'] == 'POST'
    assert eps[0]['requestCount'] == 1

    # 7. Verify live traffic feed
    traffic_res = client.get(f'/api/v1/traffic/?projectId={project_id}')
    assert traffic_res.status_code == status.HTTP_200_OK
    feed = traffic_res.json()
    assert len(feed) == 1
    assert feed[0]['endpoint'] == '/api/v1/orders/'
    assert feed[0]['statusCode'] == 201

