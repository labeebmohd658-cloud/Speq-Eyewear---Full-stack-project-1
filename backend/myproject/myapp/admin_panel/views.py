
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework import generics,filters
from rest_framework import status
from rest_framework.views import APIView
from django.db.models import Q
import re
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    BasePermission,
)

from .serializers import (
    AdminLoginSerializer,
    AdminUserListSerializer,
    AdminForgotPasswordSerializer,
    AdminResetPasswordSerializer,
    AdminVerifyPasswordResetOTPSerializer,
)

User = get_user_model()



class IsAdminUserPermission(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class AdminLoginView(generics.GenericAPIView):
    serializer_class = AdminLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response(result, status=200)

class AdminUserPagination(PageNumberPagination):
    page_size =10
    page_size_query_param="page_size"
    max_page_size=50

class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserListSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminUserPermission,
    ]

    pagination_class = AdminUserPagination

    # Enable sorting through query parameters.
    filter_backends = [filters.OrderingFilter]

    # Fields allowed for sorting.
    ordering_fields = [
        "date_joined",
        "full_name",
        "email",
    ]

    # Default sorting: newest customers first.
    ordering = ["-date_joined"]

    def get_queryset(self):
        queryset = User.objects.all()

        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        return queryset

       

class AdminUserStatusView(APIView):
    permission_classes=[IsAuthenticated,IsAdminUserPermission]

    def patch(self,request,user_id):
        try:
            user=User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"message":"user not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.id == request.user.id:
            return Response(
                {"message":"You cannot change your own account status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_blocked = request.data.get("is_blocked")

        if not isinstance(is_blocked,bool):
            return Response(
                {"message":"is_blocked must be true or false"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_blocked = is_blocked
        user.save(update_fields=["is_blocked"])

        action = "blocked" if is_blocked else "unblocked"

        return Response(
            {
                "message":f"User successfully {action}",
                "user_id":user.id,
                "is_blocked":user.is_blocked
            },

            status=status.HTTP_200_OK,
        )


class AdminForgotPasswordView(generics.GenericAPIView):

    serializer_class = AdminForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(result, status=status.HTTP_200_OK)


class AdminVerifyPasswordResetOTPView(generics.GenericAPIView):

    serializer_class = AdminVerifyPasswordResetOTPSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(result, status=status.HTTP_200_OK)


class AdminResetPasswordView(generics.GenericAPIView):

    serializer_class = AdminResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response(result, status=status.HTTP_200_OK)
