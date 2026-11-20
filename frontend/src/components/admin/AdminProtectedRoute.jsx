
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { API_BASE } from "../../utils/api";

const AdminProtectedRoute = () => {
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifyAdminSession = async () => {
      // Find which storage contains the admin session.
      const storage = localStorage.getItem("admin_refresh")
        ? localStorage
        : sessionStorage;

      const accessToken = storage.getItem("admin_access");
      const refreshToken = storage.getItem("admin_refresh");

      try {
        // First, verify the existing access token.
        if (accessToken) {
          const response = await fetch(
            `${API_BASE}/auth/admin/profile/`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            setIsAuthenticated(true);
            return;
          }

          // Don't refresh for permission errors or other failures.
          if (response.status !== 401) {
            setIsAuthenticated(false);
            return;
          }
        }

        // No valid access token. Try using the refresh token.
        if (!refreshToken) {
          setIsAuthenticated(false);
          return;
        }

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
          storage.removeItem("admin_access");
          storage.removeItem("admin_refresh");

          setIsAuthenticated(false);
          return;
        }

        const refreshData = await refreshResponse.json();

        // Save the newly generated access token.
        storage.setItem("admin_access", refreshData.access);

        // Verify the new access token with the backend.
        const retryResponse = await fetch(
          `${API_BASE}/auth/admin/profile/`,
          {
            headers: {
              Authorization: `Bearer ${refreshData.access}`,
            },
          }
        );

        if (retryResponse.ok) {
          setIsAuthenticated(true);
        } else {
          storage.removeItem("admin_access");
          storage.removeItem("admin_refresh");

          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Admin session verification failed:", error);
        setIsAuthenticated(false);
      }
    };

    verifyAdminSession();
  }, []);

  // Wait until session verification is complete.
  if (isAuthenticated === null) {
    return <div>Checking admin session...</div>;
  }

  // Redirect if the admin session is invalid.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
