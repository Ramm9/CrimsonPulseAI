import pytest
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident
from apps.telemetry.tasks import aggregate_endpoint_metrics_task
from apps.anomalies.tasks import evaluate_endpoint_anomalies_task

@pytest.fixture
def background_setup(db):
    user = User.objects.create_user(
        email='worker.lead@crimsonpulse.ai',
        password='ValidPassword123!',
        name='Worker Lead',
    )
    org = Organization.objects.create(name='Worker Operations Org', slug='worker-ops-org')
    OrganizationMembership.objects.create(organization=org, user=user, role='owner')

    project = Project.objects.create(
        organization=org,
        name='Async Worker Service',
        environment='production',
    )
    endpoint = Endpoint.objects.create(
        project=project,
        path='/api/v1/checkout',
        method='POST',
        health='healthy',
        request_count=0,
    )

    now = timezone.now()
    # Populate 10 events: 8 successful (around 100ms) and 2 errors (500s around 1500ms)
    for i in range(8):
        TelemetryEvent.objects.create(
            project=project,
            endpoint=endpoint,
            event_id=f"evt_bg_succ_{i}",
            method='POST',
            raw_path='/api/v1/checkout',
            normalized_path='/api/v1/checkout/',
            status_code=200,
            response_time_ms=90.0 + (i * 5.0),
            timestamp=now - timedelta(minutes=5),
        )
    for i in range(2):
        TelemetryEvent.objects.create(
            project=project,
            endpoint=endpoint,
            event_id=f"evt_bg_err_{i}",
            method='POST',
            raw_path='/api/v1/checkout',
            normalized_path='/api/v1/checkout/',
            status_code=500,
            response_time_ms=1600.0,
            timestamp=now - timedelta(minutes=2),
        )

    return project, endpoint

@pytest.mark.django_db
class TestStage6BackgroundProcessing:
    """Tests for Celery asynchronous aggregation and anomaly detection tasks."""

    def test_aggregate_endpoint_metrics_task(self, background_setup):
        project, endpoint = background_setup

        # Run Celery task
        result = aggregate_endpoint_metrics_task(endpoint.id)

        assert result['status'] == 'success'
        assert result['request_count'] == 10
        assert result['error_rate'] == 20.0
        assert result['health'] == 'critical'  # >= 10% error rate triggers critical

        endpoint.refresh_from_db()
        assert endpoint.request_count == 10
        assert endpoint.error_rate == 20.0
        assert endpoint.status_5xx == 2
        assert endpoint.health == 'critical'
        assert endpoint.p95_latency >= 1500.0

    def test_evaluate_endpoint_anomalies_task_and_deduplication(self, background_setup):
        project, endpoint = background_setup

        # First run: Aggregate metrics
        aggregate_endpoint_metrics_task(endpoint.id)

        # Run anomaly evaluation task
        res1 = evaluate_endpoint_anomalies_task(endpoint.id)
        assert res1['status'] == 'success'
        assert res1['anomalies_created'] >= 1

        anom_count_1 = Anomaly.objects.filter(endpoint=endpoint).count()
        assert anom_count_1 >= 1

        # Incident was created/correlated
        incident = Incident.objects.filter(endpoint=endpoint).first()
        assert incident is not None
        assert incident.status == 'open'

        # Immediate rerun must NOT generate duplicate anomalies (idempotency check)
        res2 = evaluate_endpoint_anomalies_task(endpoint.id)
        assert res2['status'] == 'success'
        assert res2['anomalies_created'] == 0

        anom_count_2 = Anomaly.objects.filter(endpoint=endpoint).count()
        assert anom_count_2 == anom_count_1

    def test_task_skips_non_existent_endpoint(self, db):
        res = aggregate_endpoint_metrics_task('ep_non_existent_xyz')
        assert res['status'] == 'skipped'

        res_anom = evaluate_endpoint_anomalies_task('ep_non_existent_xyz')
        assert res_anom['status'] == 'skipped'

