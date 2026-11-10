from celery import shared_task
import logging
from apps.endpoints.models import Endpoint
from apps.anomalies.services import evaluate_endpoint_anomalies

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def evaluate_endpoint_anomalies_task(self, endpoint_id: str):
    """
    Asynchronously evaluates an endpoint against rolling baselines and generates
    anomaly and incident records without duplicating active anomalies.
    """
    try:
        endpoint = Endpoint.objects.filter(id=endpoint_id).first()
        if not endpoint:
            return {'status': 'skipped', 'reason': f'Endpoint {endpoint_id} not found'}

        created = evaluate_endpoint_anomalies(endpoint)
        return {
            'status': 'success',
            'endpoint_id': endpoint_id,
            'anomalies_created': len(created),
            'anomaly_ids': [a.id for a in created],
        }
    except Exception as exc:
        logger.error("Error evaluating anomalies for %s: %s", endpoint_id, exc)
        raise self.retry(exc=exc)

