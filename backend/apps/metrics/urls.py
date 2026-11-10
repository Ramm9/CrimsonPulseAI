from django.urls import path
from apps.metrics.views import TrafficMetricsView, DashboardOverviewView

app_name = 'metrics'

urlpatterns = [
    path('traffic/', TrafficMetricsView.as_view(), name='traffic-metrics'),
    path('dashboard/', DashboardOverviewView.as_view(), name='dashboard-summary'),
]

