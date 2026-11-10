from django.urls import path
from apps.endpoints.views import (
    EndpointListView,
    EndpointDetailView,
    EndpointMetricsView,
)

app_name = 'endpoints'

urlpatterns = [
    path('', EndpointListView.as_view(), name='endpoint-list'),
    path('<str:endpoint_id>/', EndpointDetailView.as_view(), name='endpoint-detail'),
    path('<str:endpoint_id>/metrics/', EndpointMetricsView.as_view(), name='endpoint-metrics'),
]

