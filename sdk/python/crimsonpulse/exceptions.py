"""Custom exceptions for CrimsonPulse Python SDK."""

class CrimsonPulseException(Exception):
    """Base exception for all CrimsonPulse errors."""
    pass

class ConfigurationError(CrimsonPulseException):
    """Raised when SDK configuration is invalid or missing required credentials."""
    pass

