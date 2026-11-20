import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

import { API_BASE } from "../../utils/api";

const RECOVERY_KEY = "adminPasswordRecoverySession";

const getRecoverySession = () => {
  try {
    const stored = sessionStorage.getItem(RECOVERY_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    sessionStorage.removeItem(RECOVERY_KEY);
    return null;
  }
};

const AdminResetPassword = () => {
  const navigate = useNavigate();

  const [recoverySession] = useState(() => getRecoverySession());

  const email = recoverySession?.email || "";
  const resetToken = recoverySession?.reset_token || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Restore and validate the recovery session.
  useEffect(() => {
    const session = getRecoverySession();

    if (
      !session ||
      session.purpose !== "admin_password_reset" ||
      session.step !== "reset" ||
      !session.email ||
      !session.reset_token
    ) {
      navigate("/admin/forgot-password", { replace: true });
      return;
    }

    // Check expiry if the backend supplied it.
    if (
      session.reset_token_expires_at &&
      Date.parse(session.reset_token_expires_at) <= Date.now()
    ) {
      sessionStorage.removeItem(RECOVERY_KEY);
      navigate("/admin/forgot-password", { replace: true });
    }
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (newPassword.length < 8) {
      newErrors.newPassword =
        "Password must contain at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword =
        "Include at least one uppercase letter.";
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword =
        "Include at least one lowercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword =
        "Include at least one number.";
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      newErrors.newPassword =
        "Include at least one special character.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/admin/reset-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            reset_token: resetToken,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const getErrorMessages = (value) => {
          if (Array.isArray(value)) {
            return value.flatMap(getErrorMessages);
          }

          if (typeof value === "string") {
            return [value];
          }

          if (value && typeof value === "object") {
            return Object.values(value).flatMap(getErrorMessages);
          }

          return [];
        };

        const passwordErrors = getErrorMessages(data.new_password);
        const confirmErrors = getErrorMessages(data.confirm_password);

        const fieldErrors = {};

        if (passwordErrors.length) {
          fieldErrors.newPassword = passwordErrors[0];
        }

        if (confirmErrors.length) {
          fieldErrors.confirmPassword = confirmErrors[0];
        }

        setErrors(fieldErrors);

        if (Object.keys(fieldErrors).length === 0) {
          const messages = getErrorMessages(data);
          setError(messages[0] || "Unable to reset password.");
        }

        return;
      }

      // Clear the temporary recovery session after success.
      sessionStorage.removeItem(RECOVERY_KEY);

      setSuccess("Your admin password has been reset successfully.");

      // Clear password fields.
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/admin/login", { replace: true });
      }, 1800);

    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem(RECOVERY_KEY);
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white border border-[#EDEAE4] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.06)] p-8 md:p-10">

        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#F3F5F1] flex items-center justify-center">
            <ShieldCheck size={27} className="text-[#1B3B2B]" />
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.2em] text-[#1B3B2B] mb-3">
            SPEQ ADMIN SECURITY
          </p>

          <h2 className="font-serif text-3xl text-gray-900">
            Create New Password
          </h2>

          <p className="text-sm text-gray-500 mt-3 leading-6">
            Choose a strong password for your admin account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    newPassword: "",
                    confirmPassword: "",
                  }));
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] text-sm"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B3B2B]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.newPassword && (
              <p className="text-sm text-red-600 mt-2">
                {errors.newPassword}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: "",
                  }));
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] text-sm"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B3B2B]"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-2">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full bg-[#1B3B2B] text-white py-3.5 rounded-lg font-medium hover:bg-[#142D21] transition disabled:opacity-50"
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleBackToLogin}
          className="flex items-center justify-center gap-2 w-full mt-6 text-sm text-gray-500 hover:text-[#1B3B2B]"
        >
          <ArrowLeft size={16} />
          Back to Admin Login
        </button>
      </div>
    </div>
  );
};

export default AdminResetPassword;