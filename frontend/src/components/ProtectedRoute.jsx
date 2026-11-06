import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { apiRequest } from "../utils/api";

const ProtectedRoute = () => {
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = localStorage.getItem("access");
      const refreshToken = localStorage.getItem("refresh");

      if (!accessToken || !refreshToken) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      try {
        const response = await apiRequest("/auth/profile/");

        if (isMounted) {
          setIsAuthenticated(response.ok);
        }
      } catch (error) {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Wait until the backend validates the session.
  if (isAuthenticated === null) {
    return <div>Checking your session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;