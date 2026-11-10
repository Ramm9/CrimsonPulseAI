import re
from typing import Dict, Any

# Standard sensitive headers that must be scrubbed client-side
SENSITIVE_HEADERS = {
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'x-refresh-token',
    'token',
    'secret',
    'password',
    'sessionid',
    'csrftoken',
}

SENSITIVE_PARAMS = {
    'password',
    'pass',
    'token',
    'secret',
    'api_key',
    'apikey',
    'key',
    'access_token',
    'refresh_token',
    'auth',
}

QUERY_PARAM_REGEX = re.compile(
    r'(?i)\b(' + '|'.join(SENSITIVE_PARAMS) + r')=([^&#\s]+)'
)

def scrub_headers(headers: Dict[str, Any]) -> Dict[str, str]:
    """
    Remove or redact sensitive header keys before dispatch.
    """
    if not headers or not isinstance(headers, dict):
        return {}

    scrubbed = {}
    for k, v in headers.items():
        k_str = str(k).strip()
        k_lower = k_str.lower()
        if any(sens in k_lower for sens in SENSITIVE_HEADERS):
            continue  # Do not include sensitive header in telemetry
        scrubbed[k_str] = str(v)
    return scrubbed

def scrub_query_string(query_string: str) -> str:
    """
    Redact values of sensitive query parameters from URL query string.
    """
    if not query_string:
        return ''
    return QUERY_PARAM_REGEX.sub(r'\1=[REDACTED]', query_string)

