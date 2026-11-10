from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.organizations.models import Organization, OrganizationMembership
from apps.organizations.serializers import (
    OrganizationSerializer,
    OrganizationMemberSerializer,
    InviteMemberSerializer,
)
from apps.accounts.models import User
from common.permissions import IsOrganizationAdminOrOwner
from common.constants import ROLE_DEVELOPER

class CurrentOrganizationView(APIView):
    """Retrieve or update the authenticated user's current organization."""
    permission_classes = [permissions.IsAuthenticated]

    def get_organization(self, user):
        membership = OrganizationMembership.objects.filter(user=user).select_related('organization').first()
        if not membership:
            # Fallback auto-create personal organization if none exists
            org = Organization.objects.create(name=f"{user.name}'s Workspace", created_by=user)
            OrganizationMembership.objects.create(organization=org, user=user, role='owner')
            return org
        return membership.organization

    @extend_schema(responses={200: OrganizationSerializer})
    def get(self, request):
        org = self.get_organization(request.user)
        serializer = OrganizationSerializer(org)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=OrganizationSerializer, responses={200: OrganizationSerializer})
    def patch(self, request):
        org = self.get_organization(request.user)
        # Check permissions
        membership = OrganizationMembership.objects.filter(organization=org, user=request.user).first()
        if not membership or membership.role not in ['owner', 'admin']:
            return Response(
                {'error': True, 'message': 'Only organization owners and admins can update settings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

class OrganizationMembersView(APIView):
    """List team members or invite a new member to the current organization."""
    permission_classes = [permissions.IsAuthenticated]

    def get_organization(self, user):
        membership = OrganizationMembership.objects.filter(user=user).select_related('organization').first()
        return membership.organization if membership else None

    @extend_schema(responses={200: OrganizationMemberSerializer(many=True)})
    def get(self, request):
        org = self.get_organization(request.user)
        if not org:
            return Response([], status=status.HTTP_200_OK)

        members = org.memberships.select_related('user').all()
        serializer = OrganizationMemberSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=InviteMemberSerializer)
    def post(self, request):
        org = self.get_organization(request.user)
        if not org:
            return Response({'error': True, 'message': 'No organization found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check permissions
        membership = OrganizationMembership.objects.filter(organization=org, user=request.user).first()
        if not membership or membership.role not in ['owner', 'admin']:
            return Response(
                {'error': True, 'message': 'Only owners and admins can invite members.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        role = serializer.validated_data.get('role', ROLE_DEVELOPER)

        # Check if user already exists
        invited_user = User.objects.filter(email=email).first()
        if not invited_user:
            # Create user placeholder with random password
            invited_user = User.objects.create_user(
                email=email,
                name=email.split('@')[0].capitalize(),
                role=role,
            )

        if OrganizationMembership.objects.filter(organization=org, user=invited_user).exists():
            return Response(
                {'error': True, 'message': 'User is already a member of this organization.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_membership = OrganizationMembership.objects.create(
            organization=org,
            user=invited_user,
            role=role,
        )

        member_data = OrganizationMemberSerializer(new_membership).data
        return Response(member_data, status=status.HTTP_201_CREATED)

