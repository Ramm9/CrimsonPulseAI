from django.utils import timezone
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident, IncidentTimelineEvent

def evaluate_endpoint_anomalies(endpoint: Endpoint) -> list[Anomaly]:
    """
    Evaluates observed endpoint performance against baseline thresholds.
    Generates Anomaly records and correlates them with Incidents using deterministic rules.
    """
    anomalies_created = []
    now = timezone.now()

    # Rule 1: High Error Rate Surge
    if endpoint.request_count >= 5 and endpoint.error_rate >= 5.0:
        baseline_err = 0.4
        err_diff = endpoint.error_rate - baseline_err
        score = min(round(0.60 + (err_diff / 50.0) * 0.35, 2), 0.98)
        severity = 'critical' if endpoint.error_rate >= 20.0 else 'high' if endpoint.error_rate >= 10.0 else 'medium'

        # Check if an active anomaly already exists to avoid spamming duplicates
        recent = Anomaly.objects.filter(
            endpoint=endpoint,
            metric='Error Rate',
            status='active',
        ).first()

        if not recent:
            # Correlate or create incident
            incident = get_or_create_incident_for_endpoint(
                endpoint=endpoint,
                title=f"Error Rate Surge on {endpoint.method} {endpoint.path}",
                description=f"Error rate escalated to {endpoint.error_rate}% (baseline: {baseline_err}%).",
                severity=severity,
            )

            anomaly = Anomaly.objects.create(
                project=endpoint.project,
                endpoint=endpoint,
                related_incident=incident,
                severity=severity,
                metric='Error Rate',
                baseline_value=baseline_err,
                observed_value=endpoint.error_rate,
                anomaly_score=score,
                model_version='cp-rule-detector-v1.0',
                description=f"Observed error rate of {endpoint.error_rate}% exceeds baseline by {round(endpoint.error_rate / baseline_err, 1)}x.",
                detected_at=now,
            )
            anomalies_created.append(anomaly)

    # Rule 2: P95 Latency Spike
    baseline_lat = max(endpoint.avg_latency * 0.6, 120.0)
    if endpoint.request_count >= 5 and endpoint.p95_latency >= (baseline_lat * 2.2):
        lat_ratio = endpoint.p95_latency / baseline_lat
        score = min(round(0.65 + (lat_ratio / 10.0) * 0.30, 2), 0.99)
        severity = 'critical' if lat_ratio >= 4.0 else 'high' if lat_ratio >= 2.5 else 'medium'

        recent = Anomaly.objects.filter(
            endpoint=endpoint,
            metric='Latency (P95)',
            status='active',
        ).first()

        if not recent:
            incident = get_or_create_incident_for_endpoint(
                endpoint=endpoint,
                title=f"Latency Degradation on {endpoint.method} {endpoint.path}",
                description=f"P95 response time surged to {endpoint.p95_latency}ms (baseline: {round(baseline_lat, 1)}ms).",
                severity=severity,
            )

            anomaly = Anomaly.objects.create(
                project=endpoint.project,
                endpoint=endpoint,
                related_incident=incident,
                severity=severity,
                metric='Latency (P95)',
                baseline_value=round(baseline_lat, 1),
                observed_value=endpoint.p95_latency,
                anomaly_score=score,
                model_version='cp-rule-detector-v1.0',
                description=f"P95 latency of {endpoint.p95_latency}ms is {round(lat_ratio, 1)}x above expected baseline.",
                detected_at=now,
            )
            anomalies_created.append(anomaly)

    return anomalies_created

def get_or_create_incident_for_endpoint(
    endpoint: Endpoint,
    title: str,
    description: str,
    severity: str,
) -> Incident:
    """
    Finds an existing open incident for this endpoint or initializes a new one.
    """
    incident = Incident.objects.filter(
        endpoint=endpoint,
        status__in=['open', 'acknowledged', 'investigating'],
    ).first()

    now = timezone.now()
    if incident:
        incident.occurrence_count += 1
        incident.last_occurred = now
        incident.save(update_fields=['occurrence_count', 'last_occurred'])
        IncidentTimelineEvent.objects.create(
            incident=incident,
            event_type='anomaly_detected',
            description=f"Recurring anomaly detected: {title}",
            timestamp=now,
        )
    else:
        incident = Incident.objects.create(
            project=endpoint.project,
            endpoint=endpoint,
            title=title,
            description=description,
            severity=severity,
            status='open',
            method=endpoint.method,
            endpoint_path=endpoint.path,
            occurrence_count=1,
            first_detected=now,
            last_occurred=now,
            ai_summary=f"Automated incident opened due to observed metric deviation on {endpoint.method} {endpoint.path}.",
        )
        IncidentTimelineEvent.objects.create(
            incident=incident,
            event_type='created',
            description=f"Incident opened: {title}",
            timestamp=now,
        )

    return incident

