from django.urls import path
from apps.ai_assistant.views import (
    InvestigationDetailView,
    InvestigationMessageView,
    ChecklistToggleView,
    SuggestedQuestionsView,
)

app_name = 'ai_assistant'

urlpatterns = [
    path('investigations/<str:incident_id>/', InvestigationDetailView.as_view(), name='investigation-detail'),
    path('investigations/<str:investigation_id>/messages/', InvestigationMessageView.as_view(), name='investigation-message'),
    path('checklist/<str:item_id>/', ChecklistToggleView.as_view(), name='checklist-toggle'),
    path('suggested-questions/', SuggestedQuestionsView.as_view(), name='suggested-questions'),
]

