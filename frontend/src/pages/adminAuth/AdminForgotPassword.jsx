import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, X } from "lucide-react";
import { API_BASE } from "../../utils/api";

const RECOVERY_KEY = "adminPasswordRecoverySession";

const AdminForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/admin/forgot-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.email?.[0] ||
          data.detail ||
          data.message ||
          "Unable to process your request."
        );
      }

      // Save recovery metadata, not the OTP.
      const recoverySession = {
        purpose: "admin_password_reset",
        step: "otp",
        email: email.trim(),
        expires_at: data.expires_at || null,
        resend_available_at:
          data.resend_available_at ||
          new Date(Date.now() + 60000).toISOString(),
      };

      sessionStorage.setItem(
        RECOVERY_KEY,
        JSON.stringify(recoverySession)
      );

      navigate("/admin/verify-otp", {
        state: { email: email.trim() },
      });
    } catch (err) {
      setError(err.message || "Unable to process your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center px-5">
      <div className="relative w-full max-w-md bg-white border border-[#EDEAE4] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.06)] p-8 md:p-10">

        <button
          onClick={() => navigate("/admin/login")}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#F3F5F1] flex items-center justify-center">
            <Mail size={26} className="text-[#1B3B2B]" />
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-[#1B3B2B]" />
            <span className="text-xs tracking-[0.2em] text-[#1B3B2B]">
              SPEQ ADMIN SECURITY
            </span>
          </div>

          <h2 className="font-serif text-3xl text-gray-900">
            Forgot Password?
          </h2>

          <p className="text-sm text-gray-500 mt-3 leading-6">
            Enter your registered admin email address.
            We'll send you a verification OTP if the account is eligible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your admin email"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B3B2B] text-white py-3.5 rounded-lg font-medium hover:bg-[#142D21] transition disabled:opacity-60"
          >
            {loading ? "Sending OTP..." : "Send Verification OTP"}
          </button>
        </form>

        <button
          onClick={() => navigate("/admin/login")}
          className="flex items-center justify-center gap-2 w-full mt-6 text-sm text-gray-500 hover:text-[#1B3B2B]"
        >
          <ArrowLeft size={16} />
          Back to Admin Login
        </button>
      </div>
    </div>
  );
};

export default AdminForgotPassword;