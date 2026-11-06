
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core import signing
from ..utils import generate_and_send_otp
from rest_framework.parsers import MultiPartParser, FormParser
from ..cloudinary_utils import upload_profile_picture
from django.db import transaction
import traceback
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()


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
from ..models import Address


class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


class VerifyOTPView(generics.GenericAPIView):
    serializer_class = VerifyOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )


class ResendOTPView(generics.GenericAPIView):
    serializer_class = ResendOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response(result, status=status.HTTP_200_OK)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            print("LOGIN VALIDATION ERROR:", serializer.errors)
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
        )

        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)

    # def post(self, request, *args, **kwargs):
    #     serializer = self.get_serializer(data=request.data)
    #     serializer.is_valid(raise_exception=True)
    #     result = serializer.save()

    #     return Response(result, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class ProfilePictureUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Get the uploaded image from the request.
        image = request.FILES.get("profile_picture")

        # Check whether an image was provided.
        if not image:
            return Response(
                {"error": "Please select an image."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate image file size (maximum 2 MB).
        if image.size > 2 * 1024 * 1024:
            return Response(
                {"error": "Image size must not exceed 2 MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate image format.
        allowed_types = ["image/jpeg", "image/png", "image/webp"]

        if image.content_type not in allowed_types:
            return Response(
                {"error": "Only JPG, PNG and WEBP images are allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Upload the image to Cloudinary.
            image_url = upload_profile_picture(image)

            # Save the returned URL in the current user's profile.
            user = request.user
            user.profile_picture = image_url
            user.save(update_fields=["profile_picture"])

            return Response(
                {
                    "message": "Profile picture uploaded successfully.",
                    "profile_picture": image_url
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            print("PROFILE PICTURE UPLOAD ERROR:", repr(e))
            traceback.print_exc()

            return Response(
                {"error": "Image upload failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        result = serializer.save()

        return Response(result, status=status.HTTP_200_OK)

class VerifyPasswordResetOTPView(generics.GenericAPIView):

    serializer_class = VerifyPasswordResetOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

class ResendPasswordResetOTPView(generics.CreateAPIView):
    serializer_class = ResendPasswordResetOTPSerializer
    permission_classes = [AllowAny]

class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()


        return Response(result, status=status.HTTP_200_OK)

class ChangePasswordOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Get the currently authenticated user.
        user = request.user

        # Check whether the account is active and not blocked.
        if not user.is_active or user.is_blocked:
            return Response(
                {"message": "Your account cannot change its password."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check whether the user's email is verified.
        if not user.is_email_verified:
            return Response(
                {"message": "Please verify your email first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate and send the change-password OTP.
        generate_and_send_otp(
            user,
            purpose="change_password",
        )

        return Response(
            {"message": "Change password OTP sent successfully."},
            status=status.HTTP_200_OK,
        )

class ChangePasswordOTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ChangePasswordOTPSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate a signed token after successful OTP verification.
        reset_token = signing.dumps(
            {
                "user_id": user.id,
                "purpose": "change_password",
                "password_hash": user.password,
            },
            salt="change-password",
        )

        return Response(
            {
                "message": "OTP verified successfully.",
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )


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
        return Address.objects.filter(
            user=self.request.user
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        user = instance.user

        # Lock the user row to prevent concurrent default-address changes.
        User.objects.select_for_update().get(pk=user.pk)

        # Check whether the address being deleted is the default.
        was_default = instance.is_default

        # Delete the selected address.
        instance.delete()

        # If it was the default, promote the newest remaining address.
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

        tokens = serializer.save()

        return Response(
            tokens,
            status=status.HTTP_200_OK
        )


class EmailChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EmailChangeRequestSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response(
            result,
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

        return Response(
            {
                "message": "OTP verified successfully.",
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )


class ConfirmEmailChangeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConfirmEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": "Email address changed successfully.",
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )


class CustomTokenRefreshView(TokenRefreshView):

    def post(self, request, *args, **kwargs):

        refresh_token = request.data.get("refresh")

        if not refresh_token:
            raise InvalidToken("Refresh token is required.")

        try:
            # Decode the refresh token.
            token = RefreshToken(refresh_token)

            # Get the user ID stored in the token.
            user_id = token.payload.get("user_id")

            # Find the current user in the database.
            user = User.objects.get(id=user_id)

            # Reject blocked or inactive users.
            if user.is_blocked or not user.is_active:
                raise AuthenticationFailed(
                    "Your account has been blocked. Please log in again."
                )

        except User.DoesNotExist:
            raise InvalidToken("User does not exist.")

        except (ValueError, TypeError):
            raise InvalidToken("Invalid refresh token.")

        return super().post(request, *args, **kwargs)