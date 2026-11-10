from django.urls import path
from apps.contracts.views import (
    ContractSpecListView,
    ContractSpecDetailView,
    ContractViolationListView,
)

app_name = 'contracts'

urlpatterns = [
    path('specs/', ContractSpecListView.as_view(), name='spec-list-create'),
    path('specs/<str:spec_id>/', ContractSpecDetailView.as_view(), name='spec-detail'),
    path('violations/', ContractViolationListView.as_view(), name='violation-list'),
]

