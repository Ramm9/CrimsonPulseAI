from rest_framework import serializers
from apps.organizations.models import Organization, OrganizationMembership
from apps.accounts.models import User
from common.constants import ROLE_CHOICES

class OrganizationSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'plan', 'retention_days', 'createdAt']
        read_only_fields = ['id', 'slug', 'createdAt']

class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Matches frontend TeamMember interface in SettingsPage."""
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    avatar = serializers.URLField(source='user.avatar', read_only=True)
    joinedAt = serializers.DateTimeField(source='joined_at', read_only=True)
    lastActive = serializers.DateTimeField(source='user.updated_at', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ['id', 'name', 'email', 'role', 'avatar', 'joinedAt', 'lastActive']
        read_only_fields = ['id', 'name', 'email', 'avatar', 'joinedAt', 'lastActive']

class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, default='developer')

