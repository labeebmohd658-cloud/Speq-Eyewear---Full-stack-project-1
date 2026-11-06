import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const GuestRoute = () => {
  const accessToken = localStorage.getItem("access");

  // Redirect logged-in customers away from authentication pages.
  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;