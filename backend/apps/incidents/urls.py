from django.urls import path
from apps.incidents.views import (
    IncidentListView,
    IncidentDetailView,
    IncidentCommentView,
    IncidentAssignView,
)

app_name = 'incidents'

urlpatterns = [
    path('', IncidentListView.as_view(), name='incident-list'),
    path('<str:incident_id>/', IncidentDetailView.as_view(), name='incident-detail'),
    path('<str:incident_id>/comments/', IncidentCommentView.as_view(), name='incident-comments'),
    path('<str:incident_id>/assign/', IncidentAssignView.as_view(), name='incident-assign'),
]

