from rest_framework import status, permissions, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from apps.contracts.models import APIContract, ContractViolation
from apps.contracts.serializers import (
    ContractSpecSerializer,
    ContractViolationSerializer,
    UploadSpecSerializer,
)
from apps.contracts.services import parse_and_validate_spec
from apps.projects.models import Project
from apps.organizations.models import OrganizationMembership
from common.exceptions import NotFoundError

class ContractSpecListView(APIView):
    """List OpenAPI contract specifications or upload a new contract."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    @extend_schema(responses={200: ContractSpecSerializer(many=True)})
    def get(self, request, project_id: str | None = None):
        queryset = APIContract.objects.filter(
            project__organization__memberships__user=request.user,
        )

        proj_id = project_id or request.query_params.get('projectId') or request.query_params.get('project_id') or request.query_params.get('project')
        if proj_id and proj_id != 'all':
            queryset = queryset.filter(Q(project__id=proj_id) | Q(project__slug=proj_id))

        contracts = queryset.order_by('-uploaded_at')
        serializer = ContractSpecSerializer(contracts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=UploadSpecSerializer, responses={201: ContractSpecSerializer})
    def post(self, request):
        serializer = UploadSpecSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Determine target project
        proj_id = data.get('projectId') or request.query_params.get('projectId')
        if proj_id:
            project = Project.objects.filter(
                Q(id=proj_id) | Q(slug=proj_id),
                organization__memberships__user=request.user,
            ).first()
        else:
            membership = OrganizationMembership.objects.filter(user=request.user).first()
            project = membership.organization.projects.first() if membership else None

        if not project:
            raise NotFoundError('No project found to associate with this contract.')

        # Extract file content if uploaded via multipart/form-data
        content = data.get('content', '')
        if 'file' in request.FILES:
            try:
                content = request.FILES['file'].read().decode('utf-8')
            except Exception:
                pass

        contract, _ = parse_and_validate_spec(
            project=project,
            name=data['name'],
            version=data.get('version', 'v1.0'),
            content_str=content,
        )

        return Response(ContractSpecSerializer(contract).data, status=status.HTTP_201_CREATED)

class ContractSpecDetailView(APIView):
    """Retrieve detailed specification metadata."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: ContractSpecSerializer})
    def get(self, request, spec_id: str):
        spec = APIContract.objects.filter(
            id=spec_id,
            project__organization__memberships__user=request.user,
        ).first()

        if not spec:
            raise NotFoundError(f'Contract specification "{spec_id}" not found.')

        return Response(ContractSpecSerializer(spec).data, status=status.HTTP_200_OK)

class ContractViolationListView(APIView):
    """List detected contract violations, optionally filtered by specId."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: ContractViolationSerializer(many=True)})
    def get(self, request):
        queryset = ContractViolation.objects.filter(
            spec__project__organization__memberships__user=request.user,
        )

        spec_id = request.query_params.get('specId')
        if spec_id:
            queryset = queryset.filter(spec__id=spec_id)

        violations = queryset.order_by('-detected_at')
        serializer = ContractViolationSerializer(violations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

