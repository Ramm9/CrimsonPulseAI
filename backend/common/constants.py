# Role Constants
ROLE_OWNER = 'owner'
ROLE_ADMIN = 'admin'
ROLE_DEVELOPER = 'developer'
ROLE_VIEWER = 'viewer'

ROLE_CHOICES = (
    (ROLE_OWNER, 'Owner'),
    (ROLE_ADMIN, 'Admin'),
    (ROLE_DEVELOPER, 'Developer'),
    (ROLE_VIEWER, 'Viewer'),
)

# Health Status Constants
HEALTH_HEALTHY = 'healthy'
HEALTH_DEGRADED = 'degraded'
HEALTH_CRITICAL = 'critical'
HEALTH_UNKNOWN = 'unknown'
HEALTH_INSUFFICIENT_DATA = 'unknown'

HEALTH_CHOICES = (
    (HEALTH_HEALTHY, 'Healthy'),
    (HEALTH_DEGRADED, 'Degraded'),
    (HEALTH_CRITICAL, 'Critical'),
    (HEALTH_UNKNOWN, 'Insufficient Data'),
)

# Incident Severity Constants
SEVERITY_CRITICAL = 'critical'
SEVERITY_HIGH = 'high'
SEVERITY_MEDIUM = 'medium'
SEVERITY_LOW = 'low'

SEVERITY_CHOICES = (
    (SEVERITY_CRITICAL, 'Critical'),
    (SEVERITY_HIGH, 'High'),
    (SEVERITY_MEDIUM, 'Medium'),
    (SEVERITY_LOW, 'Low'),
)

# Incident Status Constants
INCIDENT_STATUS_OPEN = 'open'
INCIDENT_STATUS_ACKNOWLEDGED = 'acknowledged'
INCIDENT_STATUS_INVESTIGATING = 'investigating'
INCIDENT_STATUS_RESOLVED = 'resolved'

INCIDENT_STATUS_CHOICES = (
    (INCIDENT_STATUS_OPEN, 'Open'),
    (INCIDENT_STATUS_ACKNOWLEDGED, 'Acknowledged'),
    (INCIDENT_STATUS_INVESTIGATING, 'Investigating'),
    (INCIDENT_STATUS_RESOLVED, 'Resolved'),
)

# Anomaly Status Constants
ANOMALY_STATUS_ACTIVE = 'active'
ANOMALY_STATUS_ACKNOWLEDGED = 'acknowledged'
ANOMALY_STATUS_RESOLVED = 'resolved'
ANOMALY_STATUS_FALSE_POSITIVE = 'false_positive'

ANOMALY_STATUS_CHOICES = (
    (ANOMALY_STATUS_ACTIVE, 'Active'),
    (ANOMALY_STATUS_ACKNOWLEDGED, 'Acknowledged'),
    (ANOMALY_STATUS_RESOLVED, 'Resolved'),
    (ANOMALY_STATUS_FALSE_POSITIVE, 'False Positive'),
)

# Environment Choices
ENV_DEVELOPMENT = 'development'
ENV_STAGING = 'staging'
ENV_PRODUCTION = 'production'

ENVIRONMENT_CHOICES = (
    (ENV_DEVELOPMENT, 'Development'),
    (ENV_STAGING, 'Staging'),
    (ENV_PRODUCTION, 'Production'),
)

# HTTP Methods
HTTP_METHODS = ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')
HTTP_METHOD_CHOICES = tuple((m, m) for m in HTTP_METHODS)
