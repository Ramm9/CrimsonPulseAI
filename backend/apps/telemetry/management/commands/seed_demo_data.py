from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.anomalies.models import Anomaly
from apps.incidents.models import Incident, IncidentComment, IncidentTimelineEvent
from apps.contracts.models import APIContract, ContractViolation
from apps.ai_assistant.models import (
    Investigation,
    InvestigationMessage,
    EvidenceCard,
    DebugChecklistItem,
)
from common.utils import hash_api_key

class Command(BaseCommand):
    help = 'Seeds database with realistic demo projects, endpoints, telemetry, anomalies, and incidents.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting CrimsonPulse demo data seeding...'))

        # 1. Create or get Demo User
        user, created = User.objects.get_or_create(
            email='alex.rivera@crimsonpulse.io',
            defaults={
                'name': 'Alex Rivera',
                'role': 'owner',
            },
        )
        if created or not user.check_password('Password123!'):
            user.set_password('Password123!')
            user.save()
        self.stdout.write(self.style.SUCCESS(f"User: {user.email} (Password123!)"))

        # 2. Create Organization
        org, _ = Organization.objects.get_or_create(
            name='CrimsonPulse Labs',
            defaults={'created_by': user, 'slug': 'crimsonpulse-labs'},
        )
        OrganizationMembership.objects.get_or_create(
            organization=org,
            user=user,
            defaults={'role': 'owner'},
        )

        # 3. Create Projects
        projects_data = [
            {
                'id': 'proj_nexus',
                'name': 'Nexus Core API',
                'description': 'Primary e-commerce and checkout orchestrator',
                'environment': 'production',
                'base_url': 'https://api.nexus.internal',
                'health': 'degraded',
                'key_raw': 'cpk_live_nxc_7e914028bc941a87',
                'key_masked': 'cpk_live_nxc_****7e91',
            },
            {
                'id': 'proj_payments',
                'name': 'Payments Gateway',
                'description': 'PCI-DSS compliant transaction processing gateway',
                'environment': 'production',
                'base_url': 'https://pay.nexus.internal',
                'health': 'healthy',
                'key_raw': 'cpk_live_pas_b4d81923ac719e02',
                'key_masked': 'cpk_live_pas_****b4d8',
            },
            {
                'id': 'proj_dispatch',
                'name': 'Dispatch Service',
                'description': 'Fulfillment routing and tracking webhook dispatcher',
                'environment': 'staging',
                'base_url': 'https://dispatch.nexus.internal',
                'health': 'healthy',
                'key_raw': 'cpk_stg_dsp_c2a18840fe1128c9',
                'key_masked': 'cpk_stg_dsp_****c2a1',
            },
        ]

        created_projects = {}
        for p_info in projects_data:
            proj, _ = Project.objects.get_or_create(
                id=p_info['id'],
                defaults={
                    'organization': org,
                    'name': p_info['name'],
                    'slug': p_info['id'].replace('proj_', ''),
                    'description': p_info['description'],
                    'environment': p_info['environment'],
                    'base_url': p_info['base_url'],
                    'health': p_info['health'],
                },
            )
            created_projects[p_info['id']] = proj

            # Seed API Key
            ProjectAPIKey.objects.get_or_create(
                project=proj,
                name='Default API Key',
                defaults={
                    'key_prefix': 'cpk_live' if proj.environment == 'production' else 'cpk_stg',
                    'key_hash': hash_api_key(p_info['key_raw']),
                    'masked_key': p_info['key_masked'],
                    'status': 'active',
                },
            )

        nexus_proj = created_projects['proj_nexus']

        # 4. Create Endpoints
        endpoints_data = [
            {
                'id': 'ep_orders_create',
                'method': 'POST',
                'path': '/api/v1/orders/',
                'request_count': 1240,
                'avg_latency': 320.0,
                'p50_latency': 180.0,
                'p95_latency': 1850.0,
                'p99_latency': 2400.0,
                'error_rate': 8.5,
                'health': 'degraded',
                'status_2xx': 1134,
                'status_4xx': 42,
                'status_5xx': 64,
            },
            {
                'id': 'ep_products_list',
                'method': 'GET',
                'path': '/api/v1/products/',
                'request_count': 4800,
                'avg_latency': 45.0,
                'p50_latency': 35.0,
                'p95_latency': 85.0,
                'p99_latency': 120.0,
                'error_rate': 0.1,
                'health': 'healthy',
                'status_2xx': 4795,
                'status_4xx': 5,
                'status_5xx': 0,
            },
            {
                'id': 'ep_users_detail',
                'method': 'GET',
                'path': '/api/v1/users/{id}/',
                'request_count': 2100,
                'avg_latency': 32.0,
                'p50_latency': 28.0,
                'p95_latency': 60.0,
                'p99_latency': 95.0,
                'error_rate': 0.4,
                'health': 'healthy',
                'status_2xx': 2091,
                'status_4xx': 9,
                'status_5xx': 0,
            },
        ]

        created_endpoints = {}
        for ep_info in endpoints_data:
            ep, _ = Endpoint.objects.get_or_create(
                id=ep_info['id'],
                defaults={
                    'project': nexus_proj,
                    'method': ep_info['method'],
                    'path': ep_info['path'],
                    'request_count': ep_info['request_count'],
                    'avg_latency': ep_info['avg_latency'],
                    'p50_latency': ep_info['p50_latency'],
                    'p95_latency': ep_info['p95_latency'],
                    'p99_latency': ep_info['p99_latency'],
                    'error_rate': ep_info['error_rate'],
                    'health': ep_info['health'],
                    'status_2xx': ep_info['status_2xx'],
                    'status_4xx': ep_info['status_4xx'],
                    'status_5xx': ep_info['status_5xx'],
                    'last_activity': timezone.now(),
                },
            )
            created_endpoints[ep_info['id']] = ep

        # 5. Create Telemetry Events across 24 hours
        now = timezone.now()
        events_to_create = []
        for i in range(48):
            ts = now - timedelta(minutes=i * 30)
            events_to_create.append(TelemetryEvent(
                project=nexus_proj,
                endpoint=created_endpoints['ep_orders_create'],
                raw_path=f"/api/v1/orders/{1000 + i}/",
                normalized_path="/api/v1/orders/{id}/",
                method='POST',
                status_code=500 if (i % 8 == 0) else 200,
                response_time_ms=1850.0 if (i % 6 == 0) else 145.0,
                environment='production',
                app_version='2.4.1',
                error_message="HTTP 500: Database connection pool exhausted" if (i % 8 == 0) else "",
                timestamp=ts,
            ))
            events_to_create.append(TelemetryEvent(
                project=nexus_proj,
                endpoint=created_endpoints['ep_products_list'],
                raw_path="/api/v1/products/",
                normalized_path="/api/v1/products/",
                method='GET',
                status_code=200,
                response_time_ms=42.0,
                environment='production',
                app_version='2.4.1',
                timestamp=ts,
            ))
        TelemetryEvent.objects.bulk_create(events_to_create)

        # 6. Create Incident
        incident, _ = Incident.objects.get_or_create(
            id='inc_orders_latency',
            defaults={
                'project': nexus_proj,
                'endpoint': created_endpoints['ep_orders_create'],
                'title': 'Orders Latency Spike',
                'description': 'Observed P95 latency surge to 1850ms accompanied by intermittent 500 errors',
                'severity': 'critical',
                'status': 'open',
                'method': 'POST',
                'endpoint_path': '/api/v1/orders/',
                'occurrence_count': 64,
                'first_detected': now - timedelta(hours=3),
                'last_occurred': now,
                'assignee': user,
                'ai_summary': 'Automated incident opened due to observed metric deviation on POST /api/v1/orders/.',
                'deployment_version': '2.4.1',
                'deployment_commit': 'a8f9c2d',
                'deployment_by': 'CI/CD Pipeline',
                'deployment_changelog': 'Refactor checkout order processing database queries',
            },
        )

        IncidentComment.objects.get_or_create(
            incident=incident,
            user=user,
            content='Observing connection pool starvation in Postgres. Investigating long transactions.',
        )

        IncidentTimelineEvent.objects.get_or_create(
            incident=incident,
            event_type='created',
            defaults={
                'description': 'Incident opened: Orders Latency Spike',
                'user': user,
                'timestamp': now - timedelta(hours=3),
            },
        )

        # 7. Create Anomaly
        Anomaly.objects.get_or_create(
            id='anom_orders_latency',
            defaults={
                'project': nexus_proj,
                'endpoint': created_endpoints['ep_orders_create'],
                'related_incident': incident,
                'severity': 'critical',
                'status': 'active',
                'metric': 'Latency (P95)',
                'baseline_value': 180.0,
                'observed_value': 1850.0,
                'anomaly_score': 0.89,
                'model_version': 'cp-rule-detector-v1.0',
                'description': 'P95 latency of 1850ms is 10.2x above expected baseline (180ms).',
                'detected_at': now - timedelta(hours=3),
            },
        )

        # 8. Create Contract Spec & Violations
        spec, _ = APIContract.objects.get_or_create(
            id='spec_nexus_core',
            defaults={
                'project': nexus_proj,
                'name': 'Nexus Core OpenAPI Spec',
                'version': '1.4.0',
                'endpoint_count': 18,
                'status': 'violations_found',
            },
        )

        ContractViolation.objects.get_or_create(
            spec=spec,
            endpoint='/api/v1/orders/',
            method='POST',
            type='status_code_mismatch',
            defaults={
                'field': 'status_code',
                'expected': '201 Created / 400 Bad Request',
                'observed': '500 Internal Server Error (64 occurrences)',
                'severity': 'error',
                'detected_at': now - timedelta(hours=2),
            },
        )

        # 9. Create AI Investigation
        inv, _ = Investigation.objects.get_or_create(
            incident=incident,
            defaults={
                'suggested_actions': [
                    'Review recent deployment 2.4.1 (commit a8f9c2d)',
                    'Inspect connection pool saturation in PostgreSQL',
                    'Evaluate upstream gateway timeouts on POST /api/v1/orders/',
                ],
            },
        )

        EvidenceCard.objects.get_or_create(
            investigation=inv,
            title='Telemetry Latency Spike',
            defaults={
                'card_type': 'metric',
                'content': 'Observed P95 latency of 1850ms with 8.5% error rate across 64 occurrences.',
                'source': 'Telemetry Pipeline (Observed Data)',
                'verified': True,
                'severity': 'critical',
                'data': {'p95Latency': 1850, 'errorRate': 8.5, 'baseline': 180},
            },
        )

        EvidenceCard.objects.get_or_create(
            investigation=inv,
            title='Deployment Correlation (2.4.1)',
            defaults={
                'card_type': 'deployment',
                'content': 'Release 2.4.1 deployed 3 hours ago by CI/CD Pipeline. Commit: a8f9c2d.',
                'source': 'CI/CD Deployment Feed',
                'verified': True,
                'severity': 'info',
                'data': {'commit': 'a8f9c2d', 'version': '2.4.1'},
            },
        )

        DebugChecklistItem.objects.get_or_create(
            investigation=inv,
            label='Verify PostgreSQL connection pool limits and slow query logs',
            defaults={'completed': False, 'priority': 'high'},
        )
        DebugChecklistItem.objects.get_or_create(
            investigation=inv,
            label='Review commit a8f9c2d diff for unindexed joins or locking queries',
            defaults={'completed': False, 'priority': 'high'},
        )

        InvestigationMessage.objects.get_or_create(
            investigation=inv,
            role='assistant',
            defaults={
                'content': (
                    "### Investigation Summary for Incident: Orders Latency Spike\n\n"
                    "**Observed Facts (Verified):**\n"
                    "- Target endpoint: `POST /api/v1/orders/`\n"
                    "- Observed P95 Latency: `1850ms` (10.2x above baseline)\n"
                    "- Observed Error Rate: `8.5%` across `64` recorded 500 errors\n"
                    "- Recent Deployment: `2.4.1` (Commit `a8f9c2d`)\n\n"
                    "**Working Hypotheses (Under Investigation):**\n"
                    "1. Connection pool saturation caused by long-running transactions introduced in commit `a8f9c2d`.\n"
                    "2. Database query lock contention during order checkout.\n\n"
                    "Review the evidence cards and checklist to proceed with remediation."
                ),
                'timestamp': now - timedelta(hours=3),
            },
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded complete CrimsonPulse demo environment!'))

