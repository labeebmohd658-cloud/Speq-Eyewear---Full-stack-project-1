import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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

const getRemainingSeconds = (timestamp) => {
  if (!timestamp) return 0;

  const remaining = Date.parse(timestamp) - Date.now();

  if (Number.isNaN(remaining)) return 0;

  return Math.max(0, Math.ceil(remaining / 1000));
};

const AdminVerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const savedSession = getRecoverySession();

  const email =
    location.state?.email ||
    (savedSession?.purpose === "admin_password_reset"
      ? savedSession.email
      : "");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [resendAvailableAt, setResendAvailableAt] = useState(
    savedSession?.resend_available_at || null
  );

  const [timer, setTimer] = useState(
    getRemainingSeconds(savedSession?.resend_available_at)
  );

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef([]);

  // Restore the OTP recovery session after refresh.
  useEffect(() => {
    const session = getRecoverySession();

    if (
      !email ||
      !session ||
      session.purpose !== "admin_password_reset" ||
      session.email !== email ||
      session.step !== "otp"
    ) {
      navigate("/admin/forgot-password", { replace: true });
      return;
    }

    // If the backend supplied an OTP expiry, respect it.
    if (
      session.expires_at &&
      Date.parse(session.expires_at) <= Date.now()
    ) {
      sessionStorage.removeItem(RECOVERY_KEY);
      navigate("/admin/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // Keep the resend countdown synchronized with its saved timestamp.
  useEffect(() => {
    if (!resendAvailableAt) {
      setTimer(0);
      return;
    }

    const updateTimer = () => {
      setTimer(getRemainingSeconds(resendAvailableAt));
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    setError("");

    const updatedOTP = [...otp];
    updatedOTP[index] = value.slice(-1);

    setOtp(updatedOTP);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const pastedValue = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedValue) return;

    const updatedOTP = Array(6).fill("");

    pastedValue.split("").forEach((digit, index) => {
      updatedOTP[index] = digit;
    });

    setOtp(updatedOTP);
    setError("");

    const nextIndex = Math.min(pastedValue.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Verify OTP and save the returned reset token.
  const handleVerify = async (e) => {
    e.preventDefault();

    const enteredOTP = otp.join("");

    if (enteredOTP.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/admin/verify-reset-otp/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp: enteredOTP,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.otp?.[0] ||
          data.email?.[0] ||
          data.detail ||
          data.message ||
          "OTP verification failed."
        );
      }

      if (!data.reset_token) {
        throw new Error("Reset token was not received.");
      }

      // Save the verified recovery state.
      // Never save the OTP itself.
      const recoverySession = {
        purpose: "admin_password_reset",
        step: "reset",
        email,
        reset_token: data.reset_token,
        reset_token_expires_at:
          data.reset_token_expires_at || null,
      };

      sessionStorage.setItem(
        RECOVERY_KEY,
        JSON.stringify(recoverySession)
      );

      navigate("/admin/reset-password", {
        state: {
          email,
          reset_token: data.reset_token,
        },
      });
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Request another OTP.
  const handleResendOTP = async () => {
    setError("");
    setResending(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/admin/forgot-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.email?.[0] ||
          data.detail ||
          data.message ||
          "Unable to resend OTP."
        );
      }

      const nextResendAvailableAt =
        data.resend_available_at ||
        new Date(Date.now() + 60000).toISOString();

      const currentSession = getRecoverySession();

      sessionStorage.setItem(
        RECOVERY_KEY,
        JSON.stringify({
          ...currentSession,
          purpose: "admin_password_reset",
          step: "otp",
          email,
          expires_at: data.expires_at || null,
          resend_available_at: nextResendAvailableAt,
        })
      );

      setResendAvailableAt(nextResendAvailableAt);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Unable to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  // Explicitly abandon the current recovery flow.
  const handleChangeEmail = () => {
    sessionStorage.removeItem(RECOVERY_KEY);
    navigate("/admin/forgot-password");
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
            Verify Your Email
          </h2>

          <p className="text-sm text-gray-500 mt-3 leading-6">
            Enter the 6-digit OTP sent to
          </p>

          <p className="text-sm font-medium text-[#1B3B2B] mt-1 break-all">
            {email}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) =>
                  handleChange(e.target.value, index)
                }
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold border border-gray-200 rounded-lg outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || otp.join("").length !== 6}
            className="w-full bg-[#1B3B2B] text-white py-3.5 rounded-lg font-medium hover:bg-[#142D21] transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-500">
          Didn't receive the OTP?

          {timer > 0 ? (
            <p className="mt-2">
              Resend available in{" "}
              <span className="font-semibold text-[#1B3B2B]">
                {timer}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="block mx-auto mt-2 font-semibold text-[#1B3B2B] hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleChangeEmail}
          className="flex items-center justify-center gap-2 w-full mt-7 text-sm text-gray-500 hover:text-[#1B3B2B]"
        >
          <ArrowLeft size={16} />
          Change Email Address
        </button>
      </div>
    </div>
  );
};

export default AdminVerifyOTP;