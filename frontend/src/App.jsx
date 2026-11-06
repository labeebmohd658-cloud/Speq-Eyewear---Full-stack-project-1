import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Customer pages
import Landing from "./pages/Landing";
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import Profile from "./pages/Profile";
import AddressBook from "./pages/AddressBook";

// Route protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import AdminVerifyOTP from "./pages/admin/AdminVerifyOTP";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminLayout from "./layouts/AdminLayout";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public homepage */}
        <Route path="/" element={<Landing />} />

        {/* Guest-only authentication pages */}
        <Route element={<GuestRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Public password recovery */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected customer pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/addresses" element={<AddressBook />} />
        </Route>

        {/* Admin authentication pages */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/forgot-password"
          element={<AdminForgotPassword />}
        />

        <Route
          path="/admin/verify-otp"
          element={<AdminVerifyOTP />}
        />

        <Route
          path="/admin/reset-password"
          element={<AdminResetPassword />}
        />

        {/* Admin dashboard pages */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            path="users"
            element={<AdminUserManagement />}
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;