
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Glasses,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { API_BASE } from "../../utils/api";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Send admin login request to Django backend.
      const response = await fetch(
        `${API_BASE}/auth/admin/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      // Handle backend validation errors.
      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.non_field_errors?.[0] ||
          data.message ||
          data.email?.[0] ||
          data.password?.[0] ||
          "Invalid admin credentials."
        );
      }

      // Ensure backend returns both JWT tokens.
      if (!data.access || !data.refresh) {
        throw new Error("Authentication tokens were not received.");
      }

      // Remove previous admin tokens from both storage locations.
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");

      sessionStorage.removeItem("admin_access");
      sessionStorage.removeItem("admin_refresh");

      // Store admin tokens in localStorage.
      // Customer authentication tokens remain untouched.
      localStorage.setItem("admin_access", data.access);
      localStorage.setItem("admin_refresh", data.refresh);

      // Navigate to admin dashboard.
      navigate("/admin/users");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-[#EAE7E1]">

        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-[0.2em] text-[#1B3B2B]">
            SPEQ
          </h1>

          <div className="h-8 w-px bg-gray-300"></div>

          <span className="text-xs tracking-[0.2em] text-gray-500">
            ADMIN PORTAL
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 tracking-wider">
          <ShieldCheck size={16} className="text-[#1B3B2B]" />
          SECURITY CLEARANCE LEVEL 01
        </div>

      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-5 py-12">

        <div className="w-full max-w-md bg-white border border-[#EDEAE4] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.06)] p-8 md:p-10">

          {/* Brand icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#F3F5F1] flex items-center justify-center">
              <Glasses size={28} className="text-[#1B3B2B]" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">

            <p className="text-sm font-semibold tracking-[0.25em] text-[#1B3B2B]">
              SPEQ EYEWEAR
            </p>

            <h2 className="font-serif text-3xl text-gray-900 mt-4">
              Admin Sign In
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Access your administrative workspace
            </p>

          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@speceyewear.com"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] text-sm"
                />

              </div>
            </div>

            {/* Password */}
            <div>

              <div className="flex items-center justify-between mb-2">

                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => navigate("/admin/forgot-password")}
                  className="text-xs font-medium text-[#1B3B2B] hover:underline"
                >
                  Forgot Password?
                </button>

              </div>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] text-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B3B2B]"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#1B3B2B] text-white py-3.5 rounded-lg font-medium hover:bg-[#142D21] transition disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In to Dashboard"}

              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-[#EAE7E1] text-center text-xs text-gray-400">

        © {new Date().getFullYear()} SPEQ Eyewear. All rights reserved.

        <span className="mx-3">|</span>

        Secure Administrative Access

      </footer>

    </div>
  );
};

export default AdminLogin;
