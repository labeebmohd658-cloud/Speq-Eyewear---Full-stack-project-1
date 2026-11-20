
import { API_BASE } from "./api";

// Clear admin authentication data and redirect to login.
const clearAdminSession = () => {
  localStorage.removeItem("admin_access");
  localStorage.removeItem("admin_refresh");

  sessionStorage.removeItem("admin_access");
  sessionStorage.removeItem("admin_refresh");

  if (window.location.pathname !== "/admin/login") {
    window.location.href = "/admin/login";
  }
};

// Reusable function for authenticated admin API requests.
export const adminApiRequest = async (endpoint, options = {}) => {
  // Identify where the admin session is stored.
  const storage = localStorage.getItem("admin_refresh")
    ? localStorage
    : sessionStorage;

  let accessToken = storage.getItem("admin_access");
  let refreshToken = storage.getItem("admin_refresh");

  // No refresh token means there is no valid session to renew.
  if (!refreshToken) {
    clearAdminSession();
    throw new Error("Admin session expired. Please log in again.");
  }

  const headers = {
    ...options.headers,
  };

  // Attach the admin access token.
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Send the original request.
  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Refresh the access token if it has expired.
  if (response.status === 401) {
    const refreshResponse = await fetch(
      `${API_BASE}/auth/admin/token/refresh/`,
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

    if (!refreshResponse.ok) {
      clearAdminSession();
      throw new Error("Admin session expired. Please log in again.");
    }

    const refreshData = await refreshResponse.json();

    accessToken = refreshData.access;

    if (!accessToken) {
      clearAdminSession();
      throw new Error("Could not refresh admin access token.");
    }

    // Save the new access token.
    storage.setItem("admin_access", accessToken);

    // Handle refresh-token rotation if enabled.
    if (refreshData.refresh) {
      storage.setItem("admin_refresh", refreshData.refresh);
    }

    // Retry the original request.
    headers.Authorization = `Bearer ${accessToken}`;

    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // The refreshed token was also rejected.
    if (response.status === 401) {
      clearAdminSession();
      throw new Error("Admin authentication failed.");
    }
  }

  return response;
};
