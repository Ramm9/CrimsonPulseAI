from django.urls import path
from apps.telemetry.views import TelemetryIngestView, LiveTrafficFeedView

app_name = 'telemetry'

urlpatterns = [
    path('', TelemetryIngestView.as_view(), name='ingest-root'),
    path('events/', TelemetryIngestView.as_view(), name='ingest-events'),
    path('traffic/', LiveTrafficFeedView.as_view(), name='live-traffic'),
]
