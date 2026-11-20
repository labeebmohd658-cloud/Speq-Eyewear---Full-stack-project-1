from datetime import timedelta
import traceback

from django.core import signing
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed

from ..utils import generate_and_send_otp
from ..cloudinary_utils import upload_profile_picture
from ..models import Address

from .serializers import (
    SignupSerializer,
    VerifyOTPSerializer,
    ResendOTPSerializer,
    LoginSerializer,
    ProfileSerializer,
    LogoutSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordOTPSerializer,
    AddressSerializer,
    GoogleLoginSerializer,
    SetNewPasswordSerializer,
    EmailChangeRequestSerializer,
    EmailChangeOTPVerifySerializer,
    ConfirmEmailChangeSerializer,
    VerifyPasswordResetOTPSerializer,
    ResendPasswordResetOTPSerializer,
)

User = get_user_model()


class SignupView(generics.CreateAPIView):

    serializer_class = SignupSerializer

    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response({
            "message": "Signup successful. Please verify your email.",
            "email": result["email"],
            "expires_at": serializer.expires_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


# ==========================================
# CUSTOMER VERIFY OTP VIEW
# ==========================================

class VerifyOTPView(generics.GenericAPIView):

    serializer_class = VerifyOTPSerializer

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response({
            "message": "Email verified successfully.",
            "email": user.email,
        }, status=status.HTTP_200_OK)


# ==========================================
# CUSTOMER RESEND OTP VIEW
# ==========================================

class ResendOTPView(generics.GenericAPIView):

    serializer_class = ResendOTPSerializer

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK
        )

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfilePictureUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get("profile_picture")

        if not image:
            return Response(
                {"error": "Please select an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 2 * 1024 * 1024:
            return Response(
                {"error": "Image size must not exceed 2 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = ["image/jpeg", "image/png", "image/webp"]

        if image.content_type not in allowed_types:
            return Response(
                {"error": "Only JPG, PNG and WEBP images are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            image_url = upload_profile_picture(image)
            user = request.user
            user.profile_picture = image_url
            user.save(update_fields=["profile_picture"])

            return Response({
                "message": "Profile picture uploaded successfully.",
                "profile_picture": image_url,
            }, status=status.HTTP_200_OK)

        except Exception:
            print("PROFILE PICTURE UPLOAD ERROR:")
            traceback.print_exc()

            return Response(
                {"error": "Image upload failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class VerifyPasswordResetOTPView(generics.GenericAPIView):
    serializer_class = VerifyPasswordResetOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class ResendPasswordResetOTPView(generics.GenericAPIView):
    serializer_class = ResendPasswordResetOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class ChangePasswordOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.is_active or user.is_blocked:
            return Response(
                {"message": "Your account cannot change its password."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_email_verified:
            return Response(
                {"message": "Please verify your email first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = generate_and_send_otp(
            user,
            purpose="change_password",
        )

        return Response({
            "message": "Change password OTP sent successfully.",
            "email": user.email,
            "expires_at": expires_at.isoformat(),
        }, status=status.HTTP_200_OK)


class ChangePasswordOTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordOTPSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        reset_token = signing.dumps(
            {
                "user_id": user.id,
                "purpose": "change_password",
                "password_hash": user.password,
            },
            salt="change-password",
        )

        # This matches the signed token's 10-minute validity.
        reset_token_expires_at = (
            timezone.now() + timedelta(seconds=600)
        )

        return Response({
            "message": "OTP verified successfully.",
            "reset_token": reset_token,
            "reset_token_expires_at": reset_token_expires_at.isoformat(),
        }, status=status.HTTP_200_OK)


class SetNewPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        user = instance.user
        User.objects.select_for_update().get(pk=user.pk)

        was_default = instance.is_default
        instance.delete()

        if was_default:
            next_address = Address.objects.filter(
                user=user
            ).order_by("-created_at", "-id").first()

            if next_address:
                next_address.is_default = True
                next_address.save(update_fields=["is_default"])


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class EmailChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EmailChangeRequestSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.save(),
            status=status.HTTP_200_OK,
        )


class EmailChangeOTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EmailChangeOTPVerifySerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        reset_token = signing.dumps(
            {
                "user_id": result["user"].id,
                "purpose": "email_change",
                "new_email": result["new_email"],
                "current_email": result["user"].email,
            },
            salt="email-change",
        )

        reset_token_expires_at = (
            timezone.now() + timedelta(seconds=600)
        )

        return Response({
            "message": "OTP verified successfully.",
            "reset_token": reset_token,
            "reset_token_expires_at": reset_token_expires_at.isoformat(),
        }, status=status.HTTP_200_OK)


class ConfirmEmailChangeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConfirmEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            "message": "Email address changed successfully.",
            "email": user.email,
        }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            raise InvalidToken("Refresh token is required.")

        try:
            token = RefreshToken(refresh_token)
            user_id = token.payload.get("user_id")
            user = User.objects.get(id=user_id)

            if user.is_blocked or not user.is_active:
                raise AuthenticationFailed(
                    "Your account has been blocked. Please log in again."
                )

        except User.DoesNotExist:
            raise InvalidToken("User does not exist.")

        except (ValueError, TypeError):
            raise InvalidToken("Invalid refresh token.")

        return super().post(request, *args, **kwargs)