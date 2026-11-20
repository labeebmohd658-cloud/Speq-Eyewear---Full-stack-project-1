import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.exceptions import ValidationError


# Keep pending signup information in cache for one hour.
PENDING_SIGNUP_TTL = 60 * 60

# Generate a unique cache key for each signup email.
def get_signup_cache_key(email):
    return f"pending_signup:{email.strip().lower()}"


# Save pending signup information while preserving its expiry.
def save_pending_signup(email, pending_data):
    remaining_seconds = int(
        pending_data["pending_expires_at"] - timezone.now().timestamp()
    )

    if remaining_seconds <= 0:
        cache.delete(get_signup_cache_key(email))
        return

    cache.set(
        get_signup_cache_key(email),
        pending_data,
        timeout=remaining_seconds,
    )


# Generate and send the signup verification OTP.
def generate_signup_otp(email, user_data):

    now = timezone.now()

    # Generate a six-digit OTP.
    otp = f"{secrets.randbelow(1_000_000):06d}"

    # Hash the OTP before storing it.
    otp_hash = make_password(otp)

    expires_at = now + timedelta(
        minutes=settings.EMAIL_OTP_EXPIRY_MINUTES
    )

    # Store only the hashed password and hashed OTP.
    pending_data = {
        "full_name": user_data["full_name"],
        "email": email,
        "phone": user_data.get("phone", ""),
        "password_hash": user_data["password_hash"],
        "otp_hash": otp_hash,
        "otp_expires_at": expires_at.timestamp(),
        "attempts": 0,
        "requests": [now.timestamp()],
        "pending_expires_at": (
            now + timedelta(seconds=PENDING_SIGNUP_TTL)
        ).timestamp(),
    }

    cache.set(
        get_signup_cache_key(email),
        pending_data,
        timeout=PENDING_SIGNUP_TTL,
    )

    try:
        send_mail(
            subject="SpeQ Eyewear - Verification OTP",
            message=(
                f"Your OTP is {otp}.\n"
                f"It is valid for "
                f"{settings.EMAIL_OTP_EXPIRY_MINUTES} minutes.\n"
                "Do not share this code with anyone."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

    except Exception:
        cache.delete(get_signup_cache_key(email))
        raise

    return expires_at


# Resend OTP for a pending signup.
def resend_signup_otp(email):

    key = get_signup_cache_key(email)
    pending_data = cache.get(key)

    if not pending_data:
        raise ValidationError({
            "email": "No pending signup found. Please sign up again."
        })

    now = timezone.now()
    current_timestamp = now.timestamp()

    # Keep only OTP requests made within the last hour.
    recent_requests = [
        timestamp
        for timestamp in pending_data["requests"]
        if current_timestamp - timestamp < 3600
    ]

    # Maximum five requests per hour, including initial signup.
    if len(recent_requests) >= 5:
        raise ValidationError({
            "email": "OTP request limit reached. Try again later."
        })

    # Enforce the 60-second resend cooldown.
    if recent_requests and (
        current_timestamp - recent_requests[-1] < 60
    ):
        raise ValidationError({
            "email": "Please wait 60 seconds before requesting another OTP."
        })

    # Generate a new six-digit OTP.
    otp = f"{secrets.randbelow(1_000_000):06d}"

    pending_data["otp_hash"] = make_password(otp)
    pending_data["otp_expires_at"] = (
        now + timedelta(
            minutes=settings.EMAIL_OTP_EXPIRY_MINUTES
        )
    ).timestamp()

    # Reset attempts for the new OTP.
    pending_data["attempts"] = 0

    recent_requests.append(current_timestamp)
    pending_data["requests"] = recent_requests

    save_pending_signup(email, pending_data)

    try:
        send_mail(
            subject="SpeQ Eyewear - Verification OTP",
            message=(
                f"Your OTP is {otp}.\n"
                f"It is valid for "
                f"{settings.EMAIL_OTP_EXPIRY_MINUTES} minutes.\n"
                "Do not share this code with anyone."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

    except Exception:
        # Do not leave an OTP active if the email could not be sent.
        pending_data["otp_hash"] = None
        save_pending_signup(email, pending_data)
        raise

    return {
        "message": "A new OTP has been sent to your email."
    }