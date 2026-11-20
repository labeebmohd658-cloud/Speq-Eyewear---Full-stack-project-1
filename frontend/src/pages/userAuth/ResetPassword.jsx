
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Eye, EyeOff, ArrowRight } from "lucide-react";

import "./Auth.css";
import "./ResetPassword.css";

import { API_BASE } from "../../utils/api";

const RESET_SESSION_STORAGE_KEY = "customerPasswordResetSession";
const FORGOT_OTP_STORAGE_KEY = "customerForgotPasswordOTP";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Restore reset session from navigation state or sessionStorage.
  const [resetSession, setResetSession] = useState(() => {
    const navigationSession = location.state;

    if (
      navigationSession?.email &&
      navigationSession?.resetToken
    ) {
      return {
        email: navigationSession.email,
        reset_token: navigationSession.resetToken,
        expires_at: navigationSession.resetTokenExpiresAt || null,
      };
    }

    try {
      const savedSession = sessionStorage.getItem(
        RESET_SESSION_STORAGE_KEY
      );

      if (!savedSession) {
        return null;
      }

      const parsedSession = JSON.parse(savedSession);

      if (
        parsedSession.purpose !== "password_reset" ||
        !parsedSession.email ||
        !parsedSession.reset_token
      ) {
        sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);
        return null;
      }

      return parsedSession;
    } catch (error) {
      console.error("Unable to restore reset session:", error);
      sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);
      return null;
    }
  });

  const email = resetSession?.email || "";
  const resetToken = resetSession?.reset_token || "";
  const resetTokenExpiresAt = resetSession?.expires_at || null;

  // Store password form values.
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Control password visibility.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Store API status and messages.
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Persist navigation-based reset sessions too.
  useEffect(() => {
    if (!resetSession) {
      return;
    }

    try {
      sessionStorage.setItem(
        RESET_SESSION_STORAGE_KEY,
        JSON.stringify({
          purpose: "password_reset",
          email: resetSession.email,
          reset_token: resetSession.reset_token,
          expires_at: resetSession.expires_at || null,
        })
      );
    } catch (error) {
      console.error("Unable to save reset session:", error);
    }
  }, [resetSession]);

  // Check whether the backend reset token has expired.
  const resetSessionExpired =
    resetTokenExpiresAt &&
    Number.isFinite(new Date(resetTokenExpiresAt).getTime()) &&
    new Date(resetTokenExpiresAt).getTime() <= Date.now();

  // Check password requirements while typing.
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    specialChar: /[^A-Za-z0-9]/.test(newPassword),
  };

  // Extract readable messages from backend errors.
  const getErrorMessages = (value) => {
    if (!value) return [];

    if (typeof value === "string") {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => getErrorMessages(item));
    }

    if (typeof value === "object") {
      return Object.values(value).flatMap((item) =>
        getErrorMessages(item)
      );
    }

    return [String(value)];
  };

  // Handle password reset submission.
  const handleResetPassword = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    // Check reset session.
    if (!resetToken || !email) {
      setErrorMessage(
        "Your password reset session has expired. Please request a new OTP."
      );
      return;
    }

    if (resetSessionExpired) {
      setErrorMessage(
        "Your password reset authorization has expired. Please request a new OTP."
      );
      return;
    }

    // Check required fields.
    if (!newPassword || !confirmPassword) {
      setErrorMessage("Please fill in both password fields.");
      return;
    }

    // Check password match.
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    // Validate password requirements.
    if (!passwordChecks.minLength) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }

    if (!passwordChecks.uppercase) {
      setErrorMessage(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!passwordChecks.lowercase) {
      setErrorMessage(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!passwordChecks.number) {
      setErrorMessage("Password must contain at least one number.");
      return;
    }

    if (!passwordChecks.specialChar) {
      setErrorMessage(
        "Password must contain at least one special character."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/reset-password/`,
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

      const data = await response.json();

      if (!response.ok) {
        const messages = getErrorMessages(data);

        throw new Error(
          messages[0] || "Password reset failed. Please try again."
        );
      }

      const message =
        data.message || "Password reset successfully. Please sign in.";

      setSuccessMessage(message);

      // Clear password fields.
      setNewPassword("");
      setConfirmPassword("");

      // Clear both pending OTP and reset-session data.
      sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
      sessionStorage.removeItem(RESET_SESSION_STORAGE_KEY);

      setResetSession(null);

      // Navigate to login.
      navigate("/login", {
        replace: true,
        state: {
          message,
          email,
        },
      });
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Do not display the reset form without a valid reset session.
  if (!email || !resetToken || resetSessionExpired) {
    return (
      <main className="reset-password-page">
        <section className="reset-password-card">
          <h2>Reset Session Expired</h2>

          <p className="reset-password-description">
            Your password reset session is missing or expired.
            Please request a new OTP.
          </p>

          <Link to="/login" className="reset-password-back">
            Back to Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">

        <div className="reset-password-icon">
          <LockKeyhole size={26} />
        </div>

        <p className="reset-password-eyebrow">
          ACCOUNT SECURITY
        </p>

        <h1>Reset Your Password</h1>

        <p className="reset-password-description">
          Create a new password for your account.
        </p>

        <p className="reset-password-email">
          Recovery email: <strong>{email}</strong>
        </p>

        <form
          className="reset-password-form"
          onSubmit={handleResetPassword}
        >

          {/* NEW PASSWORD */}
          <label htmlFor="new-password">
            New Password
          </label>

          <div className="reset-password-input">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {/* PASSWORD REQUIREMENTS */}
          <div className="password-requirements">
            <p>Password must contain:</p>

            <p className={passwordChecks.minLength ? "valid" : "invalid"}>
              {passwordChecks.minLength ? "✓" : "○"}
              {" "}At least 8 characters
            </p>

            <p className={passwordChecks.uppercase ? "valid" : "invalid"}>
              {passwordChecks.uppercase ? "✓" : "○"}
              {" "}One uppercase letter (A-Z)
            </p>

            <p className={passwordChecks.lowercase ? "valid" : "invalid"}>
              {passwordChecks.lowercase ? "✓" : "○"}
              {" "}One lowercase letter (a-z)
            </p>

            <p className={passwordChecks.number ? "valid" : "invalid"}>
              {passwordChecks.number ? "✓" : "○"}
              {" "}One number (0-9)
            </p>

            <p className={passwordChecks.specialChar ? "valid" : "invalid"}>
              {passwordChecks.specialChar ? "✓" : "○"}
              {" "}One special character (!@#$...)
            </p>
          </div>

          {/* CONFIRM PASSWORD */}
          <label htmlFor="confirm-password">
            Confirm Password
          </label>

          <div className="reset-password-input">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <p className="reset-error" role="alert">
              {errorMessage}
            </p>
          )}

          {/* SUCCESS MESSAGE */}
          {successMessage && (
            <p className="reset-success">
              {successMessage}
            </p>
          )}

          {/* SUBMIT BUTTON */}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Resetting Password..." : "Reset Password"}

            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <Link to="/login" className="reset-password-back">
          Back to Sign In
        </Link>

      </section>
    </main>
  );
};

export default ResetPassword;
