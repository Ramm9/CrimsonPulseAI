from django.urls import path
from apps.projects.views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectAPIKeyListCreateView,
    ProjectAPIKeyRevokeView,
    ProjectAPIKeyRotateView,
)
from apps.telemetry.views import LiveTrafficFeedView, SDKStatusView
from apps.endpoints.views import EndpointListView, EndpointMetricsView
from apps.metrics.views import TrafficMetricsView, DashboardOverviewView

app_name = 'projects'

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('<str:project_id>/', ProjectDetailView.as_view(), name='project-detail'),
    path('<str:project_id>/keys/', ProjectAPIKeyListCreateView.as_view(), name='project-keys'),
    path('<str:project_id>/keys/<str:key_id>/revoke/', ProjectAPIKeyRevokeView.as_view(), name='project-key-revoke'),
    path('<str:project_id>/keys/<str:key_id>/rotate/', ProjectAPIKeyRotateView.as_view(), name='project-key-rotate'),
    path('<str:project_id>/traffic/', LiveTrafficFeedView.as_view(), name='project-traffic-feed'),
    path('<str:project_id>/sdk/status/', SDKStatusView.as_view(), name='project-sdk-status'),
    path('<str:project_id>/endpoints/', EndpointListView.as_view(), name='project-endpoint-list'),
    path('<str:project_id>/endpoints/<str:endpoint_id>/metrics/', EndpointMetricsView.as_view(), name='project-endpoint-metrics'),
    path('<str:project_id>/metrics/traffic/', TrafficMetricsView.as_view(), name='project-traffic-metrics'),
    path('<str:project_id>/dashboard/', DashboardOverviewView.as_view(), name='project-dashboard-overview'),
]
