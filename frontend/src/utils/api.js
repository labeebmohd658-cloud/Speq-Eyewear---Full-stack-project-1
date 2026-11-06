
export const API_BASE =
  "https://vb5k1g6z-8000.inc1.devtunnels.ms/api";

// Clear customer authentication data and redirect to login.
const clearCustomerSession = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");

  // Avoid repeatedly redirecting if already on login.
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// Reusable function for authenticated API requests.
export const apiRequest = async (endpoint, options = {}) => {
  const accessToken = localStorage.getItem("access");
  const refreshToken = localStorage.getItem("refresh");

  const headers = {
    ...options.headers,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Send the original request.
  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle authentication failure.
  if (response.status === 401 && accessToken) {
    // No refresh token means the session cannot be renewed.
    if (!refreshToken) {
      clearCustomerSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    // Attempt to refresh the access token.
    const refreshResponse = await fetch(
      `${API_BASE}/auth/token/refresh/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      }
    );

    // Refresh failed: the account may be blocked or the token expired.
    if (!refreshResponse.ok) {
      clearCustomerSession();
      throw new Error(
        "Your session is invalid or your account is blocked. Please log in again."
      );
    }

    const refreshData = await refreshResponse.json();

    localStorage.setItem("access", refreshData.access);

    headers.Authorization = `Bearer ${refreshData.access}`;

    // Retry the original request with the new access token.
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Authentication failed again.
    if (response.status === 401) {
      clearCustomerSession();
      throw new Error("Please log in again.");
    }
  }

  return response;
};
