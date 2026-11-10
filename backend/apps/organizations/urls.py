from django.urls import path
from apps.organizations.views import (
    CurrentOrganizationView,
    OrganizationMembersView,
)

app_name = 'organizations'

urlpatterns = [
    path('current/', CurrentOrganizationView.as_view(), name='current_organization'),
    path('current/members/', OrganizationMembersView.as_view(), name='organization_members'),
    path('current/invitations/', OrganizationMembersView.as_view(), name='organization_invitations'),
]
