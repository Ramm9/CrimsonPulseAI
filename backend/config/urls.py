from django.contrib import admin
from django.urls import path, include
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.projects.views import (
    ProjectAPIKeyListCreateView,
    ProjectAPIKeyRevokeView,
    ProjectAPIKeyRotateView,
)
from apps.telemetry.views import LiveTrafficFeedView
from apps.metrics.views import DashboardOverviewView

class HealthCheckView(APIView):
    """Public health verification endpoint for frontend and monitoring probes."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'status': 'healthy',
            'service': 'CrimsonPulse AI Backend',
            'version': '1.0.0',
            'timestamp': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Health check
    path('api/v1/health/', HealthCheckView.as_view(), name='health-check'),

    # OpenAPI 3 Schema & Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1 routes
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/organizations/', include('apps.organizations.urls')),
    path('api/v1/projects/', include('apps.projects.urls')),
    path('api/v1/endpoints/', include('apps.endpoints.urls')),
    path('api/v1/anomalies/', include('apps.anomalies.urls')),
    path('api/v1/incidents/', include('apps.incidents.urls')),
    path('api/v1/contracts/', include('apps.contracts.urls')),
    path('api/v1/ai/', include('apps.ai_assistant.urls')),
    path('api/v1/metrics/', include('apps.metrics.urls')),
    path('api/v1/dashboard/', DashboardOverviewView.as_view(), name='global-dashboard-overview'),
    path('api/v1/traffic/', LiveTrafficFeedView.as_view(), name='global-traffic'),
    path('api/v1/telemetry/traffic/', LiveTrafficFeedView.as_view(), name='telemetry-traffic'),
    path('api/v1/keys/', include([
        path('', ProjectAPIKeyListCreateView.as_view(), name='global-keys-list-create'),
        path('<str:key_id>/revoke/', ProjectAPIKeyRevokeView.as_view(), name='global-keys-revoke'),
        path('<str:key_id>/rotate/', ProjectAPIKeyRotateView.as_view(), name='global-keys-rotate'),
    ])),
    path('api/v1/ingest/', include('apps.telemetry.urls')),
]
