
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import EmailOTP


def generate_and_send_otp(
    user,
    purpose="email_verification",
    new_email=None,
):
    now = timezone.now()

    # Email-change OTP must have a new email address.
    if purpose == "email_change" and not new_email:
        raise ValidationError({
            "new_email": "New email address is required."
        })

    # Decide where the OTP should be sent.
    recipient_email = new_email or user.email

    # Get OTP requests created within the last hour.
    recent_otps = EmailOTP.objects.filter(
        user=user,
        purpose=purpose,
        created_at__gte=now - timedelta(hours=1),
    )

    # Maximum five OTP requests per hour.
    if recent_otps.count() >= 5:
        raise ValidationError({
            "email": "OTP request limit reached. Try again later."
        })

    # Check the 60-second resend cooldown.
    last_otp = recent_otps.order_by("-created_at").first()

    if last_otp and now < last_otp.created_at + timedelta(seconds=60):
        raise ValidationError({
            "email": "Please wait 60 seconds before requesting another OTP."
        })

    # Generate a six-digit OTP.
    otp = f"{secrets.randbelow(1_000_000):06d}"

    # Hash the OTP before storing it.
    otp_hash = make_password(otp)

    with transaction.atomic():

        # Invalidate previous unused OTPs.
        EmailOTP.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False,
        ).update(is_used=True)

        # Save the new OTP and capture the database object.
        otp_record = EmailOTP.objects.create(
            user=user,
            otp_hash=otp_hash,
            purpose=purpose,
            new_email=new_email,
            expires_at=now + timedelta(
                minutes=settings.EMAIL_OTP_EXPIRY_MINUTES
            ),
        )

        # Send OTP to the correct email address.
        send_mail(
            subject="SpeQ Eyewear - Verification OTP",
            message=(
                f"Your OTP is {otp}.\n"
                f"It is valid for {settings.EMAIL_OTP_EXPIRY_MINUTES} minutes.\n"
                "Do not share this code with anyone."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )

    # Return the original expiry timestamp.
    return otp_record.expires_at
