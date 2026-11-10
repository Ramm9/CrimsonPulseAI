import pytest
from rest_framework import status
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident

@pytest.mark.django_db
class TestAuditE2EPipeline:
    """
    Real end-to-end integration test verifying the full lifecycle
    on an isolated database without any seeded demo data.
    """

    def test_full_pipeline_from_scratch(self, api_client):
        # 1. Register new user and organization
        reg_payload = {
            'name': 'Auditor Engineer',
            'email': 'auditor@pulse-audit.internal',
            'password': 'SecureAuditPassword123!',
            'organizationName': 'Audit Automated Labs',
        }
        reg_res = api_client.post('/api/v1/auth/register/', data=reg_payload, format='json')
        assert reg_res.status_code == status.HTTP_201_CREATED
        token = reg_res.data['token']
        user_id = reg_res.data['user']['id']
        org_id = reg_res.data['organization']['id']

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 2. Create new project
        proj_payload = {
            'name': 'Order Fulfillment API',
            'description': 'Handles parcel packing and dispatch',
            'environment': 'production',
            'baseUrl': 'https://fulfillment.pulse-audit.internal',
        }
        proj_res = api_client.post('/api/v1/projects/', data=proj_payload, format='json')
        assert proj_res.status_code == status.HTTP_201_CREATED
        project_id = proj_res.data['id']
        full_key = proj_res.data['fullKey']
        assert full_key.startswith('cpk_live_')

        # 3. Verify zero telemetry before ingestion
        traffic_before = api_client.get(f'/api/v1/projects/{project_id}/traffic/')
        assert traffic_before.status_code == status.HTTP_200_OK
        assert len(traffic_before.data) == 0

        # SDK status before ingestion: disconnected
        sdk_before = api_client.get(f'/api/v1/projects/{project_id}/sdk/status/')
        assert sdk_before.status_code == status.HTTP_200_OK
        assert sdk_before.data['status'] == 'disconnected'

        # 4. Ingest controlled telemetry batch via API Key authentication
        # Simulate 1 fast GET request and 5 failing slow POST requests
        api_client.credentials() # Remove JWT to test pure API key auth
        telemetry_batch = [
            {
                'endpoint': '/api/v1/parcels/81924/',
                'method': 'GET',
                'statusCode': 200,
                'responseTime': 45.0,
                'appVersion': '1.0.0',
            },
            {
                'endpoint': '/api/v1/dispatch/schedule/',
                'method': 'POST',
                'statusCode': 500,
                'responseTime': 2100.0,
                'error': 'Database lock timeout',
                'appVersion': '1.0.0',
            },
            {
                'endpoint': '/api/v1/dispatch/schedule/',
                'method': 'POST',
                'statusCode': 500,
                'responseTime': 2200.0,
                'error': 'Database lock timeout',
                'appVersion': '1.0.0',
            },
            {
                'endpoint': '/api/v1/dispatch/schedule/',
                'method': 'POST',
                'statusCode': 500,
                'responseTime': 2150.0,
                'error': 'Database lock timeout',
                'appVersion': '1.0.0',
            },
            {
                'endpoint': '/api/v1/dispatch/schedule/',
                'method': 'POST',
                'statusCode': 500,
                'responseTime': 2300.0,
                'error': 'Database lock timeout',
                'appVersion': '1.0.0',
            },
            {
                'endpoint': '/api/v1/dispatch/schedule/',
                'method': 'POST',
                'statusCode': 500,
                'responseTime': 2400.0,
                'error': 'Database lock timeout',
                'appVersion': '1.0.0',
            },
        ]

        ingest_res = api_client.post(
            '/api/v1/ingest/events/',
            data=telemetry_batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert ingest_res.status_code == status.HTTP_202_ACCEPTED
        assert ingest_res.data['ingested'] == 6

        # 5. Verify database records
        assert TelemetryEvent.objects.filter(project__id=project_id).count() == 6

        # 6. Verify Endpoint Discovery & Normalization
        # /api/v1/parcels/81924/ normalized to /api/v1/parcels/{id}/
        parcel_ep = Endpoint.objects.get(project__id=project_id, path='/api/v1/parcels/{id}/')
        assert parcel_ep.request_count == 1
        assert parcel_ep.status_2xx == 1

        dispatch_ep = Endpoint.objects.get(project__id=project_id, path='/api/v1/dispatch/schedule/')
        assert dispatch_ep.request_count == 5
        assert dispatch_ep.status_5xx == 5
        assert dispatch_ep.error_rate == 100.0
        assert dispatch_ep.avg_latency > 2000.0

        # 7. Verify Dashboard Metrics reflect the new events
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        dash_res = api_client.get(f'/api/v1/dashboard/?projectId={project_id}')
        assert dash_res.status_code == status.HTTP_200_OK
        assert dash_res.data['totalRequests'] == 6
        assert dash_res.data['totalEndpoints'] == 2
        assert dash_res.data['errorRate'] > 80.0 # 5 of 6 are errors

        # 8. Verify Live Traffic feed
        traffic_res = api_client.get(f'/api/v1/projects/{project_id}/traffic/')
        assert traffic_res.status_code == status.HTTP_200_OK
        assert len(traffic_res.data) == 6

        # 9. Verify SDK connection status is now connected
        sdk_after = api_client.get(f'/api/v1/projects/{project_id}/sdk/status/')
        assert sdk_after.status_code == status.HTTP_200_OK
        assert sdk_after.data['connected'] is True
        assert sdk_after.data['status'] == 'connected'

        # 10. Verify Anomaly Engine response
        anomalies = Anomaly.objects.filter(project__id=project_id)
        assert anomalies.count() >= 1
        anomaly = anomalies.first()
        assert anomaly.anomaly_score > 0.0
        assert anomaly.model_version == 'cp-rule-detector-v1.0'

        # 11. Verify Related Incident auto-generated
        assert anomaly.related_incident is not None
        incident = anomaly.related_incident
        assert incident.status == 'open'
        assert incident.timeline.count() >= 1

        # 12. Verify AI Investigator evidence retrieval
        ai_res = api_client.get(f'/api/v1/ai/investigations/{incident.id}/')
        assert ai_res.status_code == status.HTTP_200_OK
        ai_data = ai_res.data
        assert ai_data['incidentId'] == incident.id
        assert len(ai_data['evidenceCards']) >= 2
        metric_card = next(c for c in ai_data['evidenceCards'] if c['type'] == 'metric')
        assert metric_card['verified'] is True
        assert 'Telemetry' in metric_card['source']

        # 13. Security: Test cross-organization isolation
        competitor = User.objects.create_user(
            email='competitor@other.com',
            name='Competitor',
            password='Password123!',
        )
        api_client.force_authenticate(user=competitor)

        # Competitor cannot view the project
        proj_forbidden = api_client.get(f'/api/v1/projects/{project_id}/')
        assert proj_forbidden.status_code == status.HTTP_404_NOT_FOUND

        # Competitor cannot view incidents
        inc_forbidden = api_client.get(f'/api/v1/incidents/{incident.id}/')
        assert inc_forbidden.status_code == status.HTTP_404_NOT_FOUND

        # Competitor cannot view investigations
        ai_forbidden = api_client.get(f'/api/v1/ai/investigations/{incident.id}/')
        assert ai_forbidden.status_code == status.HTTP_404_NOT_FOUND

    def test_revoked_key_rejected(self, api_client):
        # Create user, project, key
        user = User.objects.create_user(email='testrev@org.com', name='TestRev', password='Password123!')
        org = Organization.objects.create(name='Rev Org', created_by=user)
        OrganizationMembership.objects.create(organization=org, user=user, role='owner')
        project = Project.objects.create(organization=org, name='Rev Proj', base_url='https://rev.com')

        from apps.projects.services import generate_project_key, revoke_project_key
        key_obj, full_key = generate_project_key(project, 'Temp Key')

        # Revoke the key
        revoke_project_key(project, key_obj.id)

        # Ingest with revoked key should be rejected
        res = api_client.post(
            '/api/v1/ingest/events/',
            data=[{'endpoint': '/api/v1/ping/', 'method': 'GET', 'statusCode': 200}],
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_duplicate_telemetry_batch_behavior(self, api_client):
        """
        Tests current behavior when identical telemetry batches are ingested consecutively.
        Documents whether backend deduplicates or creates duplicates.
        """
        user = User.objects.create_user(email='dup@org.com', name='DupUser', password='Password123!')
        org = Organization.objects.create(name='Dup Org', created_by=user)
        OrganizationMembership.objects.create(organization=org, user=user, role='owner')
        project = Project.objects.create(organization=org, name='Dup Proj', base_url='https://dup.com')

        from apps.projects.services import generate_project_key
        key_obj, full_key = generate_project_key(project, 'Dup Key')

        identical_batch = [
            {'endpoint': '/api/v1/item/1/', 'method': 'GET', 'statusCode': 200, 'responseTime': 50.0}
        ]

        # First ingestion
        res1 = api_client.post(
            '/api/v1/ingest/events/',
            data=identical_batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res1.status_code == status.HTTP_202_ACCEPTED
        assert TelemetryEvent.objects.filter(project=project).count() == 1

        # Second ingestion with exact same payload
        res2 = api_client.post(
            '/api/v1/ingest/events/',
            data=identical_batch,
            format='json',
            HTTP_X_CRIMSONPULSE_KEY=full_key,
        )
        assert res2.status_code == status.HTTP_202_ACCEPTED
        assert res2.data['accepted'] == 0
        assert res2.data['duplicates'] == 1

        # Count in DB remains 1 due to idempotency
        count_after = TelemetryEvent.objects.filter(project=project).count()
        assert count_after == 1, "Idempotency ensures count remains 1"

