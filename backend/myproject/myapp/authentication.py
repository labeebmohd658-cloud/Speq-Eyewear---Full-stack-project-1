from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class CustomJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):

        # Get the authenticated user from the JWT token.
        user = super().get_user(validated_token)

        # Check whether the customer has been blocked.
        if user.is_blocked:
            raise AuthenticationFailed(
                "Your account has been blocked. Please contact support."
            )

        return user