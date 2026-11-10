import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Base directory: /Users/.../CRIMSONPULSEAI/backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file from backend/.env or root repository .env
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'crimsonpulse-dev-secret-key-do-not-use-in-production-random-hash-2026',
)

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',')
    if h.strip()
]

# Custom User Model - Configured before the first migration
AUTH_USER_MODEL = 'accounts.User'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Local apps
    'apps.accounts.apps.AccountsConfig',
    'apps.organizations.apps.OrganizationsConfig',
    'apps.projects.apps.ProjectsConfig',
    'apps.endpoints.apps.EndpointsConfig',
    'apps.telemetry.apps.TelemetryConfig',
    'apps.metrics.apps.MetricsConfig',
    'apps.anomalies.apps.AnomaliesConfig',
    'apps.incidents.apps.IncidentsConfig',
    'apps.contracts.apps.ContractsConfig',
    'apps.integrations.apps.IntegrationsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.ai_assistant.apps.AiAssistantConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database Configuration: Neon PostgreSQL (Pooled vs Direct)
from .database import get_database_config
DATABASES = get_database_config(BASE_DIR)

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'common.exceptions.custom_exception_handler',
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
    ).split(',')
    if origin.strip()
]

# OpenAPI / Swagger Documentation via drf-spectacular
SPECTACULAR_SETTINGS = {
    'TITLE': 'CrimsonPulse AI Platform API',
    'DESCRIPTION': 'Production-grade backend for CrimsonPulse AI API monitoring, telemetry ingestion, anomaly detection and incident management.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'True') == 'True'

