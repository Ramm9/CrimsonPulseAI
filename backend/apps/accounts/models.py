from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from common.utils import generate_id
from common.constants import ROLE_CHOICES, ROLE_DEVELOPER, ROLE_OWNER

def default_user_id() -> str:
    return generate_id('usr')

class UserManager(BaseUserManager):
    """Custom user manager supporting email-based authentication."""

    def create_user(self, email, password=None, name='', **extra_fields):
        if not email:
            raise ValueError('An email address is required for registration.')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, name=name, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, name='System Admin', **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', ROLE_OWNER)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, name=name, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """
    CrimsonPulse AI Custom User Model.
    Uses email as the unique identifier and prefixed string IDs (usr_xxx) matching the frontend contract.
    """
    id = models.CharField(
        max_length=64,
        primary_key=True,
        default=default_user_id,
        editable=False,
    )
    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    avatar = models.URLField(max_length=1024, blank=True, null=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_DEVELOPER)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'cp_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.name} <{self.email}>"

