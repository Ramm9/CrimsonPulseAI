import time
import queue
import threading
import logging
import json
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from crimsonpulse.config import CrimsonPulseConfig

logger = logging.getLogger('crimsonpulse')

class CrimsonPulseClient:
    """
    Asynchronous, thread-safe, non-blocking telemetry client.
    Buffers events in an in-memory queue and flushes them to the CrimsonPulse backend
    using a dedicated background daemon thread. Uses standard library HTTP transport
    for zero external dependencies.
    """

    def __init__(self, config: CrimsonPulseConfig):
        self.config = config
        self._queue: queue.Queue = queue.Queue(maxsize=config.max_queue_size)
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None

        if self.config.enabled and self.config.api_key:
            self._start_worker()

    def _start_worker(self):
        if self._worker_thread is None or not self._worker_thread.is_alive():
            self._stop_event.clear()
            self._worker_thread = threading.Thread(
                target=self._worker_loop,
                name='CrimsonPulseTelemetryWorker',
                daemon=True,
            )
            self._worker_thread.start()

    def enqueue(self, event: Dict[str, Any]) -> bool:
        """
        Enqueues an event for background transmission.
        Fail-open guarantee: If the queue is full or client disabled, drops the event
        immediately without blocking or throwing an exception.
        """
        if not self.config.enabled or not self.config.api_key:
            return False

        if self._worker_thread is None and not self._stop_event.is_set():
            self._start_worker()

        try:
            self._queue.put_nowait(event)
            return True
        except queue.Full:
            logger.warning("CrimsonPulse telemetry queue is full (%d events); dropping event.", self.config.max_queue_size)
            return False
        except Exception as e:
            logger.debug("Failed to enqueue telemetry event: %s", e)
            return False

    def track_event(
        self,
        endpoint: str,
        method: str = 'GET',
        status_code: int = 200,
        response_time_ms: float = 0.0,
        error_message: Optional[str] = None,
        event_id: Optional[str] = None,
        environment: Optional[str] = None,
        app_version: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Convenience method for manual/programmatic telemetry tracking."""
        import uuid
        from datetime import datetime, timezone

        event = {
            'event_id': event_id or f"evt_py_{uuid.uuid4().hex[:16]}",
            'endpoint': endpoint,
            'method': method.upper(),
            'statusCode': status_code,
            'responseTime': round(response_time_ms, 2),
            'environment': environment or self.config.environment,
            'appVersion': app_version or self.config.app_version,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        if error_message:
            event['error'] = error_message
        if extra and isinstance(extra, dict):
            event.update(extra)

        return self.enqueue(event)

    def _worker_loop(self):
        batch: List[Dict[str, Any]] = []
        last_flush_time = time.monotonic()

        while not self._stop_event.is_set():
            try:
                # Wait for next item or interval timeout
                timeout = max(0.1, self.config.flush_interval - (time.monotonic() - last_flush_time))
                try:
                    event = self._queue.get(timeout=timeout)
                    batch.append(event)
                    self._queue.task_done()
                except queue.Empty:
                    pass

                now = time.monotonic()
                should_flush = (
                    len(batch) >= self.config.batch_size
                    or (batch and (now - last_flush_time) >= self.config.flush_interval)
                )

                if should_flush:
                    self._send_batch(batch)
                    batch = []
                    last_flush_time = now

            except Exception as e:
                logger.debug("Error in CrimsonPulse worker loop: %s", e)
                time.sleep(0.5)

        # Drain remaining on shutdown
        while not self._queue.empty():
            try:
                batch.append(self._queue.get_nowait())
                self._queue.task_done()
            except queue.Empty:
                break
        if batch:
            self._send_batch(batch)

    def _send_batch(self, batch: List[Dict[str, Any]]) -> bool:
        """Transmits a batch of events to the CrimsonPulse backend."""
        if not batch or not self.config.api_key:
            return False

        headers = {
            'X-CrimsonPulse-Key': self.config.api_key.strip(),
            'Content-Type': 'application/json',
            'User-Agent': f'CrimsonPulse-Python-SDK/1.0.0 (Env: {self.config.environment})',
        }

        try:
            payload_bytes = json.dumps(batch).encode('utf-8')
            req = urllib.request.Request(
                self.config.api_url,
                data=payload_bytes,
                headers=headers,
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=self.config.timeout) as resp:
                if resp.status in (200, 201, 202):
                    return True
                else:
                    logger.warning(
                        "CrimsonPulse batch ingestion rejected with HTTP %d",
                        resp.status,
                    )
                    return False
        except urllib.error.HTTPError as e:
            logger.warning("HTTP error during CrimsonPulse telemetry dispatch: %d %s", e.code, e.reason)
            return False
        except urllib.error.URLError as e:
            logger.debug("Network error sending telemetry batch to %s: %s", self.config.api_url, e.reason)
            return False
        except Exception as e:
            logger.debug("Unexpected error during telemetry dispatch: %s", e)
            return False

    def flush(self, timeout: float = 2.0):
        """Block until all queued events are dispatched or timeout elapses."""
        start = time.monotonic()
        while not self._queue.empty() and (time.monotonic() - start) < timeout:
            time.sleep(0.05)

    def shutdown(self, timeout: float = 2.0):
        """Cleanly shutdown the worker thread."""
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=timeout)

