from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.accounts.serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)
from apps.accounts.services import register_user

class RegisterView(APIView):
    """Register a new user and create their default organization."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description="User and Organization created successfully."),
            400: OpenApiResponse(description="Validation error."),
        },
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        result = register_user(
            name=data['name'],
            email=data['email'],
            password=data['password'],
            organization_name=data.get('organization_name', ''),
        )

        user_data = UserSerializer(result['user']).data
        org_data = {
            'id': result['organization'].id,
            'name': result['organization'].name,
            'slug': result['organization'].slug,
            'plan': result['organization'].plan,
        }

        return Response(
            {
                'user': user_data,
                'organization': org_data,
                'token': result['tokens']['access'],
                'tokens': result['tokens'],
            },
            status=status.HTTP_201_CREATED,
        )

class LoginView(APIView):
    """Authenticate with email and password, returning JWT tokens and user profile."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful."),
            400: OpenApiResponse(description="Invalid credentials."),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        user_data = UserSerializer(user).data
        tokens = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

        return Response(
            {
                'user': user_data,
                'token': tokens['access'],
                'tokens': tokens,
            },
            status=status.HTTP_200_OK,
        )

class CurrentUserView(APIView):
    """Retrieve or update currently authenticated user profile."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UserSerializer, responses={200: UserSerializer})
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    """Change password for authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': True, 'message': 'Incorrect current password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response(
            {'status': 'success', 'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )

class LogoutView(APIView):
    """
    Invalidates the active user session by blacklisting the provided refresh token.
    Accepts: { 'refresh': '<refresh_token>' }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh') if isinstance(request.data, dict) else None
        if not refresh_token:
            return Response(
                {'error': True, 'message': 'Refresh token is required for logout.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'status': 'success', 'message': 'Successfully logged out and session revoked.'},
                status=status.HTTP_200_OK,
            )
        except TokenError as e:
            return Response(
                {'error': True, 'message': f'Invalid or already blacklisted token: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

