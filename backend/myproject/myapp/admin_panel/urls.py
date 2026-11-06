from django.urls import path

from .views import (
    AdminLoginView,
    AdminUserListView,
    AdminUserStatusView,
    AdminForgotPasswordView,
    AdminVerifyPasswordResetOTPView,
    AdminResetPasswordView,
)

urlpatterns = [

    # Admin authentication
    path("login/", AdminLoginView.as_view(), name="admin-login"),

    # Admin password recovery
    path(
        "forgot-password/",
        AdminForgotPasswordView.as_view(),
        name="admin-forgot-password",
    ),
    path(
        "verify-reset-otp/",
        AdminVerifyPasswordResetOTPView.as_view(),
        name="admin-verify-reset-otp",
    ),
    path(
        "reset-password/",
        AdminResetPasswordView.as_view(),
        name="admin-reset-password",
    ),

    # Admin user management
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path(
        "users/<int:user_id>/status/",
        AdminUserStatusView.as_view(),
        name="admin-user-status",
    ),
]