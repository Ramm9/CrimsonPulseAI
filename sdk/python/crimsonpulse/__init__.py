"""
CrimsonPulse Python SDK
=======================
AI-Powered API Intelligence & Incident Management Platform.
"""

from typing import Optional
from crimsonpulse.config import CrimsonPulseConfig
from crimsonpulse.client import CrimsonPulseClient
from crimsonpulse.middleware import (
    CrimsonPulseMiddleware,
    PulseMonitoringMiddleware,
    get_middleware_client,
    set_middleware_client,
)
from crimsonpulse.exceptions import CrimsonPulseException, ConfigurationError

__version__ = "1.0.0"

_global_client: Optional[CrimsonPulseClient] = None

def init(
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    environment: str = 'production',
    app_version: str = '1.0.0',
    capture_headers: bool = False,
    capture_query: bool = True,
    batch_size: int = 20,
    flush_interval: float = 2.0,
    **kwargs,
) -> CrimsonPulseClient:
    """
    Initializes the global CrimsonPulse SDK client.
    """
    global _global_client
    config = CrimsonPulseConfig(
        api_key=api_key or '',
        api_url=api_url or 'http://localhost:8000/api/v1/ingest/events/',
        environment=environment,
        app_version=app_version,
        capture_headers=capture_headers,
        capture_query=capture_query,
        batch_size=batch_size,
        flush_interval=flush_interval,
        **kwargs,
    )
    _global_client = CrimsonPulseClient(config)
    set_middleware_client(_global_client)
    return _global_client

def get_client() -> CrimsonPulseClient:
    """Returns the active global CrimsonPulse client or instantiates one from environment."""
    global _global_client
    if _global_client is None:
        _global_client = get_middleware_client()
    return _global_client

__all__ = [
    "CrimsonPulseConfig",
    "CrimsonPulseClient",
    "CrimsonPulseMiddleware",
    "PulseMonitoringMiddleware",
    "CrimsonPulseException",
    "ConfigurationError",
    "init",
    "get_client",
    "__version__",
]

