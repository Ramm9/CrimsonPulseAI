from django.urls import path
from apps.anomalies.views import (
    AnomalyListView,
    AnomalyDetailView,
    AnomalyStatsView,
)

app_name = 'anomalies'

urlpatterns = [
    path('', AnomalyListView.as_view(), name='anomaly-list'),
    path('stats/', AnomalyStatsView.as_view(), name='anomaly-stats'),
    path('<str:anomaly_id>/', AnomalyDetailView.as_view(), name='anomaly-detail'),
]

