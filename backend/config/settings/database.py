import os
import sys
import logging
from urllib.parse import urlparse, parse_qs, unquote
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

def parse_database_url(url: str, is_direct: bool = False) -> dict:
    """
    Safely parses a PostgreSQL / Neon connection URI into Django DATABASES configuration.
    
    Supports:
      - postgresql:// and postgres:// URI schemes
      - URL-encoded passwords and database names
      - Query parameters such as sslmode=require (enforced for Neon)
      - Zero client-side double pooling (CONN_MAX_AGE=0 for Neon PgBouncer pooler)
      - Connection health checks (CONN_HEALTH_CHECKS=True)
    """
    if not url or not isinstance(url, str):
        raise ImproperlyConfigured("Database URL must be a non-empty string.")

    parsed = urlparse(url)
    if parsed.scheme not in ('postgresql', 'postgres'):
        raise ImproperlyConfigured(
            f"Unsupported database scheme '{parsed.scheme}'. "
            "Neon PostgreSQL requires 'postgresql://' or 'postgres://'."
        )

    db_name = unquote(parsed.path.lstrip('/')) if parsed.path else ''
    if not db_name:
        raise ImproperlyConfigured("Database name missing in connection URL.")

    user = unquote(parsed.username) if parsed.username else ''
    password = unquote(parsed.password) if parsed.password else ''
    host = parsed.hostname or 'localhost'
    port = str(parsed.port or 5432)

    query_params = parse_qs(parsed.query)

    # Neon requires SSL. Enforce sslmode=require if not explicitly specified.
    sslmode = query_params.get('sslmode', ['require'])[0]

    options = {
        'sslmode': sslmode,
    }

    # Pass additional supported options if specified in query
    if 'connect_timeout' in query_params:
        try:
            options['connect_timeout'] = int(query_params['connect_timeout'][0])
        except ValueError:
            pass

    if 'application_name' in query_params:
        options['application_name'] = query_params['application_name'][0]
    else:
        options['application_name'] = 'crimsonpulse-direct' if is_direct else 'crimsonpulse-api'

    # When connecting through Neon's PgBouncer pooler (-pooler in hostname),
    # persistent connections (CONN_MAX_AGE > 0) cause connection exhaustion.
    # We set CONN_MAX_AGE=0 so Django closes connections after each request.
    # For direct connections, a short lifespan is also recommended with health checks.
    conn_max_age = 0 if ('-pooler' in host or not is_direct) else int(os.environ.get('DB_CONN_MAX_AGE', 0))

    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_name,
        'USER': user,
        'PASSWORD': password,
        'HOST': host,
        'PORT': port,
        'OPTIONS': options,
        'CONN_MAX_AGE': conn_max_age,
        'CONN_HEALTH_CHECKS': True,
    }

def get_database_config(base_dir) -> dict:
    """
    Builds the DATABASES setting for Django.
    
    Selection hierarchy:
      1. If DB_USE_DIRECT_URL=true:
         Uses DATABASE_URL_DIRECT (falls back to DATABASE_URL with a warning if not set).
      2. If DB_USE_DIRECT_URL=false (default):
         Uses DATABASE_URL (pooled connection).
      3. Fail-safe error handling:
         If in production or PostgreSQL is required and no URL is present,
         raises ImproperlyConfigured. Never silently falls back to SQLite.
      4. Explicit fallback for local test execution when USE_SQLITE=True is specified.
    """
    use_direct = os.environ.get('DB_USE_DIRECT_URL', 'false').lower() in ('true', '1', 't', 'yes')
    database_url = os.environ.get('DATABASE_URL', '').strip()
    database_url_direct = os.environ.get('DATABASE_URL_DIRECT', '').strip()

    is_production = os.environ.get('DJANGO_SETTINGS_MODULE', '').endswith('production') or not os.environ.get('DEBUG', 'True') == 'True'
    is_testing = 'pytest' in sys.modules or 'test' in sys.argv

    # 1. Direct connection selected (e.g. for migrations or DDL)
    if use_direct:
        if database_url_direct:
            logger.info("Using Neon direct PostgreSQL connection (DB_USE_DIRECT_URL=true).")
            return {'default': parse_database_url(database_url_direct, is_direct=True)}
        elif database_url:
            logger.warning(
                "DB_USE_DIRECT_URL=true was requested, but DATABASE_URL_DIRECT is not set. "
                "Falling back to DATABASE_URL. Note: DDL/migrations on pooled endpoints may fail."
            )
            return {'default': parse_database_url(database_url, is_direct=False)}
        else:
            raise ImproperlyConfigured(
                "DB_USE_DIRECT_URL=true was requested for direct Neon PostgreSQL connection, "
                "but neither DATABASE_URL_DIRECT nor DATABASE_URL was found in the environment. "
                "Please configure DATABASE_URL_DIRECT in backend/.env."
            )

    # 2. Standard pooled connection for application traffic & Celery
    if database_url:
        return {'default': parse_database_url(database_url, is_direct=False)}

    # If DATABASE_URL is not set but direct URL is available
    if database_url_direct:
        logger.info("DATABASE_URL not set; using DATABASE_URL_DIRECT for default connection.")
        return {'default': parse_database_url(database_url_direct, is_direct=True)}

    # 3. No Neon database URL provided: Enforce strict configuration guards
    if is_production or os.environ.get('DB_ENGINE') == 'postgresql':
        raise ImproperlyConfigured(
            "CRITICAL DATABASE CONFIGURATION ERROR:\n"
            "CrimsonPulse AI requires a configured Neon PostgreSQL connection string, but "
            "neither DATABASE_URL nor DATABASE_URL_DIRECT was found in the environment.\n"
            "Please create a Neon project (https://neon.com) and add the following to backend/.env:\n\n"
            "  DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler/DBNAME?sslmode=require\n"
            "  DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require\n"
            "  DB_USE_DIRECT_URL=false\n"
        )

    # 4. Local test / offline runner fallback ONLY when explicitly enabled via USE_SQLITE=True
    if os.environ.get('USE_SQLITE', 'False').lower() in ('true', '1', 't') or is_testing:
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': base_dir / 'db.sqlite3',
            }
        }

    # Default: Raise configuration error if neither Neon URL nor explicit SQLite override was supplied
    raise ImproperlyConfigured(
        "No database configuration found.\n"
        "Configure Neon PostgreSQL by setting DATABASE_URL in backend/.env:\n"
        "  DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler/DBNAME?sslmode=require\n"
        "  DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require\n"
        "To run tests in an offline isolated sandbox, explicitly pass USE_SQLITE=True."
    )

def get_safe_connection_summary(config: dict) -> str:
    """Returns a redacted, safe summary of the active connection for logging/diagnostics."""
    default = config.get('default', {})
    engine = default.get('ENGINE', 'unknown')
    if 'postgresql' in engine:
        host = default.get('HOST', 'unknown')
        name = default.get('NAME', 'unknown')
        user = default.get('USER', 'unknown')
        is_pooler = '-pooler' in host
        return f"PostgreSQL [host={host}, db={name}, user={user}, pooler={is_pooler}, ssl=require]"
    elif 'sqlite3' in engine:
        return f"SQLite3 [path={default.get('NAME', 'unknown')}]"
    return f"Database [engine={engine}]"

