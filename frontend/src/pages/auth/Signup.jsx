import React, { useEffect, useState } from "react";
import "./Auth.css";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock3,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AtSign,
  X,
} from "lucide-react";

import GoogleLoginButton from "../../components/GoogleLoginButton";
import { API_BASE } from "../../utils/api";

function Signup() {
  const navigate = useNavigate();

  // Store signup form values.
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  // Password visibility.
  const [showPassword, setShowPassword] = useState(false);

  // Store field-level validation errors.
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  // Signup loading state.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP modal state.
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  // OTP timer and resend state.
  const [otpTimeLeft, setOtpTimeLeft] = useState(60);
  const [otpTimerVersion, setOtpTimerVersion] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Start a 60-second timer whenever OTP is sent or resent.
  useEffect(() => {
    if (!isOtpModalOpen) return;

    setOtpTimeLeft(60);

    const timer = setInterval(() => {
      setOtpTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpModalOpen, otpTimerVersion]);

  // Convert backend validation errors into readable messages.
  const getErrorMessages = (error) => {
    if (!error) return [];

    // Handle multiple validation messages.
    if (Array.isArray(error)) {
      return error.flatMap((item) => getErrorMessages(item));
    }

    // Handle normal string messages.
    if (typeof error === "string") {
      return [error];
    }

    // Handle nested error objects.
    if (typeof error === "object") {
      return Object.values(error).flatMap((item) => getErrorMessages(item));
    }

    return [String(error)];
  };

  // Display errors below the corresponding input.
  const renderFieldErrors = (fieldName) => {
    const messages = getErrorMessages(errors[fieldName]);

    return messages.map((message, index) => (
      <p className="field-error" key={`${fieldName}-${index}`}>
        {message}
      </p>
    ));
  };

  // Handle input changes.
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Allow only numeric phone input.
    if (name === "phone" && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    // Clear the corresponding error when the user edits a field.
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: undefined,
    }));

    setGeneralError("");
  };

  // Password strength validation.
  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  // Frontend validation.
  const validateForm = () => {
    const newErrors = {};

    const name = formData.full_name.trim();
    const email = formData.email.trim();

    if (name.length < 3 || !/^[A-Za-z ]+$/.test(name)) {
      newErrors.full_name = "Enter a valid full name with at least 3 letters.";
    }

    if (!email) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must contain exactly 10 digits.";
    }

    // Password must satisfy all backend password requirements.
    if (formData.password.length < 8) {
      newErrors.password = "Password must contain at least 8 characters.";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Include at least one uppercase letter.";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Include at least one lowercase letter.";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Include at least one number.";
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      newErrors.password = "Include at least one special character.";
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Please confirm your password.";
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Submit signup form.
  const handleSubmit = async (e) => {
    e.preventDefault();

    setGeneralError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/auth/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          password: formData.password,
          confirm_password: formData.confirm_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle backend field validation errors.
        const knownFields = [
          "full_name",
          "email",
          "phone",
          "password",
          "confirm_password",
        ];

        const fieldErrors = {};

        knownFields.forEach((field) => {
          if (data[field]) {
            fieldErrors[field] = data[field];
          }
        });

        setErrors(fieldErrors);

        const hasFieldErrors = Object.keys(fieldErrors).length > 0;

        if (!hasFieldErrors) {
          setGeneralError(
            data.detail ||
              data.message ||
              data.non_field_errors?.[0] ||
              "Unable to create account. Please try again.",
          );
        }

        return;
      }

      // Signup successful. Open OTP verification modal.
      setErrors({});
      setOtp("");
      setOtpError("");
      setOtpMessage("");

      setIsOtpModalOpen(true);
    } catch (error) {
      console.error("Signup error:", error);
      setGeneralError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP.
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setOtpError("");
    setOtpMessage("");

    if (otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (otpTimeLeft <= 0) {
      setOtpError("OTP has expired. Please request a new OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp: otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(
          data.otp || data.email || data.detail || "OTP verification failed.",
        );
        return;
      }

      // Navigate to login ONLY after successful verification.
      navigate("/login", {
        replace: true,
        state: {
          message: "Email verified successfully. Please sign in.",
          email: formData.email,
        },
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      setOtpError("Unable to connect to the server. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP.
  const handleResendOTP = async () => {
    if (otpTimeLeft > 0 || isResending || isVerifying) {
      return;
    }

    setOtpError("");
    setOtpMessage("");
    setIsResending(true);

    try {
      const response = await fetch(`${API_BASE}/auth/resend-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(
          data.email ||
            data.detail ||
            "Unable to resend OTP. Please try again.",
        );
        return;
      }

      // Stay on the OTP page after resending.
      setOtp("");
      setOtpTimerVersion((previousVersion) => previousVersion + 1);

      setOtpMessage(data.message || "A new OTP has been sent to your email.");
    } catch (error) {
      console.error("Resend OTP error:", error);
      setOtpError("Unable to connect to the server.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="signup-page">
      {/* Navigation */}
      <nav className="signup-navbar">
        <div className="nav-links">
          <Link to="/">Boutique</Link>
          <Link to="/">Optical</Link>
          <Link to="/">Sunwear</Link>
          <Link to="/">Atelier</Link>
        </div>

        <Link to="/" className="brand-logo">
          SPEQ
        </Link>

        <div className="nav-actions">
          <Link to="/login">Sign In</Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="signup-container">
        {/* Left panel */}
        <section className="signup-left">
          <div className="left-top">
            <span>THE ATELIER ARCHIVE</span>
            <span>EDITION Nº 04</span>
          </div>

          <div className="left-content">
            <p className="hero-description">
              Begin your bespoke optical journey. Curated precision engineered
              for a lifetime.
            </p>

            <span className="hero-location">
              FUKUI PREFECTURE • PARIS BE ATELIER
            </span>
          </div>
        </section>

        {/* Right panel */}
        <section className="signup-right">
          <div className="form-heading">
            <span className="form-badge">
              USER PORTAL / NEW SPEQ MEMBERSHIP
            </span>

            <h1>Create SpeQ Account</h1>

            <p>
              Experience eyewear crafted around your individuality and vision.
            </p>
          </div>

          {/* Authentication toggle */}
          <div className="auth-toggle">
            <button type="button" onClick={() => navigate("/login")}>
              Sign In
            </button>

            <button type="button" className="active">
              Create Account
            </button>
          </div>

          {/* Signup form */}
          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            {/* Full name */}
            <div className="form-group">
              <label htmlFor="full_name">FULL NAME</label>

              <input
                type="text"
                id="full_name"
                name="full_name"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                aria-invalid={Boolean(errors.full_name)}
              />

              {renderFieldErrors("full_name")}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">EMAIL ADDRESS</label>

              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />

              {renderFieldErrors("email")}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">PHONE NUMBER (OPTIONAL)</label>

              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                inputMode="numeric"
                autoComplete="tel"
              />

              {renderFieldErrors("phone")}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">CREATE PASSCODE</label>
                <span>Min. 8 characters</span>
              </div>

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Create your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  spellCheck="false"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Password strength */}
              <div className="password-strength">
                <div className="strength-track">
                  <div
                    className="strength-fill"
                    style={{ width: `${strengthScore * 20}%` }}
                  ></div>
                </div>

                <span>
                  {strengthScore === 0 && "Enter your password"}
                  {strengthScore === 1 && "Very weak password"}
                  {strengthScore === 2 && "Weak password"}
                  {strengthScore === 3 && "Medium strength"}
                  {strengthScore === 4 && "Strong password"}
                  {strengthScore === 5 && "Very strong password"}
                </span>
              </div>

              {renderFieldErrors("password")}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label htmlFor="confirm_password">CONFIRM PASSWORD</label>

              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                placeholder="Confirm your password"
                value={formData.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                spellCheck="false"
              />

              {renderFieldErrors("confirm_password")}
            </div>

            {/* General backend error */}
            {generalError && (
              <p className="field-error general-error">{generalError}</p>
            )}

            <button
              type="submit"
              className="signup-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>

            {/* Google signup */}
            <div className="google-signup">
              <GoogleLoginButton />
            </div>
          </form>
        </section>
      </main>

      {/* OTP verification modal */}
      {isOtpModalOpen && (
        <div className="otp-overlay">
          <div className="otp-modal">
            {/* Close button */}
            <button
              type="button"
              className="otp-close"
              onClick={() => setIsOtpModalOpen(false)}
              aria-label="Close verification modal"
            >
              <X size={18} />
            </button>

            {/* Watermark */}
            <span className="otp-watermark">SPEQ</span>

            {/* Modal header */}
            <div className="otp-header">
              <span className="otp-badge">
                CLIENT PORTAL / SECURITY PROTOCOL
              </span>

              <div className="otp-icon">
                <ShieldCheck size={30} strokeWidth={1.5} />
              </div>

              <h2>Two-Factor Authentication</h2>

              <p>
                We have dispatched a confidential 6-digit passcode to your email
                address.
              </p>

              <div className="otp-email">
                <AtSign size={15} />
                <span>{formData.email}</span>
              </div>
            </div>

            {/* OTP form */}
            <form onSubmit={handleVerifyOTP} className="otp-form">
              <label>ENTER MONOGRAPH KEY</label>

              <div
                className="otp-input-container"
                onClick={() => document.getElementById("otp-input")?.focus()}
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="otp-box" key={index}>
                    {otp[index] || <span className="otp-dot">•</span>}
                  </div>
                ))}

                <input
                  id="otp-input"
                  className="otp-hidden-input"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^\d{0,6}$/.test(value)) {
                      setOtp(value);
                      setOtpError("");
                    }
                  }}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Enter six-digit verification code"
                  autoFocus
                />
              </div>

              {otpError && <p className="field-error">{otpError}</p>}

              {otpMessage && <p className="success-message">{otpMessage}</p>}

              {/* Timer and resend */}
              <div className="otp-meta">
                <span>
                  <Clock3 size={15} />

                  {otpTimeLeft > 0 ? (
                    <>
                      Resend available in{" "}
                      <strong>
                        {String(Math.floor(otpTimeLeft / 60)).padStart(2, "0")}:
                        {String(otpTimeLeft % 60).padStart(2, "0")}
                      </strong>
                    </>
                  ) : (
                    <strong>OTP expired. Request a new code.</strong>
                  )}
                </span>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isVerifying || isResending || otpTimeLeft > 0}
                >
                  <RefreshCw size={14} />
                  {isResending ? "Sending..." : "Resend Code"}
                </button>
              </div>

              {/* Verify button */}
              <button
                type="submit"
                className="otp-submit"
                disabled={
                  isVerifying ||
                  isResending ||
                  otp.length !== 6 ||
                  otpTimeLeft <= 0
                }
              >
                {isVerifying ? "VERIFYING..." : "AUTHENTICATE & ENTER"}
                <ArrowRight size={17} />
              </button>

              {/* Back button */}
              <button
                type="button"
                className="otp-back"
                onClick={() => setIsOtpModalOpen(false)}
              >
                <ArrowLeft size={15} />
                Back to Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
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
            <Link to="/forgot-password">Forgot Password</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SPEQ. All rights reserved.</p>

          <div>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Cookie Preferences</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Signup;
