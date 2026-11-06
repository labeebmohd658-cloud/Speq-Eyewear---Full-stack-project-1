
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db.models import Q


class User(AbstractUser): 
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    phone = models.CharField(max_length=15, blank=True)
    profile_picture = models.URLField(blank=True)
    referral_code = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )
    blocked_at = models.DateTimeField(null=True, blank=True)
    block_reason = models.TextField(blank=True)
    is_blocked=models.BooleanField(default=False)

    def __str__(self):
        return self.email


class Address(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="addresses"
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default="India")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True),
                name="unique_default_address_per_user"
            )
        ]

    def __str__(self):
        return f"{self.full_name} - {self.city}"

class EmailOTP(models.Model):

    PURPOSE_CHOICE = [
        ("email_verification", "Email Verification"),
        ("password_reset", "Password Reset"),
        ("admin_password_reset", "Admin Password Reset"),
        ("change_password", "Change Password"),
        ("email_change", "Email Change"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_otps",
    )

    otp_hash = models.CharField(max_length=128)

    new_email = models.EmailField(
        null=True,
        blank=True,
    )

    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    verified_at= models.DateTimeField(null=True,blank=True)
    reset_token_hash =models.CharField(max_length=128,blank=True)
    reset_token_expires_at=models.DateTimeField(null=True,blank=True)

    purpose = models.CharField(
        max_length=30,
        choices=PURPOSE_CHOICE,
        default="email_verification",
    )

    def __str__(self):
        return f"OTP for {self.user.email}"