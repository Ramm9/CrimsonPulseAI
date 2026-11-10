import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    NotFound as DRFNotFound,
    ValidationError as DRFValidationError,
    PermissionDenied as DRFPermissionDenied,
    AuthenticationFailed as DRFAuthenticationFailed,
)

logger = logging.getLogger(__name__)

class NotFoundError(DRFNotFound):
    default_detail = 'The requested resource was not found.'
    default_code = 'not_found'

class ValidationError(DRFValidationError):
    default_detail = 'Invalid input parameters.'
    default_code = 'invalid'

class ForbiddenError(DRFPermissionDenied):
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'permission_denied'

class AuthenticationFailedError(DRFAuthenticationFailed):
    default_detail = 'Authentication credentials were not provided or invalid.'
    default_code = 'authentication_failed'

def custom_exception_handler(exc, context):
    """
    Standardizes error responses across all CrimsonPulse AI endpoints.
    Ensures frontend client receives predictable error objects.
    """
    response = exception_handler(exc, context)

    if response is not None:
        message = 'An error occurred processing your request.'
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])
        elif isinstance(response.data, dict) and 'message' in response.data:
            message = str(response.data['message'])
        elif isinstance(response.data, dict):
            first_val = next(iter(response.data.values()), None)
            if isinstance(first_val, list) and len(first_val) > 0:
                message = str(first_val[0])
            elif isinstance(first_val, str):
                message = first_val
        elif isinstance(response.data, list) and len(response.data) > 0:
            message = str(response.data[0])
        elif isinstance(response.data, str):
            message = response.data

        custom_data = {
            'error': True,
            'status_code': response.status_code,
            'message': message,
            'detail': response.data,
        }

        response.data = custom_data
        return response

    # Catch-all for unhandled server exceptions (500)
    logger.exception('Unhandled backend exception: %s', exc)
    return Response(
        {
            'error': True,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An internal server error occurred. Our engineering team has been notified.',
            'detail': str(exc) if context.get('request') and getattr(context['request'].user, 'is_staff', False) else 'Internal server error',
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
