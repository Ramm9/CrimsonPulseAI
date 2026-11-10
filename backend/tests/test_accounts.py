import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestCustomUserModel:
    def test_create_user_successful(self):
        user = User.objects.create_user(
            email='alex.rivera@crimsonpulse.io',
            password='SecurePassword123!',
            name='Alex Rivera',
        )
        assert user.email == 'alex.rivera@crimsonpulse.io'
        assert user.name == 'Alex Rivera'
        assert user.check_password('SecurePassword123!')
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.id.startswith('usr_')

    def test_create_user_email_normalized(self):
        user = User.objects.create_user(
            email='ALEX.RIVERA@CrimsonPulse.IO',
            password='Password123!',
            name='Alex Rivera',
        )
        assert user.email == 'ALEX.RIVERA@crimsonpulse.io'

    def test_create_user_missing_email_raises_error(self):
        with pytest.raises(ValueError, match='An email address is required'):
            User.objects.create_user(email='', password='password', name='Test')

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@crimsonpulse.io',
            password='SuperAdminPass123!',
            name='Admin User',
        )
        assert admin.is_staff is True
        assert admin.is_superuser is True
        assert admin.id.startswith('usr_')

