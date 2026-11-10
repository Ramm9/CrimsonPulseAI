import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Exact lowercase header names that must NEVER be persisted
SENSITIVE_HEADER_NAMES = {
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'x-refresh-token',
    'x-crimsonpulse-key',
    'api-key',
    'apikey',
    'secret',
    'password',
    'token',
    'x-xsrf-token',
    'x-csrf-token',
}

# Substring patterns in header names that indicate sensitivity
SENSITIVE_NAME_SUBSTRINGS = (
    'token',
    'secret',
    'password',
    'auth',
    'cookie',
    'apikey',
    'api-key',
    'api_key',
    'private',
    'credential',
)

# Regex patterns for redacting sensitive values in query strings
SENSITIVE_QUERY_REGEX = re.compile(
    r'(?i)(token|access_token|refresh_token|api[_-]?key|secret|password|passwd|auth|bearer|credential|client[_-]?secret)=([^&]+)'
)

# Regex for masking API keys in free-text errors or traces
API_KEY_REGEX = re.compile(r'cpk_(live|stg)_[a-zA-Z0-9]{20,}')
BEARER_REGEX = re.compile(r'(?i)bearer\s+[a-zA-Z0-9._~+/-]+=*')

def is_sensitive_header(header_name: str) -> bool:
    """Checks if a header name indicates sensitive credentials or tokens."""
    if not header_name:
        return False
    normalized = header_name.strip().lower()
    if normalized in SENSITIVE_HEADER_NAMES:
        return True
    return any(sub in normalized for sub in SENSITIVE_NAME_SUBSTRINGS)

def sanitize_headers(raw_headers: Any) -> dict:
    """
    Sanitizes request headers before persistence.
    Strips Authorization, Cookies, API keys, access/refresh tokens, and sensitive credentials.
    Returns a clean dictionary safe for storage in cp_telemetry_events.
    """
    if not isinstance(raw_headers, dict):
        return {}

    sanitized = {}
    for key, val in raw_headers.items():
        if not isinstance(key, str):
            continue
        # Drop sensitive headers completely
        if is_sensitive_header(key):
            continue

        # For safe headers, also check string values for bearer or API key patterns
        if isinstance(val, str):
            cleaned_val = API_KEY_REGEX.sub(r'cpk_\1_****[REDACTED]', val)
            cleaned_val = BEARER_REGEX.sub('Bearer [REDACTED]', cleaned_val)
            sanitized[key] = cleaned_val
        elif isinstance(val, (int, float, bool)):
            sanitized[key] = val
        elif isinstance(val, (dict, list)):
            sanitized[key] = str(val)[:200] # Bounded representation

    return sanitized

def sanitize_query(query_string: str | None) -> str:
    """
    Redacts sensitive parameter values in query strings.
    Example: ?user=alex&token=secret123 -> ?user=alex&token=[REDACTED]
    """
    if not query_string:
        return ''
    return SENSITIVE_QUERY_REGEX.sub(r'\1=[REDACTED]', str(query_string))

def sanitize_error_text(text: str | None) -> str:
    """
    Masks raw API keys, bearer tokens, or password strings accidentally dumped in error messages or stacks.
    """
    if not text:
        return ''
    cleaned = API_KEY_REGEX.sub(r'cpk_\1_****[REDACTED]', str(text))
    cleaned = BEARER_REGEX.sub('Bearer [REDACTED]', cleaned)
    return cleaned

def redact_historical_telemetry() -> int:
    """
    Audit and redaction routine that inspects all existing TelemetryEvent rows
    and sanitizes any previously stored sensitive headers or query strings.
    Returns the count of redacted records.
    """
    from apps.telemetry.models import TelemetryEvent

    updated_count = 0
    # Process in chunks to avoid memory pressure
    events = TelemetryEvent.objects.all()
    for event in events.iterator(chunk_size=500):
        needs_update = False
        original_headers = event.request_headers or {}
        cleaned_headers = sanitize_headers(original_headers)
        if original_headers != cleaned_headers:
            event.request_headers = cleaned_headers
            needs_update = True

        original_query = event.request_query or ''
        cleaned_query = sanitize_query(original_query)
        if original_query != cleaned_query:
            event.request_query = cleaned_query
            needs_update = True

        original_error = event.error_message or ''
        cleaned_error = sanitize_error_text(original_error)
        if original_error != cleaned_error:
            event.error_message = cleaned_error
            needs_update = True

        if needs_update:
            event.save(update_fields=['request_headers', 'request_query', 'error_message'])
            updated_count += 1

    return updated_count

