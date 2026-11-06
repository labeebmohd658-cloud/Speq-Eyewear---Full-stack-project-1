import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";

function GoogleLoginButton() {
  const navigate = useNavigate();

  // Handle successful Google authentication.
  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch(`${API_BASE}/auth/google-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Google login failed:", data);
        alert(data.message || "Google login failed.");
        return;
      }

      // Store JWT tokens.
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // Notify the user.
      alert(data.message || "Google login successful!");

      // Redirect to homepage.
      navigate("/", { replace: true });

    } catch (error) {
      console.error("Google login error:", error);
      alert("Unable to connect to the server. Please try again.");
    }
  };

  const handleError = () => {
    alert("Google authentication failed.");
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}

export default GoogleLoginButton;