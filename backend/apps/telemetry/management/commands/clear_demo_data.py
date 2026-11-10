import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

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


class Command(BaseCommand):
    help = (
        'Safely purges seeded demo and verification test data from Neon PostgreSQL '
        'using atomic transactions, leaving table structures and real user data intact.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate cleanup and print exact record counts by model without modifying database.',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Explicit confirmation required to execute actual atomic deletion.',
        )
        parser.add_argument(
            '--preserve-users',
            action='store_true',
            help='Clear all telemetry, projects, and incidents but keep user accounts.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        confirm = options.get('confirm', False)
        preserve_users = options.get('preserve_users', False)

        if not dry_run and not confirm:
            self.stdout.write(self.style.ERROR(
                'Safety gate active: clear_demo_data requires either --dry-run or --confirm.\n'
                'Usage:\n'
                '  python manage.py clear_demo_data --dry-run\n'
                '  python manage.py clear_demo_data --confirm\n'
                '  python manage.py clear_demo_data --confirm --preserve-users'
            ))
            sys.exit(1)

        self.stdout.write(self.style.NOTICE(
            f"=== CrimsonPulse AI — Demo Data Cleanup Audit [{'DRY RUN' if dry_run else 'LIVE PURGE'}] ==="
        ))

        # Identify target records
        demo_emails = [
            'alex.rivera@crimsonpulse.io',
            'neon.verification@crimsonpulse.ai',
        ]
        demo_org_slugs = [
            'crimsonpulse-labs',
            'neon-verification-org',
        ]
        demo_project_ids = [
            'proj_nexus',
            'proj_payments',
            'proj_dispatch',
            'proj_fa045aeafdd3',
            'proj_26c1adf5a8ce',
        ]

        target_users = User.objects.filter(
            Q(email__in=demo_emails) |
            Q(email__endswith='@crimsonpulse.io') |
            Q(email__endswith='@crimsonpulse.ai')
        )
        target_orgs = Organization.objects.filter(
            Q(slug__in=demo_org_slugs) |
            Q(created_by__in=target_users)
        )
        target_projects = Project.objects.filter(
            Q(id__in=demo_project_ids) |
            Q(organization__in=target_orgs) |
            Q(name__icontains='Neon Live Telemetry') |
            Q(name__icontains='Test Project')
        )

        target_endpoints = Endpoint.objects.filter(project__in=target_projects)
        target_telemetry = TelemetryEvent.objects.filter(project__in=target_projects)
        target_anomalies = Anomaly.objects.filter(project__in=target_projects)
        target_incidents = Incident.objects.filter(project__in=target_projects)
        target_contracts = APIContract.objects.filter(project__in=target_projects)
        target_keys = ProjectAPIKey.objects.filter(project__in=target_projects)

        target_comments = IncidentComment.objects.filter(incident__in=target_incidents)
        target_timelines = IncidentTimelineEvent.objects.filter(incident__in=target_incidents)
        target_violations = ContractViolation.objects.filter(spec__in=target_contracts)

        target_investigations = Investigation.objects.filter(incident__in=target_incidents)
        target_inv_messages = InvestigationMessage.objects.filter(investigation__in=target_investigations)
        target_evidence = EvidenceCard.objects.filter(investigation__in=target_investigations)
        target_checklists = DebugChecklistItem.objects.filter(investigation__in=target_investigations)
        target_memberships = OrganizationMembership.objects.filter(organization__in=target_orgs)

        # Tabulate counts
        audit_plan = [
            ('TelemetryEvent', target_telemetry.count()),
            ('Endpoint', target_endpoints.count()),
            ('Anomaly', target_anomalies.count()),
            ('Incident', target_incidents.count()),
            ('IncidentComment', target_comments.count()),
            ('IncidentTimelineEvent', target_timelines.count()),
            ('Investigation', target_investigations.count()),
            ('InvestigationMessage', target_inv_messages.count()),
            ('EvidenceCard', target_evidence.count()),
            ('DebugChecklistItem', target_checklists.count()),
            ('APIContract', target_contracts.count()),
            ('ContractViolation', target_violations.count()),
            ('ProjectAPIKey', target_keys.count()),
            ('Project', target_projects.count()),
            ('OrganizationMembership', target_memberships.count()),
            ('Organization', target_orgs.count()),
        ]

        if not preserve_users:
            audit_plan.append(('User', target_users.count()))

        total_records = sum(count for _, count in audit_plan)

        self.stdout.write(f"\nTarget Database: Neon Serverless PostgreSQL")
        self.stdout.write(f"{'Model':<30} {'Target Count':>12}")
        self.stdout.write('-' * 44)
        for model_name, count in audit_plan:
            self.stdout.write(f"{model_name:<30} {count:>12}")
        self.stdout.write('-' * 44)
        self.stdout.write(self.style.SUCCESS(f"{'Total Records to Delete':<30} {total_records:>12}\n"))

        if dry_run:
            self.stdout.write(self.style.NOTICE(
                '[DRY RUN COMPLETE] No records were modified or deleted from Neon PostgreSQL.\n'
                'To execute this cleanup atomically, re-run with --confirm.'
            ))
            return

        if confirm:
            if total_records == 0:
                self.stdout.write(self.style.WARNING('No demo records found to delete. Database is already clean.'))
                return

            self.stdout.write(self.style.NOTICE('Executing atomic purge in Neon PostgreSQL...'))
            with transaction.atomic():
                # Delete children first to ensure predictable cascade logging
                deleted_counts = {}

                c, _ = target_inv_messages.delete()
                deleted_counts['InvestigationMessage'] = c

                c, _ = target_evidence.delete()
                deleted_counts['EvidenceCard'] = c

                c, _ = target_checklists.delete()
                deleted_counts['DebugChecklistItem'] = c

                c, _ = target_investigations.delete()
                deleted_counts['Investigation'] = c

                c, _ = target_comments.delete()
                deleted_counts['IncidentComment'] = c

                c, _ = target_timelines.delete()
                deleted_counts['IncidentTimelineEvent'] = c

                c, _ = target_incidents.delete()
                deleted_counts['Incident'] = c

                c, _ = target_anomalies.delete()
                deleted_counts['Anomaly'] = c

                c, _ = target_violations.delete()
                deleted_counts['ContractViolation'] = c

                c, _ = target_contracts.delete()
                deleted_counts['APIContract'] = c

                c, _ = target_telemetry.delete()
                deleted_counts['TelemetryEvent'] = c

                c, _ = target_endpoints.delete()
                deleted_counts['Endpoint'] = c

                c, _ = target_keys.delete()
                deleted_counts['ProjectAPIKey'] = c

                c, _ = target_projects.delete()
                deleted_counts['Project'] = c

                c, _ = target_memberships.delete()
                deleted_counts['OrganizationMembership'] = c

                c, _ = target_orgs.delete()
                deleted_counts['Organization'] = c

                if not preserve_users:
                    c, _ = target_users.delete()
                    deleted_counts['User'] = c

            self.stdout.write(self.style.SUCCESS(
                f"[CLEANUP COMPLETE] Successfully purged {total_records} demo/test records from Neon PostgreSQL.\n"
                f"Database tables, migrations, constraints, and schemas remain 100% intact."
            ))
