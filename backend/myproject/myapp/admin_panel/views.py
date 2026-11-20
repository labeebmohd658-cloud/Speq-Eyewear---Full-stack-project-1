# Django
from django.contrib.auth import get_user_model
from django.db.models import Q

# Django REST Framework
from rest_framework import generics, filters, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    BasePermission,
)
from rest_framework.response import Response
from rest_framework.views import APIView

# Simple JWT
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings

# Admin serializers
from .serializers import (
    AdminLoginSerializer,
    AdminUserListSerializer,
    AdminForgotPasswordSerializer,
    AdminVerifyPasswordResetOTPSerializer,
    AdminResetPasswordSerializer,
)


User = get_user_model()


# --------------------------------------------------
# ADMIN PERMISSION
# --------------------------------------------------

class IsAdminUserPermission(BasePermission):

    def has_permission(self, request, view):

        user = request.user

        return (
            user
            and user.is_authenticated
            and user.is_staff
            and user.is_active
            and not user.is_blocked
        )


# --------------------------------------------------
# ADMIN LOGIN
# --------------------------------------------------

class AdminLoginView(generics.GenericAPIView):

    serializer_class = AdminLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN PROFILE
# --------------------------------------------------

class AdminProfileView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAdminUserPermission,
    ]

    def get(self, request):

        user = request.user

        return Response(
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "is_staff": user.is_staff,
            },
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN TOKEN REFRESH
# --------------------------------------------------

class AdminTokenRefreshView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {
                    "detail": "Refresh token is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            # Validate the refresh token.
            token = RefreshToken(refresh_token)

            # Get the user ID stored inside the token.
            user_id = token.get(
                api_settings.USER_ID_CLAIM
            )

            # Find the corresponding user.
            user = User.objects.get(
                **{
                    api_settings.USER_ID_FIELD: user_id
                }
            )

            # Only authorized admins can refresh tokens.
            if (
                not user.is_active
                or not user.is_staff
                or user.is_blocked
            ):
                return Response(
                    {
                        "detail": (
                            "Admin account is not authorized."
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Generate a new access token.
            access_token = str(token.access_token)

            return Response(
                {
                    "access": access_token,
                },
                status=status.HTTP_200_OK,
            )

        except (TokenError, User.DoesNotExist):

            return Response(
                {
                    "detail": "Invalid or expired refresh token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )


# --------------------------------------------------
# ADMIN CUSTOMER PAGINATION
# --------------------------------------------------

class AdminUserPagination(PageNumberPagination):

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


# --------------------------------------------------
# ADMIN CUSTOMER LIST
# --------------------------------------------------

class AdminUserListView(generics.ListAPIView):

    serializer_class = AdminUserListSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminUserPermission,
    ]

    pagination_class = AdminUserPagination

    filter_backends = [
        filters.OrderingFilter,
    ]

    ordering_fields = [
        "date_joined",
        "full_name",
        "email",
    ]

    ordering = ["-date_joined"]

    def get_queryset(self):

        queryset = User.objects.all()

        search = self.request.query_params.get(
            "search",
            "",
        ).strip()

        if search:

            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        return queryset


# --------------------------------------------------
# ADMIN BLOCK / UNBLOCK CUSTOMER
# --------------------------------------------------

class AdminUserStatusView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAdminUserPermission,
    ]

    def patch(self, request, user_id):

        try:

            user = User.objects.get(id=user_id)

        except User.DoesNotExist:

            return Response(
                {
                    "message": "User not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prevent admins from changing their own status.
        if user.id == request.user.id:

            return Response(
                {
                    "message": (
                        "You cannot change your own account status."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_blocked = request.data.get("is_blocked")

        if not isinstance(is_blocked, bool):

            return Response(
                {
                    "message": "is_blocked must be true or false.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_blocked = is_blocked
        user.save(update_fields=["is_blocked"])

        action = "blocked" if is_blocked else "unblocked"

        return Response(
            {
                "message": f"User successfully {action}.",
                "user_id": user.id,
                "is_blocked": user.is_blocked,
            },
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN FORGOT PASSWORD
# --------------------------------------------------

class AdminForgotPasswordView(generics.GenericAPIView):

    serializer_class = AdminForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN VERIFY PASSWORD RESET OTP
# --------------------------------------------------

class AdminVerifyPasswordResetOTPView(generics.GenericAPIView):

    serializer_class = AdminVerifyPasswordResetOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN RESET PASSWORD
# --------------------------------------------------

class AdminResetPasswordView(generics.GenericAPIView):

    serializer_class = AdminResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# ADMIN LOGOUT
# --------------------------------------------------

class AdminLogoutView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAdminUserPermission,
    ]

    def post(self, request):

        refresh_token = request.data.get("refresh")

        if not refresh_token:

            return Response(
                {
                    "detail": "Refresh token is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            token = RefreshToken(refresh_token)

            # Ensure the refresh token belongs to this admin.
            if str(
                token.get(api_settings.USER_ID_CLAIM)
            ) != str(request.user.pk):

                return Response(
                    {
                        "detail": "Invalid refresh token.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Blacklist the refresh token.
            token.blacklist()

            return Response(
                {
                    "message": "Admin logged out successfully.",
                },
                status=status.HTTP_200_OK,
            )

        except TokenError:

            return Response(
                {
                    "detail": "Invalid or expired refresh token.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )