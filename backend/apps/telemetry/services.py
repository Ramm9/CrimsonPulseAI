import hashlib
import logging
from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction
from apps.projects.models import Project
from apps.endpoints.models import Endpoint
from apps.telemetry.models import TelemetryEvent
from apps.telemetry.sanitizer import (
    sanitize_headers,
    sanitize_query,
    sanitize_error_text,
)
from common.utils import normalize_path

logger = logging.getLogger(__name__)

def extract_or_generate_event_id(item: dict, project_id: str) -> str:
    """
    Extracts an explicit event ID / idempotency key, or derives a deterministic fingerprint.
    Guarantees idempotency on both client-supplied IDs and identical event payloads.
    """
    # 1. Explicit client ID / idempotency key
    for key in ('event_id', 'eventId', 'idempotency_key', 'idempotencyKey', 'id'):
        val = item.get(key)
        if val and isinstance(val, str) and val.strip():
            return val.strip()

    # 2. Deterministic fingerprint based on event payload
    raw_path = item.get('endpoint') or item.get('path') or '/'
    method = (item.get('method') or 'GET').upper()
    status_code = str(item.get('statusCode') or item.get('status_code') or 200)
    ts = str(item.get('timestamp') or '')
    resp_time = str(round(float(item.get('responseTime') or item.get('response_time_ms') or 0.0), 2))

    fingerprint = f"{project_id}:{method}:{raw_path}:{status_code}:{ts}:{resp_time}"
    return f"evt_{hashlib.sha256(fingerprint.encode('utf-8')).hexdigest()[:36]}"

def process_telemetry_batch(project: Project, raw_events: list[dict]) -> dict:
    """
    Ingests and validates a batch of telemetry events sent by the CrimsonPulse SDK.
    Performs:
      1. Server-side header and query parameter sanitization (strips Authorization, Cookie, tokens, API keys).
      2. Event idempotency checks using event_id and project uniqueness constraints.
      3. Dynamic route normalization and endpoint discovery.
      4. Safe counter and metrics updating ONLY for accepted, non-duplicate events.
      5. Rule-based anomaly evaluation on modified endpoints.
    Returns:
      {
        'accepted': int,
        'duplicates': int,
        'rejected': int,
        'ingested': int,
      }
    """
    if not raw_events or not isinstance(raw_events, list):
        return {'accepted': 0, 'duplicates': 0, 'rejected': 0, 'ingested': 0}

    now = timezone.now()
    telemetry_objects = []
    endpoint_updates = {} # cache_key -> endpoint_obj

    accepted_count = 0
    duplicate_count = 0
    rejected_count = 0

    # 1. Pre-extract event IDs and query existing records in DB for this project
    valid_items = []
    batch_event_ids = []
    for item in raw_events:
        if not isinstance(item, dict):
            rejected_count += 1
            continue

        raw_path = item.get('endpoint') or item.get('path')
        if not raw_path or not isinstance(raw_path, str):
            rejected_count += 1
            continue

        evt_id = extract_or_generate_event_id(item, project.id)
        valid_items.append((evt_id, item))
        batch_event_ids.append(evt_id)

    # Fetch existing IDs in database to prevent duplicates
    existing_event_ids = set()
    if batch_event_ids:
        existing_event_ids = set(
            TelemetryEvent.objects.filter(
                project=project,
                event_id__in=batch_event_ids,
            ).values_list('event_id', flat=True)
        )

    # 2. Process valid items with deduplication and sanitization
    seen_in_batch = set()

    for evt_id, item in valid_items:
        # Check idempotency: if already in DB or seen earlier in this batch -> skip
        if evt_id in existing_event_ids or evt_id in seen_in_batch:
            duplicate_count += 1
            continue

        seen_in_batch.add(evt_id)

        try:
            raw_path = item.get('endpoint') or item.get('path') or '/'
            method = (item.get('method') or 'GET').upper()
            norm_path = normalize_path(raw_path)

            status_code = int(item.get('statusCode') or item.get('status_code') or 200)
            response_time = float(item.get('responseTime') or item.get('response_time_ms') or item.get('latency') or 0.0)

            # Timestamp parsing
            ts_val = item.get('timestamp')
            if ts_val:
                parsed_ts = parse_datetime(ts_val) if isinstance(ts_val, str) else ts_val
                event_timestamp = parsed_ts if parsed_ts else now
            else:
                event_timestamp = now

            # Sanitization of error strings
            raw_error = item.get('error') or item.get('errorMessage') or item.get('error_message') or ''
            raw_type = item.get('errorType') or item.get('error_type') or ''
            raw_stack = item.get('errorStack') or item.get('error_stack') or ''

            clean_error = sanitize_error_text(raw_error)
            clean_type = sanitize_error_text(raw_type)
            clean_stack = sanitize_error_text(raw_stack)

            # Sanitization of headers & query parameters
            raw_headers = item.get('request_headers') or item.get('requestHeaders') or {}
            clean_headers = sanitize_headers(raw_headers)

            raw_query = item.get('request_query') or item.get('requestQuery') or ''
            clean_query = sanitize_query(raw_query)

            # Environment & version
            env = item.get('environment') or project.environment
            app_ver = item.get('appVersion') or item.get('version') or ''

            # Endpoint discovery & caching
            cache_key = f"{method}:{norm_path}"
            if cache_key not in endpoint_updates:
                endpoint_obj, _ = Endpoint.objects.get_or_create(
                    project=project,
                    method=method,
                    path=norm_path,
                    defaults={
                        'health': 'healthy',
                        'last_activity': event_timestamp,
                    },
                )
                endpoint_updates[cache_key] = endpoint_obj
            else:
                endpoint_obj = endpoint_updates[cache_key]

            # Update endpoint counters ONLY for accepted, non-duplicate events
            endpoint_obj.request_count += 1
            if 200 <= status_code < 300:
                endpoint_obj.status_2xx += 1
            elif 300 <= status_code < 400:
                endpoint_obj.status_3xx += 1
            elif 400 <= status_code < 500:
                endpoint_obj.status_4xx += 1
            elif 500 <= status_code < 600:
                endpoint_obj.status_5xx += 1

            count = endpoint_obj.request_count
            endpoint_obj.avg_latency = round(((endpoint_obj.avg_latency * (count - 1)) + response_time) / count, 2)
            endpoint_obj.p50_latency = round(endpoint_obj.avg_latency * 0.85, 2)
            endpoint_obj.p95_latency = round(max(endpoint_obj.avg_latency * 1.6, response_time), 2)
            endpoint_obj.p99_latency = round(max(endpoint_obj.p95_latency * 1.3, response_time), 2)

            total_err = endpoint_obj.status_4xx + endpoint_obj.status_5xx
            endpoint_obj.error_rate = round((total_err / count) * 100, 2)

            # Transparent, explainable sample-aware health classification:
            # 1. Low-sample endpoints (< 5 requests) are classified as 'unknown' (Insufficient Data)
            #    to prevent ungrounded 'healthy' assumptions, unless repeated server crashes occur.
            # 2. Server (5xx) vs client (4xx) errors are separated into transparent, unweighted metrics.
            if count < 5:
                if endpoint_obj.status_5xx >= 2:
                    endpoint_obj.health = 'critical'
                else:
                    endpoint_obj.health = 'unknown'
            else:
                # Sustained traffic (>= 5 requests)
                if endpoint_obj.status_5xx >= 3 or (count > 0 and (endpoint_obj.status_5xx / count) >= 0.05):
                    endpoint_obj.health = 'critical'
                elif endpoint_obj.avg_latency > 2000:
                    endpoint_obj.health = 'critical'
                elif endpoint_obj.status_5xx > 0:
                    endpoint_obj.health = 'degraded'
                elif count > 0 and (endpoint_obj.status_4xx / count) >= 0.20:
                    endpoint_obj.health = 'degraded'
                elif endpoint_obj.avg_latency > 600:
                    endpoint_obj.health = 'degraded'
                else:
                    endpoint_obj.health = 'healthy'

            if not endpoint_obj.last_activity or event_timestamp > endpoint_obj.last_activity:
                endpoint_obj.last_activity = event_timestamp

            # Construct safe, sanitized TelemetryEvent
            tel_event = TelemetryEvent(
                project=project,
                endpoint=endpoint_obj,
                event_id=evt_id,
                raw_path=raw_path,
                normalized_path=norm_path,
                method=method,
                status_code=status_code,
                response_time_ms=response_time,
                environment=env,
                app_version=app_ver,
                error_message=clean_error,
                error_type=clean_type,
                error_stack=clean_stack,
                client_ip=item.get('client_ip') or item.get('ipAddress'),
                user_agent=item.get('user_agent') or item.get('userAgent') or '',
                request_headers=clean_headers,
                request_query=clean_query,
                timestamp=event_timestamp,
            )
            telemetry_objects.append(tel_event)
            accepted_count += 1

        except Exception as exc:
            logger.warning('Failed to process individual telemetry event: %s', exc)
            rejected_count += 1

    # 3. Persist batch atomically
    with transaction.atomic():
        if telemetry_objects:
            TelemetryEvent.objects.bulk_create(telemetry_objects, batch_size=500, ignore_conflicts=True)

        for ep in endpoint_updates.values():
            ep.save()

    # 4. Post-batch anomaly evaluation on modified endpoints
    from apps.anomalies.services import evaluate_endpoint_anomalies
    for ep in endpoint_updates.values():
        try:
            evaluate_endpoint_anomalies(ep)
        except Exception as exc:
            logger.warning('Post-batch anomaly evaluation error on endpoint %s: %s', ep.id, exc)

    return {
        'accepted': accepted_count,
        'duplicates': duplicate_count,
        'rejected': rejected_count,
        'ingested': accepted_count,
    }
