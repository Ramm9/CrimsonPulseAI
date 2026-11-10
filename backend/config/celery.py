import os
from celery import Celery
from celery.signals import task_postrun

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('crimsonpulse')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@task_postrun.connect
def close_db_connections(**kwargs):
    """
    Cleanly close database connections after each task execution.
    Prevents holding idle connections to Neon's PgBouncer pooler in long-running Celery worker processes.
    """
    from django.db import connections
    connections.close_all()


