
# Python built-in modules
import secrets
from datetime import timedelta

# Django authentication
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password

# Django utilities
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone

# Django REST Framework
from rest_framework import serializers

# Simple JWT
from rest_framework_simplejwt.tokens import RefreshToken

# Project models
from myapp.models import User, EmailOTP

import re

# OTP utility
from myapp.utils import generate_and_send_otp
from django.contrib.auth import get_user_model

User = get_user_model()


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"]
        password = data["password"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid email or password"
            )

        from django.contrib.auth import authenticate

        user = authenticate(
            username=user.username,
            password=password
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password"
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive"
            )

        if not user.is_staff:
            raise serializers.ValidationError(
                "You do not have admin access"
            )

        data["user"] = user
        return data

    def create(self, validated_data):
        from rest_framework_simplejwt.tokens import RefreshToken

        user = validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return {
            "message": "Admin login successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class AdminUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "is_active",
            "is_blocked",
            "is_email_verified",
            "date_joined",
            "blocked_at",
        ]

class AdminForgotPasswordSerializer(serializers.Serializer):

    # Accept the admin email address.
    email = serializers.EmailField(
        error_messages={
            "required": "Please enter your email address.",
            "invalid": "Please enter a valid email address.",
        }
    )

    # Find an eligible admin account.
    def validate_email(self, value):

        value = value.strip().lower()

        self.user = User.objects.filter(
            email__iexact=value,
            is_staff=True,
            is_active=True,
            is_blocked=False,
        ).first()

        return value

    # Generate an admin-specific password-reset OTP.
    def create(self, validated_data):

        # Generate OTP only if an eligible admin account exists.
        if self.user:

            generate_and_send_otp(
                user=self.user,
                purpose="admin_password_reset",
            )

        # Return the same response whether the account exists or not.
        return {
            "message": (
                "If an eligible admin account exists, "
                "a password reset OTP will be sent."
            )
        }

class AdminVerifyPasswordResetOTPSerializer(serializers.Serializer):

    # Admin email address.
    email = serializers.EmailField()

    # Accept exactly six numeric digits.
    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "OTP must contain exactly 6 digits."
        },
    )

    def create(self, validated_data):

        email = validated_data["email"]
        otp = validated_data["otp"]

        otp_error = None
        reset_token = None

        with transaction.atomic():

            # Find and lock an eligible admin account.
            user = User.objects.select_for_update().filter(
                email__iexact=email,
                is_staff=True,
                is_active=True,
                is_blocked=False,
            ).first()

            if user is None:
                raise serializers.ValidationError({
                    "email": "Invalid admin account."
                })

            # Find the latest valid admin password-reset OTP.
            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="admin_password_reset",
                    is_used=False,
                    expires_at__gt=timezone.now(),
                )
                .order_by("-created_at", "-pk")
                .first()
            )

            if otp_record is None:
                raise serializers.ValidationError({
                    "otp": "Invalid or expired password reset OTP."
                })

            # Stop verification after five failed attempts.
            if otp_record.attempts >= 5:

                otp_record.is_used = True
                otp_record.save(update_fields=["is_used"])

                otp_error = "Maximum attempts reached. Request a new OTP."

            # Compare submitted OTP with the stored hash.
            elif not check_password(otp, otp_record.otp_hash):

                otp_record.attempts += 1

                if otp_record.attempts >= 5:

                    otp_record.is_used = True

                    otp_error = (
                        "Maximum attempts reached. Request a new OTP."
                    )

                else:

                    otp_error = (
                        f"Incorrect OTP. "
                        f"{5 - otp_record.attempts} attempts remaining."
                    )

                otp_record.save(
                    update_fields=["attempts", "is_used"]
                )

            else:

                # Generate a random, secure password-reset token.
                reset_token = secrets.token_urlsafe(32)

                # Store only the hashed reset token.
                otp_record.reset_token_hash = make_password(reset_token)

                # Reset token expires after 10 minutes.
                otp_record.reset_token_expires_at = (
                    timezone.now() + timedelta(minutes=10)
                )

                # Record successful OTP verification.
                otp_record.verified_at = timezone.now()

                otp_record.save(
                    update_fields=[
                        "reset_token_hash",
                        "reset_token_expires_at",
                        "verified_at",
                    ]
                )

        # Raise the OTP error after leaving the transaction.
        if otp_error:
            raise serializers.ValidationError({
                "otp": otp_error
            })

        return {
            "message": "Admin OTP verified successfully.",
            "reset_token": reset_token,
        }


class AdminResetPasswordSerializer(serializers.Serializer):

    # Admin email address.
    email = serializers.EmailField()

    # Token received after successful OTP verification.
    reset_token = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    # New password.
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    # Confirm the new password.
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    # Validate password strength and confirmation.
    def validate(self, data):

        password = data["new_password"]
        confirm_password = data["confirm_password"]

        if len(password) < 8:
            raise serializers.ValidationError({
                "new_password": "Password must contain at least 8 characters."
            })

        if not re.search(r"[A-Z]", password):
            raise serializers.ValidationError({
                "new_password": "Include at least one uppercase letter."
            })

        if not re.search(r"[a-z]", password):
            raise serializers.ValidationError({
                "new_password": "Include at least one lowercase letter."
            })

        if not re.search(r"[0-9]", password):
            raise serializers.ValidationError({
                "new_password": "Include at least one number."
            })

        if not re.search(r"[^A-Za-z0-9]", password):
            raise serializers.ValidationError({
                "new_password": "Include at least one special character."
            })

        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    def create(self, validated_data):

        email = validated_data["email"]
        reset_token = validated_data["reset_token"]
        new_password = validated_data["new_password"]

        with transaction.atomic():

            # Find and lock an eligible admin account.
            user = User.objects.select_for_update().filter(
                email__iexact=email,
                is_staff=True,
                is_active=True,
                is_blocked=False,
            ).first()

            if user is None:
                raise serializers.ValidationError({
                    "email": "Invalid admin account."
                })

            # Find the latest verified admin password-reset request.
            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="admin_password_reset",
                    is_used=False,
                    verified_at__isnull=False,
                    reset_token_expires_at__gt=timezone.now(),
                )
                .order_by("-created_at", "-pk")
                .first()
            )

            if otp_record is None:
                raise serializers.ValidationError({
                    "reset_token": "Invalid or expired reset token."
                })

            # Verify the reset token.
            if not check_password(
                reset_token,
                otp_record.reset_token_hash,
            ):
                raise serializers.ValidationError({
                    "reset_token": "Invalid or expired reset token."
                })

            # Apply Django's configured password validators.
            try:
                validate_password(new_password, user=user)

            except DjangoValidationError as error:
                raise serializers.ValidationError({
                    "new_password": error.messages
                })

            # Prevent reuse of the current password.
            if user.check_password(new_password):
                raise serializers.ValidationError({
                    "new_password": "You cannot reuse your current password."
                })

            # Update the admin password.
            user.set_password(new_password)
            user.save(update_fields=["password"])

            # Consume admin reset OTP records only.
            EmailOTP.objects.filter(
                user=user,
                purpose="admin_password_reset",
                is_used=False,
            ).update(
                is_used=True,
                reset_token_hash="",
                reset_token_expires_at=None,
            )

        return {
            "message": "Admin password reset successfully."
        }
