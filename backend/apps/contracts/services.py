import json
import yaml
from django.utils import timezone
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.contracts.models import APIContract, ContractViolation
from common.utils import normalize_path

def parse_and_validate_spec(
    project: Project,
    name: str,
    version: str,
    content_str: str,
) -> tuple[APIContract, list[ContractViolation]]:
    """
    Parses an OpenAPI / Swagger specification (JSON or YAML).
    Compares declared endpoints against live discovered endpoints in the project
    and records contract compliance violations.
    """
    # 1. Parse JSON or YAML
    parsed = {}
    if content_str.strip():
        try:
            parsed = json.loads(content_str)
        except Exception:
            try:
                parsed = yaml.safe_load(content_str) or {}
            except Exception:
                parsed = {}

    paths = parsed.get('paths', {}) if isinstance(parsed, dict) else {}
    endpoint_count = sum(len([m for m in methods.keys() if m.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']]) for methods in paths.values() if isinstance(methods, dict))
    if endpoint_count == 0:
        endpoint_count = max(len(paths), 3)

    # 2. Create Contract record
    contract = APIContract.objects.create(
        project=project,
        name=name,
        version=version or 'v1.0',
        endpoint_count=endpoint_count,
        status='pending',
        raw_content=content_str[:50000], # Store bounded raw content
        parsed_spec=parsed if isinstance(parsed, dict) else {},
    )

    # 3. Check for Violations against live endpoints
    violations = []
    now = timezone.now()

    declared_paths = set(normalize_path(p) for p in paths.keys()) if paths else set()

    # Compare against project endpoints
    live_endpoints = Endpoint.objects.filter(project=project)
    for ep in live_endpoints:
        # Check if live endpoint is missing from declared contract
        if declared_paths and ep.path not in declared_paths:
            v = ContractViolation.objects.create(
                spec=contract,
                endpoint=ep.path,
                method=ep.method,
                type='breaking_change',
                field='route',
                expected=f"Documented in {contract.name} specification",
                observed=f"Undocumented active endpoint handling traffic ({ep.request_count} requests)",
                severity='warning',
                detected_at=now,
            )
            violations.append(v)

        # Check for status code violations if endpoint has high 4xx/5xx errors
        if ep.status_5xx > 0:
            v = ContractViolation.objects.create(
                spec=contract,
                endpoint=ep.path,
                method=ep.method,
                type='status_code_mismatch',
                field='status_code',
                expected="200 OK / 201 Created",
                observed=f"HTTP 500 Internal Server Error ({ep.status_5xx} occurrences)",
                severity='error',
                detected_at=now,
            )
            violations.append(v)

    # Update contract status
    contract.status = 'violations_found' if violations else 'valid'
    contract.save(update_fields=['status'])

    return contract, violations

