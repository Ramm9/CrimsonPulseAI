import pytest
from rest_framework import status
from django.utils import timezone
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident
from apps.anomalies.services import evaluate_endpoint_anomalies

@pytest.fixture
def anomaly_incident_setup(db):
    user = User.objects.create_user(
        email='sre@nexus.internal',
        name='SRE Lead',
        password='Password123!',
        role='admin',
    )
    colleague = User.objects.create_user(
        email='colleague@nexus.internal',
        name='DevOps Engineer',
        password='Password123!',
        role='developer',
    )
    org = Organization.objects.create(name='SRE Org', created_by=user)
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')
    OrganizationMembership.objects.create(organization=org, user=colleague, role='developer')

    project = Project.objects.create(organization=org, name='Billing Service', base_url='https://billing.io')
    endpoint = Endpoint.objects.create(
        project=project,
        method='POST',
        path='/api/v1/charges/',
        request_count=20,
        avg_latency=150.0,
        p95_latency=1850.0, # High latency anomaly trigger
        error_rate=25.0,     # High error rate anomaly trigger
        health='critical',
        status_2xx=15,
        status_5xx=5,
    )

    return user, colleague, project, endpoint

@pytest.mark.django_db
class TestAnomaliesAndIncidents:
    def test_evaluate_endpoint_generates_anomalies_and_incident(self, anomaly_incident_setup):
        user, colleague, project, endpoint = anomaly_incident_setup

        anomalies = evaluate_endpoint_anomalies(endpoint)
        assert len(anomalies) >= 1

        # Check anomaly record properties
        anomaly = anomalies[0]
        assert anomaly.project == project
        assert anomaly.endpoint == endpoint
        assert anomaly.anomaly_score > 0.0
        assert anomaly.model_version == 'cp-rule-detector-v1.0'
        assert anomaly.status == 'active'

        # Check incident auto-generation
        assert anomaly.related_incident is not None
        incident = anomaly.related_incident
        assert incident.endpoint == endpoint
        assert incident.status == 'open'
        assert incident.timeline.count() >= 1

    def test_anomaly_status_lifecycle_and_stats(self, api_client, anomaly_incident_setup):
        user, colleague, project, endpoint = anomaly_incident_setup
        api_client.force_authenticate(user=user)

        # Create an anomaly directly
        anomaly = Anomaly.objects.create(
            project=project,
            endpoint=endpoint,
            severity='high',
            status='active',
            metric='Error Rate',
            baseline_value=0.5,
            observed_value=12.5,
            anomaly_score=0.82,
            model_version='cp-rule-detector-v1.0',
            description='Surge in 500 status codes',
            detected_at=timezone.now(),
        )

        # Fetch stats
        stats_res = api_client.get('/api/v1/anomalies/stats/')
        assert stats_res.status_code == status.HTTP_200_OK
        assert stats_res.data['total'] >= 1
        assert stats_res.data['active'] >= 1
        assert stats_res.data['avgScore'] == 0.82

        # Update status to acknowledged
        patch_res = api_client.patch(
            f'/api/v1/anomalies/{anomaly.id}/',
            data={'status': 'acknowledged'},
            format='json',
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data['status'] == 'acknowledged'
        anomaly.refresh_from_db()
        assert anomaly.status == 'acknowledged'

    def test_incident_status_comment_and_assignment(self, api_client, anomaly_incident_setup):
        user, colleague, project, endpoint = anomaly_incident_setup
        api_client.force_authenticate(user=user)

        incident = Incident.objects.create(
            project=project,
            endpoint=endpoint,
            title='Payment Gateway Failure',
            description='Recurring 503 errors from upstream processor',
            severity='critical',
            status='open',
            method='POST',
            endpoint_path='/api/v1/charges/',
        )

        # Update incident status to investigating
        status_res = api_client.patch(
            f'/api/v1/incidents/{incident.id}/',
            data={'status': 'investigating'},
            format='json',
        )
        assert status_res.status_code == status.HTTP_200_OK
        assert status_res.data['status'] == 'investigating'

        # Add comment
        comment_res = api_client.post(
            f'/api/v1/incidents/{incident.id}/comments/',
            data={'content': 'Investigating connection pool starvation in database.'},
            format='json',
        )
        assert comment_res.status_code == status.HTTP_200_OK
        assert len(comment_res.data['comments']) == 1
        assert comment_res.data['comments'][0]['content'] == 'Investigating connection pool starvation in database.'

        # Assign incident to colleague
        assign_res = api_client.post(
            f'/api/v1/incidents/{incident.id}/assign/',
            data={'userId': colleague.id},
            format='json',
        )
        assert assign_res.status_code == status.HTTP_200_OK
        assert assign_res.data['assignee']['id'] == colleague.id
        assert assign_res.data['assignee']['name'] == 'DevOps Engineer'

        # Verify timeline events
        incident.refresh_from_db()
        timeline_types = [t.event_type for t in incident.timeline.all()]
        assert 'status_change' in timeline_types
        assert 'comment' in timeline_types
        assert 'assignment' in timeline_types

