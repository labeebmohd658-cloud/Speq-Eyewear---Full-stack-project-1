
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .users.views import (
    SignupView,
    VerifyOTPView,
    ResendOTPView,
    LoginView,
    ProfileView,
    LogoutView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordOTPVerifyView,
    SetNewPasswordView,
    AddressDetailView,
    AddressListCreateView,
    GoogleLoginView,
    ChangePasswordOTPView,
    EmailChangeRequestView,
    EmailChangeOTPVerifyView,
    ConfirmEmailChangeView,
    VerifyPasswordResetOTPView,
    ProfilePictureUploadView,
    ResendPasswordResetOTPView,
    CustomTokenRefreshView,

)



urlpatterns = [
    path("signup/",SignupView.as_view(),name="signup"),
    path("verify-otp/",VerifyOTPView.as_view(), name="verify-otp"),
    path("resend-otp/",ResendOTPView.as_view(), name="resend-otp"),
    path("login/",LoginView.as_view(), name="login"),
    path("profile/",ProfileView.as_view(), name="profile"),
    path("profile/upload-picture/",ProfilePictureUploadView.as_view(),name="upload-profile-picture"),
    path("logout/",LogoutView.as_view(),name="logout"),
    path("forgot-password/",ForgotPasswordView.as_view(),name="forgot-password"),
    path("resend-password-reset-otp/",ResendPasswordResetOTPView.as_view(), name="resend-password-reset-otp"),
    path("reset-password/",ResetPasswordView.as_view(),name="reset-password"),
    path("verify-password-reset-otp/",VerifyPasswordResetOTPView.as_view(),name="verify-password-reset-otp"),
    path("change-password/verify-otp/",ChangePasswordOTPVerifyView.as_view(),name="change-password-verify-otp",),
    path("change-password/set-new-password/", SetNewPasswordView.as_view(),name="set-new-password",),
    path("addresses/",AddressListCreateView.as_view(),name="address-list-create"),
    path("addresses/<int:pk>/",AddressDetailView.as_view(),name="address-detail"),
    path("google-login/",GoogleLoginView.as_view(),name="google-login"),
    path("change-password/send-otp/",ChangePasswordOTPView.as_view(),name="change-password-send-otp"),
    path("change-email/request-otp/",EmailChangeRequestView.as_view(), name ="changee-email-request-otp"),
    path("change-email/verify-otp/", EmailChangeOTPVerifyView.as_view(), name = "change-email-verify-otp"),
    path("change-email/confirm/",ConfirmEmailChangeView.as_view(),name="change-email-confirm"),
   path("token/refresh/",CustomTokenRefreshView.as_view(),name="token_refresh"),
]

