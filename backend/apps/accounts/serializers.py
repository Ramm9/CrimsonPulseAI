from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from apps.accounts.models import User
from apps.organizations.models import Organization
from common.exceptions import AuthenticationFailedError

class UserSerializer(serializers.ModelSerializer):
    """Formats User payload matching frontend User interface."""
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'avatar', 'role', 'createdAt']
        read_only_fields = ['id', 'role', 'createdAt']

class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    organization_name = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return normalized

    def validate_password(self, value):
        validate_password(value)
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        user = authenticate(username=email, password=password)
        if not user:
            raise AuthenticationFailedError('Invalid email or password.')
        if not user.is_active:
            raise AuthenticationFailedError('This account has been disabled.')

        attrs['user'] = user
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

