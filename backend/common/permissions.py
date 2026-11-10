from rest_framework import permissions
from common.constants import ROLE_OWNER, ROLE_ADMIN

class IsOrganizationMember(permissions.BasePermission):
    """
    Ensures that the requesting user is an active member of the target organization.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        org = getattr(obj, 'organization', obj)
        return org.memberships.filter(user=request.user).exists()

class IsOrganizationAdminOrOwner(permissions.BasePermission):
    """
    Grants access only to members with Owner or Admin role in the organization.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        org = getattr(obj, 'organization', obj)
        return org.memberships.filter(
            user=request.user,
            role__in=[ROLE_OWNER, ROLE_ADMIN],
        ).exists()

class HasProjectAccess(permissions.BasePermission):
    """
    Ensures the requesting user belongs to the organization that owns the project.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        project = getattr(obj, 'project', obj)
        return project.organization.memberships.filter(user=request.user).exists()

