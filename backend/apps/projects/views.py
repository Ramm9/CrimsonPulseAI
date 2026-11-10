from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from apps.organizations.models import OrganizationMembership
from apps.projects.models import Project, ProjectAPIKey
from apps.projects.serializers import (
    ProjectSerializer,
    CreateProjectSerializer,
    ProjectAPIKeySerializer,
    GenerateKeySerializer,
)
from apps.projects.services import (
    create_project,
    generate_project_key,
    revoke_project_key,
    rotate_project_key,
)
from common.exceptions import NotFoundError, ForbiddenError

class ProjectBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_organization(self, user):
        membership = OrganizationMembership.objects.filter(user=user).select_related('organization').first()
        if not membership:
            from apps.organizations.models import Organization
            org = Organization.objects.create(name=f"{user.name}'s Workspace", created_by=user)
            OrganizationMembership.objects.create(organization=org, user=user, role='owner')
            return org
        return membership.organization

    def get_project_for_user(self, user, project_id: str) -> Project:
        project = Project.objects.filter(
            Q(id=project_id) | Q(slug=project_id),
            organization__memberships__user=user,
        ).first()
        if not project:
            raise NotFoundError(f'Project "{project_id}" not found or you lack permission.')
        return project

class ProjectListCreateView(ProjectBaseView):
    """List all projects for the authenticated user or create a new project."""

    @extend_schema(responses={200: ProjectSerializer(many=True)})
    def get(self, request):
        org = self.get_organization(request.user)
        queryset = Project.objects.filter(organization=org)

        # Filters
        env = request.query_params.get('environment')
        if env:
            queryset = queryset.filter(environment=env)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        serializer = ProjectSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=CreateProjectSerializer, responses={201: ProjectSerializer})
    def post(self, request):
        org = self.get_organization(request.user)
        serializer = CreateProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        project, default_key, full_key = create_project(
            organization=org,
            name=data['name'],
            description=data.get('description', ''),
            environment=data.get('environment', 'production'),
            base_url=data.get('baseUrl', ''),
        )

        project_data = ProjectSerializer(project).data
        project_data['fullKey'] = full_key  # Secret key returned once on creation
        return Response(project_data, status=status.HTTP_201_CREATED)

class ProjectDetailView(ProjectBaseView):
    """Retrieve, update or delete a specific project by ID or slug."""

    @extend_schema(responses={200: ProjectSerializer})
    def get(self, request, project_id: str):
        project = self.get_project_for_user(request.user, project_id)
        serializer = ProjectSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=CreateProjectSerializer, responses={200: ProjectSerializer})
    def patch(self, request, project_id: str):
        project = self.get_project_for_user(request.user, project_id)

        # Check membership role
        membership = OrganizationMembership.objects.filter(organization=project.organization, user=request.user).first()
        if not membership or membership.role not in ['owner', 'admin']:
            raise ForbiddenError('Only organization admins or owners can update project settings.')

        name = request.data.get('name')
        if name:
            project.name = name
        if 'description' in request.data:
            project.description = request.data['description']
        if 'environment' in request.data:
            project.environment = request.data['environment']
        if 'baseUrl' in request.data:
            project.base_url = request.data['baseUrl']

        project.save()
        serializer = ProjectSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, project_id: str):
        project = self.get_project_for_user(request.user, project_id)

        membership = OrganizationMembership.objects.filter(organization=project.organization, user=request.user).first()
        if not membership or membership.role not in ['owner', 'admin']:
            raise ForbiddenError('Only organization admins or owners can delete projects.')

        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ProjectAPIKeyListCreateView(ProjectBaseView):
    """List or create API keys for a project or user's active organization."""

    @extend_schema(responses={200: ProjectAPIKeySerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        if project_id:
            project = self.get_project_for_user(request.user, project_id)
            keys = project.api_keys.all()
        else:
            org = self.get_organization(request.user)
            keys = ProjectAPIKey.objects.filter(project__organization=org)

        serializer = ProjectAPIKeySerializer(keys, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=GenerateKeySerializer, responses={201: ProjectAPIKeySerializer})
    def post(self, request, project_id: str | None = None):
        if project_id:
            project = self.get_project_for_user(request.user, project_id)
        else:
            org = self.get_organization(request.user)
            project = org.projects.first()
            if not project:
                raise NotFoundError('No project found to associate with this API key. Create a project first.')

        serializer = GenerateKeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        key_obj, full_key = generate_project_key(project, serializer.validated_data['name'])
        data = ProjectAPIKeySerializer(key_obj).data
        data['fullKey'] = full_key
        return Response(data, status=status.HTTP_201_CREATED)

class ProjectAPIKeyRevokeView(ProjectBaseView):
    """Revoke an active API key."""

    def post(self, request, key_id: str, project_id: str | None = None):
        key = ProjectAPIKey.objects.filter(
            id=key_id,
            project__organization__memberships__user=request.user,
        ).first()

        if not key:
            raise NotFoundError('API key not found or you lack permission.')

        revoked_key = revoke_project_key(key.project, key.id)
        serializer = ProjectAPIKeySerializer(revoked_key)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProjectAPIKeyRotateView(ProjectBaseView):
    """
    Rotates an existing project API key:
    Immediately revokes the targeted key and provisions a fresh replacement key.
    Returns the new key object along with the single-exposure plaintext `fullKey`.
    """

    def post(self, request, key_id: str, project_id: str | None = None):
        key = ProjectAPIKey.objects.filter(
            id=key_id,
            project__organization__memberships__user=request.user,
        ).select_related('project').first()

        if not key:
            raise NotFoundError('API key not found or you lack permission.')

        new_name = request.data.get('name') if isinstance(request.data, dict) else None
        new_key, full_key = rotate_project_key(key.project, key.id, new_name=new_name)
        data = ProjectAPIKeySerializer(new_key).data
        data['fullKey'] = full_key
        data['revokedKeyId'] = key.id
        return Response(data, status=status.HTTP_201_CREATED)

