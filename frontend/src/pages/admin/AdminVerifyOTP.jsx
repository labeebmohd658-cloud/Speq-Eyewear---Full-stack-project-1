
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const AdminVerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Receive admin email from the previous page.
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef([]);

  // Redirect if the email was not provided.
  useEffect(() => {
    if (!email) {
      navigate("/admin/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // Countdown for OTP resend.
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Handle individual OTP input.
  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    setError("");

    const updatedOTP = [...otp];
    updatedOTP[index] = value.slice(-1);

    setOtp(updatedOTP);

    // Move to the next input automatically.
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation.
  const handleKeyDown = (e, index) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting a complete OTP.
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

  // Verify the OTP with the backend.
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
        "http://127.0.0.1:8000/api/auth/admin/verify-reset-otp/",
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

      const data = await response.json();

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

      navigate("/admin/reset-password", {
        state: {
          email,
          reset_token: data.reset_token,
        },
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Request a new OTP.
  const handleResendOTP = async () => {
    setError("");
    setResending(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/admin/forgot-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.email?.[0] ||
          data.detail ||
          data.message ||
          "Unable to resend OTP."
        );
      }

      setOtp(["", "", "", "", "", ""]);
      setTimer(60);
      inputRefs.current[0]?.focus();

    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center px-5">

      <div className="w-full max-w-md bg-white border border-[#EDEAE4] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.06)] p-8 md:p-10">

        {/* Security icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#F3F5F1] flex items-center justify-center">
            <ShieldCheck size={27} className="text-[#1B3B2B]" />
          </div>
        </div>

        {/* Heading */}
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

        {/* OTP form */}
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

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">
              {error}
            </p>
          )}

          {/* Verify button */}
          <button
            type="submit"
            disabled={loading || otp.join("").length !== 6}
            className="w-full bg-[#1B3B2B] text-white py-3.5 rounded-lg font-medium hover:bg-[#142D21] transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

        </form>

        {/* Resend OTP */}
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

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/admin/forgot-password")}
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
