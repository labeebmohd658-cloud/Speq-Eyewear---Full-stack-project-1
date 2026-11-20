from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.utils import timezone  # Used to get the current time
from ..models import EmailOTP,Address,User
from ..utils import generate_and_send_otp
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.core import signing
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import password_validation
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from django.conf import settings
from django.db import transaction,IntegrityError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.hashers import check_password,make_password
from django.contrib.auth import get_user_model
import re
import secrets
from datetime import timedelta 
from .signup_otp import (
    generate_signup_otp,
    get_signup_cache_key,
    save_pending_signup,
    resend_signup_otp,
)
from django.core.cache import cache



# Gets the active User model configured in Django
User = get_user_model()


class SignupSerializer(serializers.Serializer):

    full_name = serializers.CharField()

    email = serializers.EmailField()

    phone = serializers.CharField(
        required=False,
        allow_blank=True
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    confirm_password = serializers.CharField(
        write_only=True
    )

    # Validate full name
    def validate_full_name(self, value):

        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Full name must contain at least 3 characters."
            )

        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError(
                "Full name can contain only letters and spaces."
            )

        return value

    # Validate email
    def validate_email(self, value):

        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    # Validate phone
    def validate_phone(self, value):

        value = value.strip()

        if value and not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError(
                "Phone number must contain exactly 10 digits."
            )

        return value

    # Validate password strength
    def validate_password(self, value):

        errors = []

        if not re.search(r"[A-Z]", value):
            errors.append(
                "Password must contain at least one uppercase letter."
            )

        if not re.search(r"[a-z]", value):
            errors.append(
                "Password must contain at least one lowercase letter."
            )

        if not re.search(r"\d", value):
            errors.append(
                "Password must contain at least one number."
            )

        if not re.search(r"[^A-Za-z0-9]", value):
            errors.append(
                "Password must contain at least one special character."
            )

        if errors:
            raise serializers.ValidationError(errors)

        return value

    # Validate password confirmation
    def validate(self, data):

        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    # Store pending signup and send OTP
    def create(self, validated_data):

        validated_data.pop("confirm_password")

        password = validated_data.pop("password")

        email = validated_data["email"]

        # Hash password before temporary storage.
        validated_data["password_hash"] = make_password(password)

        # Generate OTP and store pending signup in cache.
        self.expires_at = generate_signup_otp(
            email=email,
            user_data=validated_data
        )

        # Return email instead of a User instance.
        return {
            "email": email
        }


# ==========================================
# CUSTOMER VERIFY OTP SERIALIZER
# ==========================================

class VerifyOTPSerializer(serializers.Serializer):

    email = serializers.EmailField()

    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "OTP must contain exactly 6 digits."
        }
    )

    def create(self, validated_data):

        email = validated_data["email"].strip().lower()

        otp = validated_data["otp"]

        # Retrieve pending signup from cache.
        cache_key = get_signup_cache_key(email)

        pending_data = cache.get(cache_key)

        if not pending_data:
            raise serializers.ValidationError({
                "email": "No pending signup found. Please sign up again."
            })

        # Check OTP expiry.
        if timezone.now().timestamp() > pending_data["otp_expires_at"]:
            raise serializers.ValidationError({
                "otp": "OTP has expired. Please request a new OTP."
            })

        # Check whether an OTP is available.
        if not pending_data.get("otp_hash"):
            raise serializers.ValidationError({
                "otp": "Please request a new OTP."
            })

        # Check maximum attempts.
        if pending_data["attempts"] >= 5:
            raise serializers.ValidationError({
                "otp": "Maximum attempts reached. Request a new OTP."
            })

        # Verify submitted OTP.
        if not check_password(
            otp,
            pending_data["otp_hash"]
        ):

            pending_data["attempts"] += 1

            if pending_data["attempts"] >= 5:

                pending_data["otp_hash"] = None

                error_message = (
                    "Maximum attempts reached. Request a new OTP."
                )

            else:

                error_message = (
                    f"Incorrect OTP. "
                    f"{5 - pending_data['attempts']} attempts remaining."
                )

            save_pending_signup(email, pending_data)

            raise serializers.ValidationError({
                "otp": error_message
            })

        # Create User only after successful OTP verification.
        try:

            with transaction.atomic():

                # Check email uniqueness again.
                if User.objects.filter(
                    email__iexact=email
                ).exists():

                    raise serializers.ValidationError({
                        "email": "An account with this email already exists."
                    })

                user = User(
                    full_name=pending_data["full_name"],
                    email=email,
                    phone=pending_data.get("phone", ""),
                    username=email,
                    is_active=True,
                    is_email_verified=True,
                )

                # Password is already hashed.
                user.password = pending_data["password_hash"]

                user.save()

        except IntegrityError:

            raise serializers.ValidationError({
                "email": "An account with this email already exists."
            })

        # Remove pending signup after successful account creation.
        cache.delete(cache_key)

        return user


# ==========================================
# CUSTOMER RESEND OTP SERIALIZER
# ==========================================

class ResendOTPSerializer(serializers.Serializer):

    email = serializers.EmailField()

    # Validate pending signup email.
    def validate_email(self, value):

        email = value.strip().lower()

        # Check whether an account already exists.
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        # Check whether pending signup exists.
        if not cache.get(get_signup_cache_key(email)):
            raise serializers.ValidationError(
                "No pending signup found. Please sign up again."
            )

        return email

    # Generate and send a new OTP.
    def create(self, validated_data):

        email = validated_data["email"]

        return resend_signup_otp(email)




class ForgotPasswordSerializer(serializers.Serializer):

    # Accept the email address for password recovery.
    email = serializers.EmailField(
        error_messages={
            "required": "Please enter your email address.",
            "invalid": "Please enter a valid email address.",
        }
    )

    # Validate the email and check the associated account.
    def validate_email(self, value):

        value = value.strip().lower()

        try:
            user = User.objects.get(email__iexact=value)

        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No account found with this email."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive. Please contact support."
            )

        if user.is_blocked:
            raise serializers.ValidationError(
                "Your account is blocked. Please contact support."
            )

        self.user = user

        return value

    # Generate and send the password-reset OTP.
    def create(self, validated_data):

        # Generate a new OTP and get its expiry timestamp.
        expires_at = generate_and_send_otp(
            self.user,
            purpose="password_reset"
        )

        return {
            "message": "A new password reset OTP has been sent to your email.",
            "email": self.user.email,
            "expires_at": expires_at,
        }
    
class ResendPasswordResetOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No account found with this email address."
            )

        if not user.is_email_verified:
            raise serializers.ValidationError(
                "Please verify your email before resetting your password."
            )

        if not user.is_active or user.is_blocked:
            raise serializers.ValidationError(
                "This account cannot reset its password."
            )

        self.user = user
        return value

    def create(self, validated_data):

        # Generate a new OTP and get its expiry timestamp.
        expires_at = generate_and_send_otp(
            self.user,
            purpose="password_reset"
        )

        return {
            "message": "A new password reset OTP has been sent to your email.",
            "email": self.user.email,
            "expires_at": expires_at,
        }


class VerifyPasswordResetOTPSerializer(serializers.Serializer):

    email = serializers.EmailField()

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

            user = User.objects.select_for_update().filter(
                email__iexact=email,
                is_active=True,
            ).first()

            if user is None:
                raise serializers.ValidationError({
                    "email": "Invalid account."
                })

            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="password_reset",
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

            if otp_record.attempts >= 5:

                otp_record.is_used = True
                otp_record.save(update_fields=["is_used"])

                otp_error = (
                    "Maximum attempts reached. Request a new OTP."
                )

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

                reset_token = secrets.token_urlsafe(32)
                reset_token_expires_at = None

                otp_record.reset_token_hash = make_password(
                    reset_token
                )

                reset_token_expires_at = (
                    timezone.now() + timedelta(minutes=10)
                )

                otp_record.reset_token_expires_at = reset_token_expires_at

                otp_record.verified_at = timezone.now()

                otp_record.save(
                    update_fields=[
                        "reset_token_hash",
                        "reset_token_expires_at",
                        "verified_at",
                    ]
                )

        if otp_error:
            raise serializers.ValidationError({
                "otp": otp_error
            })

        return {
         "message": "OTP verified successfully.",
        "email": user.email,
        "reset_token": reset_token,
        "reset_token_expires_at": reset_token_expires_at,
        }







class ResetPasswordSerializer(serializers.Serializer):

    # Email associated with the password-reset request.
    email = serializers.EmailField()

    # Secure token returned after successful OTP verification.
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

    # Password confirmation.
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, data):

        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    def create(self, validated_data):

        email = validated_data["email"]
        reset_token = validated_data["reset_token"]
        new_password = validated_data["new_password"]

        with transaction.atomic():

            # Lock the user account.
            user = User.objects.select_for_update().filter(
                email__iexact=email,
                is_active=True,
            ).first()

            if user is None:
                raise serializers.ValidationError({
                    "email": "Invalid account."
                })

            # Find the latest verified, unused reset request.
            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="password_reset",
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

            # Compare the submitted token with its stored hash.
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

            # Update the password.
            user.set_password(new_password)
            user.save(update_fields=["password"])

            # Consume all unused password-reset OTP records.
            EmailOTP.objects.filter(
                user=user,
                purpose="password_reset",
                is_used=False,
            ).update(
                is_used=True,
                reset_token_hash="",
                reset_token_expires_at=None,
            )

        return {
            "message": "Password reset successfully."
        }



class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"]
        password = data["password"]

        # Step 1: Find the user using email.
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        # Step 2: Check password without authenticate().
        # This allows us to identify inactive, unverified accounts.
        if not user.check_password(password):
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        # Step 3: Reject blocked accounts.
        if user.is_blocked:
            raise serializers.ValidationError({
                "detail": "Your account has been blocked. Please contact support."
            })

        # Step 4: Require email verification.
        if not user.is_email_verified:
            raise serializers.ValidationError({
                "email": "Please verify your email before logging in."
            })

        # Step 5: Reject other inactive accounts.
        if not user.is_active:
            raise serializers.ValidationError({
                "detail": "Your account is inactive. Please contact support."
            })

        # Step 6: Pass the validated user to create().
        data["user"] = user

        return data

    def create(self, validated_data):
        user = validated_data["user"]

        # Generate JWT tokens only after all checks pass.
        refresh = RefreshToken.for_user(user)

        return {
            "message": "Login successful",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }



class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "profile_picture",
            "is_email_verified",
        ]
        read_only_fields = [
            "id","email","is_email_verified",
        ]

    def validate_full_name(self, value):
        # Remove unnecessary spaces from the beginning and end.
        value = value.strip()

        # Check whether the name is empty.
        if not value:
            raise serializers.ValidationError(
                "Full name is required."
            )

        # Check minimum name length.
        if len(value) < 3:
            raise serializers.ValidationError(
                "Full name must contain at least 3 characters."
            )

        # Check maximum name length.
        if len(value) > 150:
            raise serializers.ValidationError(
                "Full name cannot exceed 150 characters."
            )

        # Allow letters, spaces, apostrophes and hyphens.
        import re

        if not re.fullmatch(r"[^\W\d_]+(?:[ '\-][^\W\d_]+)*", value, re.UNICODE):
            raise serializers.ValidationError(
                "Full name can contain only letters, spaces, apostrophes and hyphens."
            )

        return value
    
    def validate_phone(self, value):
        # Remove spaces from the beginning and end.
        value = value.strip()

        # Phone number is optional.
        if not value:
            return value

        # Check whether the phone number contains exactly 10 digits.
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                "Phone number must contain exactly 10 digits."
            )

        return value

class LogoutSerializer(serializers.Serializer):
        refresh = serializers.CharField()

        def validate(self,data):
            try:
                token = RefreshToken(data["refresh"])
                token.blacklist()
            except Exception:
                raise serializers.ValidationError(
                    {"refresh":"Invalid or expired refresh token"}
                )
            return data


class ChangePasswordOTPSerializer(serializers.Serializer):

    # Accepts the six-digit OTP.
    otp = serializers.CharField(min_length=6, max_length=6)

    def create(self, validated_data):

        # Get the currently authenticated user.
        user = self.context["request"].user

        otp_error = None

        with transaction.atomic():

            # Find the latest valid password-change OTP.
            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="change_password",
                    is_used=False,
                    expires_at__gt=timezone.now(),
                )
                .order_by("-created_at", "-pk")
                .first()
            )

            if otp_record is None:
                raise serializers.ValidationError({
                    "otp": "Invalid or expired OTP."
                })

            # Check the maximum attempt limit.
            if otp_record.attempts >= 5:
                otp_record.is_used = True
                otp_record.save(update_fields=["is_used"])
                otp_error = "Maximum attempts reached. Request a new OTP."

            # Verify the submitted OTP against its hash.
            elif not check_password(
                validated_data["otp"],
                otp_record.otp_hash,
            ):
                otp_record.attempts += 1

                if otp_record.attempts >= 5:
                    otp_record.is_used = True
                    otp_error = "Maximum attempts reached. Request a new OTP."
                else:
                    otp_error = (
                        f"Incorrect OTP. "
                        f"{5 - otp_record.attempts} attempts remaining."
                    )

                otp_record.save(
                    update_fields=["attempts", "is_used"]
                )

            else:
                # Mark the OTP as used after successful verification.
                otp_record.is_used = True
                otp_record.save(update_fields=["is_used"])

        # Raise errors after committing the transaction.
        if otp_error:
            raise serializers.ValidationError({
                "otp": otp_error
            })

        return user




class SetNewPasswordSerializer(serializers.Serializer):
    # Accepts the signed password-reset token.
    reset_token = serializers.CharField()

    # Accepts the new password.
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    # Validates the signed token and identifies the user.
    def validate(self, data):

        try:
            token_data = signing.loads(
                data["reset_token"],
                salt="change-password",
                max_age=600,
            )

        except signing.BadSignature:
            raise serializers.ValidationError({
                "reset_token": "Invalid or expired reset token."
            })

        if token_data.get("purpose") != "change_password":
            raise serializers.ValidationError({
                "reset_token": "Invalid reset token purpose."
            })

        # Retrieve the user before checking the password hash.
        try:
            user = User.objects.get(
                id=token_data["user_id"]
            )

        except (User.DoesNotExist, KeyError, TypeError):
            raise serializers.ValidationError({
                "reset_token": "Invalid reset token."
            })

        # Check whether the account is allowed to change its password.
        if not user.is_active or user.is_blocked:
            raise serializers.ValidationError({
                "reset_token": "This account cannot reset its password."
            })

        # Prevent reuse of an old reset token.
        if token_data.get("password_hash") != user.password:
            raise serializers.ValidationError({
                "reset_token": "This reset token has already been used or is invalid."
            })

        # Apply Django password validation.
        validate_password(
            data["new_password"],
            user=user,
        )

        data["user"] = user

        return data

    # Changes the password after successful validation.
    def save(self, **kwargs):

        with transaction.atomic():

            # Lock the user before updating the password.
            user = User.objects.select_for_update().get(
                id=self.validated_data["user"].id
            )

            # Check the old password hash again to prevent token reuse.
            token_data = signing.loads(
                self.validated_data["reset_token"],
                salt="change-password",
                max_age=600,
            )

            if token_data.get("password_hash") != user.password:
                raise serializers.ValidationError({
                    "reset_token": "This reset token has already been used or is invalid."
                })

            # Hash and save the new password.
            user.set_password(
                self.validated_data["new_password"]
            )

            user.save(update_fields=["password"])

        return user


import re
from rest_framework import serializers


class AddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = Address
        fields = [
            "id",
            "full_name",
            "phone",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user = validated_data["user"]

        with transaction.atomic():
            # Lock the user row to prevent concurrent default updates.
            User.objects.select_for_update().get(pk=user.pk)

            has_address = Address.objects.filter(user=user).exists()

            # The first address must always become the default.
            make_default = (
                validated_data.get("is_default", False)
                or not has_address
            )

            # Remove the default status from other addresses.
            if make_default:
                Address.objects.filter(user=user).update(
                    is_default=False
                )

            validated_data["is_default"] = make_default

            return Address.objects.create(**validated_data)

    def update(self, instance, validated_data):
        user = instance.user

        with transaction.atomic():
            # Lock the user row during the update.
            User.objects.select_for_update().get(pk=user.pk)

            # Get the requested default status.
            # If is_default is not provided, keep the existing value.
            make_default = validated_data.get(
                "is_default",
                instance.is_default
            )

            # Check whether another address exists.
            has_other_address = Address.objects.filter(
                user=user
            ).exclude(pk=instance.pk).exists()

            # The only existing address must remain the default.
            if not make_default and instance.is_default:
                if not has_other_address:
                    make_default = True

            # If this address becomes the default,
            # remove default status from all other addresses.
            if make_default:
                Address.objects.filter(
                    user=user
                ).exclude(
                    pk=instance.pk
                ).update(is_default=False)

            # Update the remaining address fields.
            for field, value in validated_data.items():
                setattr(instance, field, value)

            instance.is_default = make_default
            instance.save()

            # If the current default is being disabled,
            # promote another address.
            if not make_default and instance.is_default is False:
                another_address = Address.objects.filter(
                    user=user
                ).exclude(
                    pk=instance.pk
                ).order_by("-created_at", "-id").first()

                if another_address and not Address.objects.filter(
                    user=user,
                    is_default=True
                ).exists():
                    another_address.is_default = True
                    another_address.save(
                        update_fields=["is_default"]
                    )

            return instance

    def validate_full_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Full name must contain at least 3 characters."
            )

        if not re.fullmatch(r"[A-Za-z][A-Za-z\s'-]*", value):
            raise serializers.ValidationError(
                "Full name can contain only letters, spaces, hyphens and apostrophes."
            )

        if len(re.sub(r"[^A-Za-z]", "", value)) < 3:
            raise serializers.ValidationError(
                "Full name must contain at least 3 letters."
            )

        return value

    def validate_phone(self, value):
        value = value.strip()

        if not re.fullmatch(r"[6-9]\d{9}", value):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number."
            )

        return value

    def validate_address_line1(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Address line 1 is required."
            )

        return value

    def validate_city(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "City is required."
            )

        return value

    def validate_state(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "State is required."
            )

        return value

    def validate_postal_code(self, value):
        value = value.strip()

        if not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError(
                "PIN code must contain exactly 6 digits."
            )

        return value

    def validate_country(self, value):
        if value.strip().lower() != "india":
            raise serializers.ValidationError(
                "Currently, delivery is available only within India."
            )

        return "India"

# Serializer to handle Google Login authentication

class GoogleLoginSerializer(serializers.Serializer):

    # Accept the Google ID token from the React frontend.
    credential = serializers.CharField(write_only=True)

    # Validate the Google token and identify the user.
    def validate(self, data):

        try:
            # Verify the Google ID token using Google's verification method.
            google_user = id_token.verify_oauth2_token(
                data["credential"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

        # Handle an invalid Google token.
        except ValueError:
            raise serializers.ValidationError({
                "credential": "Invalid Google token."
            })

        # Extract the user's email from the Google token.
        email = google_user.get("email")

        # Check Google's email verification status.
        email_verified = google_user.get("email_verified", False)

        # Extract the user's name.
        name = google_user.get("name", "")

        # Require a verified Google email.
        if not email or email_verified is not True:
            raise serializers.ValidationError({
                "credential": "A verified Google email is required."
            })

        # Find an existing SpeQ user using the Google email.
        user = User.objects.filter(email__iexact=email).first()

        # Create a new account if the user does not exist.
        if user is None:
            user = User.objects.create_user(
                username=email,
                email=email,
                full_name=name or email,
                is_email_verified=True,
            )

        # Verify the email of an existing account if necessary.
        elif not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        # Reject inactive accounts.
        if not user.is_active:
            raise serializers.ValidationError({
                "detail": "This account is inactive."
            })

        # Reject blocked accounts.
        if user.is_blocked:
            raise serializers.ValidationError({
                "detail": "This account is blocked."
            })

        # Prevent administrators from using customer Google login.
        if user.is_staff:
            raise serializers.ValidationError({
                "detail": "Please use the admin login page."
            })

        # Store the authenticated user for JWT generation.
        data["user"] = user

        return data

    # Generate JWT tokens after successful validation.
    def create(self, validated_data):

        # Retrieve the authenticated user.
        user = validated_data["user"]

        # Generate a refresh token.
        refresh = RefreshToken.for_user(user)

        # Return the login response.
        return {
            "message": "Google login successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class EmailChangeRequestSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        user = self.context["request"].user

        # Normalize the email address.
        value = value.strip().lower()

        # Reject the current email address.
        if value.lower() == user.email.lower():
            raise serializers.ValidationError(
                "This is already your current email address."
            )

        # Check whether another account uses this email.
        if User.objects.filter(email__iexact=value).exclude(
            pk=user.pk
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def create(self, validated_data):
        user = self.context["request"].user

        if not user.is_active or user.is_blocked:
            raise serializers.ValidationError(
                "Your account cannot change its email."
            )

        if not user.is_email_verified:
            raise serializers.ValidationError(
                "Please verify your current email first."
            )

        new_email = validated_data["new_email"]

        generate_and_send_otp(
            user,
            purpose="email_change",
            new_email=new_email,
        )

        return {
            "message": "Email change OTP sent successfully."
        }


class EmailChangeOTPVerifySerializer(serializers.Serializer):
    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "OTP must contain exactly 6 digits."
        },
    )

    def create(self, validated_data):
        user = self.context["request"].user

        if not user.is_active or user.is_blocked:
            raise serializers.ValidationError(
                "Your account cannot change its email."
            )

        otp_error = None
        new_email = None

        with transaction.atomic():
            otp_record = (
                EmailOTP.objects.select_for_update()
                .filter(
                    user=user,
                    purpose="email_change",
                    is_used=False,
                    expires_at__gt=timezone.now(),
                )
                .order_by("-created_at", "-pk")
                .first()
            )

            if otp_record is None:
                raise serializers.ValidationError({
                    "otp": "Invalid or expired OTP."
                })

            if otp_record.attempts >= 5:
                otp_record.is_used = True
                otp_record.save(update_fields=["is_used"])
                otp_error = "Maximum attempts reached. Request a new OTP."

            elif not check_password(
                validated_data["otp"],
                otp_record.otp_hash,
            ):
                otp_record.attempts += 1

                if otp_record.attempts >= 5:
                    otp_record.is_used = True
                    otp_error = "Maximum attempts reached. Request a new OTP."
                else:
                    otp_error = (
                        f"Incorrect OTP. "
                        f"{5 - otp_record.attempts} attempts remaining."
                    )

                otp_record.save(
                    update_fields=["attempts", "is_used"]
                )

            else:
                new_email = otp_record.new_email

                if not new_email:
                    raise serializers.ValidationError({
                        "otp": "Invalid email-change request."
                    })

                if User.objects.filter(
                    email__iexact=new_email
                ).exclude(pk=user.pk).exists():
                    otp_record.is_used = True
                    otp_record.save(update_fields=["is_used"])
                    otp_error = "This email address is already registered."
                else:
                    otp_record.is_used = True
                    otp_record.save(update_fields=["is_used"])

        if otp_error:
            raise serializers.ValidationError({"otp": otp_error})

        return {
            "user": user,
            "new_email": new_email,
        }


class ConfirmEmailChangeSerializer(serializers.Serializer):
    reset_token = serializers.CharField()

    def validate(self, data):
        try:
            token_data = signing.loads(
                data["reset_token"],
                salt="email-change",
                max_age=600,
            )
        except signing.BadSignature:
            raise serializers.ValidationError({
                "reset_token": "Invalid or expired email-change token."
            })

        try:
            user = User.objects.get(id=token_data["user_id"])
        except (User.DoesNotExist, KeyError, TypeError):
            raise serializers.ValidationError({
                "reset_token": "Invalid email-change token."
            })

        if token_data.get("purpose") != "email_change":
            raise serializers.ValidationError({
                "reset_token": "Invalid token purpose."
            })

        if not user.is_active or user.is_blocked:
            raise serializers.ValidationError({
                "reset_token": "This account cannot change its email."
            })

        # Prevent reuse of an already-used token.
        if token_data.get("current_email") != user.email:
            raise serializers.ValidationError({
                "reset_token": "This token has already been used or is invalid."
            })

        new_email = token_data.get("new_email")

        if not new_email:
            raise serializers.ValidationError({
                "reset_token": "Invalid new email address."
            })

        if User.objects.filter(
            email__iexact=new_email
        ).exclude(pk=user.pk).exists():
            raise serializers.ValidationError({
                "new_email": "This email address is already registered."
            })

        data["user"] = user
        data["new_email"] = new_email

        return data

    def save(self, **kwargs):
        with transaction.atomic():
            user = User.objects.select_for_update().get(
                id=self.validated_data["user"].id
            )

            try:
                token_data = signing.loads(
                    self.validated_data["reset_token"],
                    salt="email-change",
                    max_age=600,
                )
            except signing.BadSignature:
                raise serializers.ValidationError({
                    "reset_token": "Invalid or expired email-change token."
                })

            if (
                token_data.get("purpose") != "email_change"
                or token_data.get("current_email") != user.email
                or token_data.get("new_email") != self.validated_data["new_email"]
            ):
                raise serializers.ValidationError({
                    "reset_token": "This token has already been used or is invalid."
                })

            if not user.is_active or user.is_blocked:
                raise serializers.ValidationError({
                    "reset_token": "This account cannot change its email."
                })
            # to check the mail
            if User.objects.filter(
                email__iexact=self.validated_data["new_email"]
            ).exclude(pk=user.pk).exists():
                raise serializers.ValidationError({
                    "new_email": "This email address is already registered."
                })

            user.email = self.validated_data["new_email"]
            user.username = user.email
            user.is_email_verified = True

            user.save(
                update_fields=[
                    "email",
                    "username",
                    "is_email_verified",
                ]
            )

            EmailOTP.objects.filter(
                user=user,
                purpose="email_change",
                is_used=False,
            ).update(is_used=True)


        return user



