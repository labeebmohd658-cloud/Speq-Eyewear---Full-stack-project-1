
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { API_BASE } from "../../utils/api";

const AdminGuestRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAdminSession = async () => {
      // Admin tokens are stored separately from customer tokens.
      const storage = localStorage.getItem("admin_refresh")
        ? localStorage
        : sessionStorage;

      const accessToken = storage.getItem("admin_access");
      const refreshToken = storage.getItem("admin_refresh");

      try {
        // No admin tokens means the user can access the login page.
        if (!accessToken && !refreshToken) {
          setIsAuthenticated(false);
          return;
        }

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

          if (response.status !== 401) {
            setIsAuthenticated(false);
            return;
          }
        }

        // Access token expired. Try refreshing it.
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

        storage.setItem("admin_access", refreshData.access);

        // Verify the newly generated access token.
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
        console.error("Admin guest route verification failed:", error);
        setIsAuthenticated(false);
      }
    };

    checkAdminSession();
  }, []);

  // Wait until the backend verifies the admin session.
  if (isAuthenticated === null) {
    return <div>Checking admin session...</div>;
  }

  // Already authenticated admins should not see the login page.
  if (isAuthenticated) {
    return <Navigate to="/admin/users" replace />;
  }

  // Unauthenticated users can access the login page.
  return <Outlet />;
};

export default AdminGuestRoute;
