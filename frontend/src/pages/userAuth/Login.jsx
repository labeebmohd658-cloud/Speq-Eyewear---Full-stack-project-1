
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

import "./Auth.css";
import "./Login.css";
import "./RecoveryModal.css";

import GoogleLoginButton from "../../components/GoogleLoginButton";
import { API_BASE } from "../../utils/api";

const FORGOT_OTP_STORAGE_KEY = "customerForgotPasswordOTP";
const RESET_SESSION_STORAGE_KEY = "customerPasswordResetSession";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const otpInputRefs = useRef([]);

  const successMessage = location.state?.message || "";

  // Login form states.
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Forgot password modal states.
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");

  // OTP states.
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // OTP expiry and resend states.
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // Restore pending forgot-password OTP after a page reload.
  useEffect(() => {
    const savedFlow = sessionStorage.getItem(FORGOT_OTP_STORAGE_KEY);

    if (!savedFlow) {
      return;
    }

    try {
      const parsedFlow = JSON.parse(savedFlow);
      const expiryTimestamp = new Date(parsedFlow.expires_at).getTime();

      if (
        parsedFlow.purpose !== "password_reset" ||
        !parsedFlow.email ||
        !parsedFlow.expires_at ||
        !Number.isFinite(expiryTimestamp)
      ) {
        sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
        return;
      }

      setRecoveryEmail(parsedFlow.email);
      setIsOtpSent(true);
      setIsForgotModalOpen(true);
      setOtpExpiresAt(parsedFlow.expires_at);

      setOtpTimeLeft(
        Math.max(
          0,
          Math.ceil((expiryTimestamp - Date.now()) / 1000)
        )
      );
    } catch (error) {
      console.error("Unable to restore recovery OTP:", error);
      sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
    }
  }, []);

  // Keep the countdown synchronized with the backend expiry timestamp.
  useEffect(() => {
    if (!isOtpSent || !otpExpiresAt) {
      return;
    }

    const updateCountdown = () => {
      const expiryTimestamp = new Date(otpExpiresAt).getTime();

      const remainingSeconds = Math.max(
        0,
        Math.ceil((expiryTimestamp - Date.now()) / 1000)
      );

      setOtpTimeLeft(remainingSeconds);
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [isOtpSent, otpExpiresAt]);

  // Extract a readable error message from backend responses.
  const getErrorMessage = (data, fallbackMessage) => {
    if (!data) return fallbackMessage;

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return data
        .map((item) => getErrorMessage(item, ""))
        .filter(Boolean)
        .join(" ");
    }

    if (typeof data === "object") {
      if (data.detail) {
        return getErrorMessage(data.detail, fallbackMessage);
      }

      if (data.non_field_errors) {
        return getErrorMessage(data.non_field_errors, fallbackMessage);
      }

      for (const value of Object.values(data)) {
        const message = getErrorMessage(value, "");

        if (message) return message;
      }
    }

    return fallbackMessage;
  };

  // Save pending OTP details in sessionStorage.
  const saveForgotPasswordFlow = (emailAddress, expiresAt) => {
    const flow = {
      purpose: "password_reset",
      email: emailAddress,
      expires_at: expiresAt,
    };

    sessionStorage.setItem(
      FORGOT_OTP_STORAGE_KEY,
      JSON.stringify(flow)
    );
  };

  // Validate the backend OTP expiry timestamp.
  const isValidExpiry = (expiresAt) => {
    return (
      Boolean(expiresAt) &&
      Number.isFinite(new Date(expiresAt).getTime())
    );
  };

  // Login handler.
  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Login failed. Please try again.")
        );
      }

      if (!data.access || !data.refresh) {
        throw new Error("Authentication tokens were not received.");
      }

      // Store JWT tokens.
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // Redirect to the originally requested protected route.
      const redirectPath = location.state?.from?.pathname || "/";

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password: request the first OTP.
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setRecoveryError("");
    setResendMessage("");

    const normalizedEmail = recoveryEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setRecoveryError("Please enter your registered email.");
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/forgot-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to send recovery OTP.")
        );
      }

      // The backend must return the actual OTP expiry timestamp.
      if (!isValidExpiry(data.expires_at)) {
        throw new Error(
          "The server did not return a valid OTP expiry time. Please check the backend response."
        );
      }

      // Persist the pending OTP flow.
      saveForgotPasswordFlow(
        data.email || normalizedEmail,
        data.expires_at
      );

      setRecoveryEmail(data.email || normalizedEmail);
      setOtpExpiresAt(data.expires_at);
      setOtpTimeLeft(
        Math.max(
          0,
          Math.ceil(
            (new Date(data.expires_at).getTime() - Date.now()) / 1000
          )
        )
      );

      setIsOtpSent(true);
      setIsForgotModalOpen(true);
      setOtp("");
      setResendMessage("");
      setRecoveryError("");

      otpInputRefs.current[0]?.focus();
    } catch (error) {
      setRecoveryError(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Resend password reset OTP.
  const handleResendOtp = async () => {
    if (otpTimeLeft > 0 || isResendingOtp || isVerifyingOtp) {
      return;
    }

    setIsResendingOtp(true);
    setResendMessage("");
    setRecoveryError("");

    try {
      const response = await fetch(
        `${API_BASE}/auth/resend-password-reset-otp/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: recoveryEmail.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to resend OTP.")
        );
      }

      if (!isValidExpiry(data.expires_at)) {
        throw new Error(
          "The server did not return a valid OTP expiry time."
        );
      }

      const updatedEmail = data.email || recoveryEmail.trim().toLowerCase();

      // Update the stored OTP flow only after successful resend.
      saveForgotPasswordFlow(updatedEmail, data.expires_at);

      setRecoveryEmail(updatedEmail);
      setOtpExpiresAt(data.expires_at);

      setOtpTimeLeft(
        Math.max(
          0,
          Math.ceil(
            (new Date(data.expires_at).getTime() - Date.now()) / 1000
          )
        )
      );

      setOtp("");
      setResendMessage(
        data.message || "A new OTP has been sent to your email."
      );

      otpInputRefs.current[0]?.focus();
    } catch (error) {
      setRecoveryError(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Verify password reset OTP.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setRecoveryError("");
    setResendMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setRecoveryError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (otpTimeLeft <= 0) {
      setRecoveryError("OTP has expired. Please request a new OTP.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/verify-password-reset-otp/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: recoveryEmail.trim().toLowerCase(),
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "OTP verification failed.")
        );
      }

      if (!data.reset_token) {
        throw new Error(
          "Reset authorization token was not received."
        );
      }

      // Save the reset session so a refresh does not lose the token.
      const resetSession = {
        purpose: "password_reset",
        email: data.email || recoveryEmail.trim().toLowerCase(),
        reset_token: data.reset_token,
        expires_at: data.reset_token_expires_at || null,
      };

      sessionStorage.setItem(
        RESET_SESSION_STORAGE_KEY,
        JSON.stringify(resetSession)
      );

      // The OTP flow is complete. Remove its stored details.
      sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);

      // Navigate to reset password page.
      navigate("/reset-password", {
        replace: true,
        state: {
          email: resetSession.email,
          resetToken: resetSession.reset_token,
          resetTokenExpiresAt: resetSession.expires_at,
        },
      });
    } catch (error) {
      setRecoveryError(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Close the modal without deleting the pending OTP flow.
  // This allows the flow to be restored after a page reload.
  const closeRecoveryModal = () => {
    setIsForgotModalOpen(false);
  };

  return (
    <div className="signup-page">

      {/* NAVBAR */}
      <nav className="signup-navbar">
        <div className="nav-links">
          <Link to="/">SunGlass</Link>
          <Link to="/">ScreenGlass</Link>
          <Link to="/">EyeGlass</Link>
          <Link to="/">View All</Link>
        </div>

        <Link to="/" className="brand-logo">
          SPEQ
        </Link>

        <div className="nav-actions">
          <Link to="/login">Sign In</Link>
        </div>
      </nav>

      {/* MAIN LOGIN SECTION */}
      <main className="login-main">
        <div className="signup-container">

          {/* LEFT IMAGE PANEL */}
          <section className="signup-left">
            <div className="left-top">
              <span>● THE ATELIER ARCHIVE</span>
              <span>EDITION Nº 04</span>
            </div>

            <div className="left-content">
              <h2>
                Crafted for discerning vision. Tailored to your signature
                perspective.
              </h2>

              <div className="gold-underline"></div>

              <p>TOKYO - SABAE HANDCRAFTED - PARIS SALONS</p>
            </div>
          </section>

          {/* RIGHT LOGIN PANEL */}
          <section className="signup-right">
            <div className="form-badge">
              <span>CLIENT PORTAL / VAULT ACCESS</span>
              <div></div>
            </div>

            <div className="form-heading">
              <h1>Welcome to the SpeQ</h1>

              <p>
                Access your bespoke optical prescription, wishlist, and private
                fitting archive.
              </p>
            </div>

            {/* LOGIN / SIGNUP TOGGLE */}
            <div className="auth-toggle">
              <Link to="/login" className="toggle-active">
                Sign In
              </Link>

              <Link to="/signup" className="toggle-inactive">
                Create Account
              </Link>
            </div>

            {successMessage && (
              <p className="login-success-message">
                {successMessage}
              </p>
            )}

            {/* LOGIN FORM */}
            <form className="signup-form" onSubmit={handleLogin}>

              {/* EMAIL FIELD */}
              <div className="form-group">
                <label htmlFor="email">
                  SPEQ CLIENT ID / EMAIL
                </label>

                <div className="input-wrapper">
                  <Mail size={21} />

                  <input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="form-group">
                <div className="password-label">
                  <label htmlFor="password">
                    PASSCODE / SECURITY KEY
                  </label>

                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => {
                      setRecoveryEmail(email);
                      setIsForgotModalOpen(true);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="input-wrapper">
                  <LockKeyhole size={21} />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="field-error" role="alert">
                  {errorMessage}
                </p>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                className="signup-submit"
                disabled={isLoading}
              >
                {isLoading ? "SIGNING IN..." : "ENTER THE SPEQ"}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>

            {/* SOCIAL LOGIN DIVIDER */}
            <div className="social-divider">
              <span></span>
              <p>OR CONTINUE VIA</p>
              <span></span>
            </div>

            {/* GOOGLE LOGIN */}
            <div className="google-login">
              <GoogleLoginButton />
            </div>
          </section>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="recovery-overlay">
          <div className="recovery-modal">

            {/* TOP BADGE */}
            <div className="recovery-badge">
              <span>• CLIENT PORTAL / SECURITY PROTOCOL</span>
            </div>

            {/* WATERMARK */}
            <span className="recovery-watermark">
              SPEQ
            </span>

            {/* CLOSE BUTTON */}
            <button
              type="button"
              className="recovery-close"
              onClick={closeRecoveryModal}
              aria-label="Close recovery modal"
            >
              <X size={20} />
            </button>

            {/* ICON */}
            <div className="recovery-icon">
              <LockKeyhole size={26} />
            </div>

            {/* HEADING */}
            <div className="recovery-heading">
              <h2>Forgotten Key / Recovery Request</h2>

              <p>
                Submit your registered destination to receive a recovery key,
                then verify below.
              </p>
            </div>

            {/* EMAIL REQUEST */}
            <form
              className="recovery-form"
              onSubmit={handleForgotPassword}
            >
              <div className="recovery-label">
                <label htmlFor="recovery-email">
                  SpeQ CLIENT ID / EMAIL
                </label>

                <span>Private Registry</span>
              </div>

              <div className="recovery-input">
                <Mail size={19} />

                <input
                  id="recovery-email"
                  type="email"
                  placeholder="client@verveoptics.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="recovery-submit"
                disabled={isSendingOtp}
              >
                {isSendingOtp ? "Sending OTP..." : "Send OTP"}
                {!isSendingOtp && <ArrowRight size={18} />}
              </button>
            </form>

            {/* EMAIL / OTP ERRORS */}
            {recoveryError && (
              <p className="recovery-error" role="alert">
                {recoveryError}
              </p>
            )}

            {/* OTP VERIFICATION */}
            {isOtpSent && (
              <form
                className="recovery-otp-section"
                onSubmit={handleVerifyOtp}
              >
                <div className="recovery-divider"></div>

                <h3>Enter Recovery Key</h3>

                <p className="recovery-otp-description">
                  Enter the 6-digit code sent to your registered email.
                </p>

                <div className="recovery-otp-inputs">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[index] || ""}
                      aria-label={`OTP digit ${index + 1}`}
                      onChange={(e) => {
                        const digit = e.target.value
                          .replace(/\D/g, "")
                          .slice(-1);

                        const updatedOtp = otp.split("");
                        updatedOtp[index] = digit;

                        const nextOtp = updatedOtp.join("").slice(0, 6);
                        setOtp(nextOtp);

                        if (digit && index < 5) {
                          otpInputRefs.current[index + 1]?.focus();
                        }
                      }}
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Backspace" &&
                          !otp[index] &&
                          index > 0
                        ) {
                          otpInputRefs.current[index - 1]?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();

                        const pastedOtp = e.clipboardData
                          .getData("text")
                          .replace(/\D/g, "")
                          .slice(0, 6);

                        setOtp(pastedOtp);

                        const focusIndex = Math.min(
                          pastedOtp.length,
                          5
                        );

                        otpInputRefs.current[focusIndex]?.focus();
                      }}
                    />
                  ))}
                </div>

                {/* RESEND OTP TIMER */}
                <div className="recovery-resend-section">
                  {otpTimeLeft > 0 ? (
                    <p className="recovery-timer">
                      Resend OTP in <strong>{otpTimeLeft}s</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="resend-otp-button"
                      onClick={handleResendOtp}
                      disabled={isResendingOtp || isVerifyingOtp}
                    >
                      {isResendingOtp ? "SENDING..." : "RESEND OTP"}
                    </button>
                  )}

                  {resendMessage && (
                    <p className="success-message">
                      {resendMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="recovery-submit"
                  disabled={
                    isVerifyingOtp ||
                    isResendingOtp ||
                    otp.length !== 6 ||
                    otpTimeLeft <= 0
                  }
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  {!isVerifyingOtp && <ArrowRight size={18} />}
                </button>
              </form>
            )}

            {/* BACK TO LOGIN */}
            <button
              type="button"
              className="recovery-back"
              onClick={closeRecoveryModal}
            >
              <ArrowLeft size={16} />
              Back to SpeQ Sign In
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="login-footer">
        <div className="footer-main">

          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              SPEQ.
            </Link>

            <p>Timeless eyewear. Enduring style.</p>
          </div>

          <div className="footer-column">
            <h3>COLLECTIONS</h3>
            <Link to="/">Sunglasses</Link>
            <Link to="/">Eyeglasses</Link>
            <Link to="/">Screen Glasses</Link>
            <Link to="/">Brands</Link>
          </div>

          <div className="footer-column">
            <h3>CLIENT SERVICES</h3>
            <Link to="/">Fitting Guide</Link>
            <Link to="/">Shipping & Returns</Link>
            <Link to="/">Warranty</Link>
            <Link to="/">Contact Us</Link>
          </div>

          <div className="footer-column">
            <h3>AUTHENTICATION</h3>
            <Link to="/login">Sign In</Link>
            <Link to="/signup">Create Account</Link>
            <Link to="/login">Forgot Password</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} SPEQ. All rights reserved.
          </p>

          <div>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Cookie Preferences</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
