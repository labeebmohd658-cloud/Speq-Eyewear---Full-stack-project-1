
import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  UserRound,
  Mail,
  Phone,
  X,
  Pencil,
  ImagePlus,
} from "lucide-react";


import ProfileSidebar from "../components/ProfileSidebar";
import { API_BASE, apiRequest } from "../utils/api";

// Session storage keys.
const EMAIL_CHANGE_STORAGE_KEY = "customerEmailChangeOTP";
const PASSWORD_CHANGE_STORAGE_KEY = "customerPasswordChangeOTP";

// Reusable Arctic Premium styles.
const fieldClass =
  "h-13 w-full rounded-lg border border-[#D8E3EB] bg-[#F5F9FC] px-4 text-sm text-[#172B3A] outline-none transition-colors duration-200 placeholder:text-[#8295A5] focus:border-[#426782] focus:ring-2 focus:ring-[#426782]/15";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#172B3A] px-7 py-3 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#426782] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "rounded-full border border-[#D8E3EB] bg-white px-7 py-3 text-xs font-medium text-[#526879] transition-colors duration-200 hover:bg-[#EAF2F8] hover:text-[#172B3A] disabled:opacity-50";

// Get the first two initials from the user's name.
const getInitials = (name) => {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// Extract readable error messages from Django REST Framework responses.
const getErrorMessages = (error) => {
  if (!error) return [];

  if (Array.isArray(error)) {
    return error.flatMap((item) => getErrorMessages(item));
  }

  if (typeof error === "string") {
    return [error];
  }

  if (typeof error === "object") {
    return Object.values(error).flatMap((item) =>
      getErrorMessages(item)
    );
  }

  return [String(error)];
};

// Safely read a saved verification flow.
const readSavedFlow = (key) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
};

// Save verification metadata.
const saveFlow = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save verification session:", error);
  }
};

// Remove a saved verification flow.
const clearFlow = (key) => {
  sessionStorage.removeItem(key);
};

// Calculate remaining resend time from an absolute timestamp.
const getRemainingSeconds = (timestamp) => {
  if (!timestamp) return 0;

  const expiryTime = new Date(timestamp).getTime();

  if (Number.isNaN(expiryTime)) return 0;

  return Math.max(
    0,
    Math.ceil((expiryTime - Date.now()) / 1000)
  );
};

// Check whether a token expiry timestamp has passed.
const isTimestampExpired = (timestamp) => {
  if (!timestamp) return false;

  const expiryTime = new Date(timestamp).getTime();

  return (
    !Number.isNaN(expiryTime) &&
    expiryTime <= Date.now()
  );
};

// Reusable modal wrapper.
const Modal = ({ title, subtitle, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B3A]/55 p-4 backdrop-blur-sm"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      className="w-full max-w-md rounded-2xl border border-[#D8E3EB] bg-white p-6 shadow-[0_20px_60px_rgba(23,43,58,0.2)] sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#172B3A]">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#8295A5]">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="rounded-full p-2 text-[#8295A5] transition-colors duration-200 hover:bg-[#EAF2F8] hover:text-[#172B3A]"
        >
          <X size={19} />
        </button>
      </div>

      {children}
    </div>
  </div>
);

const Profile = () => {
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    profile_picture: "",
    is_email_verified: false,
  });

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  // Email change states.
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailResetToken, setEmailResetToken] = useState("");
  const [emailStep, setEmailStep] = useState(1);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Email OTP resend states.
  const [emailOtpTimeLeft, setEmailOtpTimeLeft] = useState(0);
  const [emailOtpResendAt, setEmailOtpResendAt] = useState(null);
  const [isResendingEmailOtp, setIsResendingEmailOtp] = useState(false);
  const [emailOtpResendMessage, setEmailOtpResendMessage] = useState("");

  // Password change states.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [passwordOtp, setPasswordOtp] = useState("");
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Password OTP resend states.
  const [passwordOtpTimeLeft, setPasswordOtpTimeLeft] = useState(0);
  const [passwordOtpResendAt, setPasswordOtpResendAt] = useState(null);
  const [isResendingPasswordOtp, setIsResendingPasswordOtp] = useState(false);
  const [passwordOtpResendMessage, setPasswordOtpResendMessage] = useState("");

  // Restore email-change and password-change sessions after a reload.
  useEffect(() => {
    const savedEmailFlow = readSavedFlow(EMAIL_CHANGE_STORAGE_KEY);

    if (savedEmailFlow?.purpose === "email_change") {
      if (
        savedEmailFlow.step === 2 &&
        savedEmailFlow.new_email
      ) {
        setNewEmail(savedEmailFlow.new_email);
        setEmailStep(2);
        setEmailOtp("");
        setEmailOtpResendAt(
          savedEmailFlow.resend_available_at || null
        );
        setShowEmailModal(true);
      } else if (
        savedEmailFlow.step === 3 &&
        savedEmailFlow.new_email &&
        savedEmailFlow.reset_token
      ) {
        if (
          isTimestampExpired(
            savedEmailFlow.reset_token_expires_at
          )
        ) {
          clearFlow(EMAIL_CHANGE_STORAGE_KEY);

          setNewEmail(savedEmailFlow.new_email);
          setEmailStep(1);
          setEmailError(
            "Your verification session expired. Please request a new OTP."
          );
          setShowEmailModal(true);
        } else {
          setNewEmail(savedEmailFlow.new_email);
          setEmailResetToken(savedEmailFlow.reset_token);
          setEmailStep(3);
          setShowEmailModal(true);
        }
      } else {
        clearFlow(EMAIL_CHANGE_STORAGE_KEY);
      }
    } else if (savedEmailFlow) {
      clearFlow(EMAIL_CHANGE_STORAGE_KEY);
    }

    const savedPasswordFlow = readSavedFlow(
      PASSWORD_CHANGE_STORAGE_KEY
    );

    if (savedPasswordFlow?.purpose === "password_change") {
      if (savedPasswordFlow.step === 2) {
        setPasswordStep(2);
        setPasswordOtp("");
        setPasswordOtpResendAt(
          savedPasswordFlow.resend_available_at || null
        );
        setShowPasswordModal(true);
      } else if (
        savedPasswordFlow.step === 3 &&
        savedPasswordFlow.reset_token
      ) {
        if (
          isTimestampExpired(
            savedPasswordFlow.reset_token_expires_at
          )
        ) {
          clearFlow(PASSWORD_CHANGE_STORAGE_KEY);

          setPasswordStep(1);
          setPasswordError(
            "Your verification session expired. Please request a new OTP."
          );
          setShowPasswordModal(true);
        } else {
          setPasswordResetToken(savedPasswordFlow.reset_token);
          setPasswordStep(3);
          setShowPasswordModal(true);
        }
      } else {
        clearFlow(PASSWORD_CHANGE_STORAGE_KEY);
      }
    } else if (savedPasswordFlow) {
      clearFlow(PASSWORD_CHANGE_STORAGE_KEY);
    }
  }, []);

  // Email OTP resend countdown.
  useEffect(() => {
    if (!emailOtpResendAt) {
      setEmailOtpTimeLeft(0);
      return;
    }

    const updateCountdown = () => {
      setEmailOtpTimeLeft(
        getRemainingSeconds(emailOtpResendAt)
      );
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [emailOtpResendAt]);

  // Password OTP resend countdown.
  useEffect(() => {
    if (!passwordOtpResendAt) {
      setPasswordOtpTimeLeft(0);
      return;
    }

    const updateCountdown = () => {
      setPasswordOtpTimeLeft(
        getRemainingSeconds(passwordOtpResendAt)
      );
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [passwordOtpResendAt]);

  // Automatically remove notifications after 3 seconds.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Check whether the user has an access token.
  const getToken = () => localStorage.getItem("access");

  // Read API response and handle nested validation errors.
  const readResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const messages = getErrorMessages(data);
      const message =
        messages[0] || "Something went wrong. Please try again.";

      throw new Error(message);
    }

    return data;
  };

  // Detect whether the user has changed their profile details.
  const isDirty =
    formData.full_name !== (profile.full_name || "") ||
    formData.phone !== (profile.phone || "");

  // Fetch profile information.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getToken();

        if (!token) {
          throw new Error("Please login to view your profile.");
        }

        const response = await apiRequest("/auth/profile/");
        const data = await readResponse(response);

        setProfile(data);

        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
        });
      } catch (error) {
        setPageError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle profile field changes.
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));
  };

  // Save profile changes.
  const handleSave = async (e) => {
    e.preventDefault();

    if (!isDirty) return;

    const token = getToken();

    if (!token) {
      showToast("Please login again.", "error");
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      showToast(
        "Enter a valid 10-digit Indian mobile number.",
        "error"
      );
      return;
    }

    const trimmedName = formData.full_name.trim();

    if (trimmedName.length < 3) {
      showToast(
        "Full name must contain at least 3 characters.",
        "error"
      );
      return;
    }

    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedName)) {
      showToast(
        "Full name can contain only letters, spaces, hyphens and apostrophes.",
        "error"
      );
      return;
    }

    if (trimmedName.replace(/[^A-Za-z]/g, "").length < 3) {
      showToast(
        "Full name must contain at least 3 letters.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const response = await apiRequest("/auth/profile/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          full_name: formData.full_name.trim(),
        }),
      });

      const data = await readResponse(response);

      setProfile((previous) => ({
        ...previous,
        ...data,
      }));

      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
      });

      showToast("Profile updated successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Discard profile changes.
  const handleDiscard = () => {
    setFormData({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
    });
  };

  // Upload profile picture to Cloudinary through Django.
  const handlePhotoUpload = async (e) => {
    const image = e.target.files?.[0];

    if (!image) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(image.type)) {
      showToast(
        "Only JPG, PNG and WEBP images are allowed.",
        "error"
      );
      e.target.value = "";
      return;
    }

    if (image.size > 2 * 1024 * 1024) {
      showToast("Image size must not exceed 2 MB.", "error");
      e.target.value = "";
      return;
    }

    const token = getToken();

    if (!token) {
      showToast("Please login again.", "error");
      return;
    }

    setPhotoLoading(true);

    try {
      const uploadData = new FormData();
      uploadData.append("profile_picture", image);

      const response = await apiRequest(
        "/auth/profile/upload-picture/",
        {
          method: "POST",
          body: uploadData,
        }
      );

      const data = await readResponse(response);

      setProfile((previous) => ({
        ...previous,
        profile_picture: data.profile_picture,
      }));

      showToast("Profile picture updated successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setPhotoLoading(false);
      e.target.value = "";
    }
  };

  // Reset and close email modal.
  const closeEmailModal = () => {
    clearFlow(EMAIL_CHANGE_STORAGE_KEY);

    setShowEmailModal(false);
    setNewEmail("");
    setEmailOtp("");
    setEmailResetToken("");
    setEmailStep(1);
    setEmailError("");

    setEmailOtpTimeLeft(0);
    setEmailOtpResendAt(null);
    setEmailOtpResendMessage("");
    setIsResendingEmailOtp(false);
  };

  // Request email change OTP.
  const handleEmailRequest = async () => {
    setEmailError("");

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError("Please enter your new email address.");
      return;
    }

    if (
      normalizedEmail ===
      profile.email?.trim().toLowerCase()
    ) {
      setEmailError(
        "Your new email must be different from your current email."
      );
      return;
    }

    setEmailLoading(true);

    try {
      const response = await apiRequest(
        "/auth/change-email/request-otp/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_email: normalizedEmail,
          }),
        }
      );

      const data = await readResponse(response);

      const resendAvailableAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      saveFlow(EMAIL_CHANGE_STORAGE_KEY, {
        purpose: "email_change",
        step: 2,
        new_email: normalizedEmail,
        otp_expires_at: data.expires_at || null,
        resend_available_at: resendAvailableAt,
      });

      setNewEmail(normalizedEmail);
      setEmailOtp("");
      setEmailResetToken("");
      setEmailOtpResendAt(resendAvailableAt);
      setEmailOtpResendMessage("");
      setEmailStep(2);

      showToast("Verification OTP sent to your new email.");
    } catch (error) {
      setEmailError(error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Verify email OTP.
  const handleEmailVerify = async () => {
    setEmailError("");

    if (!/^\d{6}$/.test(emailOtp)) {
      setEmailError("Enter a valid 6-digit OTP.");
      return;
    }

    setEmailLoading(true);

    try {
      const response = await apiRequest(
        "/auth/change-email/verify-otp/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            otp: emailOtp,
          }),
        }
      );

      const data = await readResponse(response);

      if (!data.reset_token) {
        throw new Error(
          "Verification token was not returned by the server."
        );
      }

      saveFlow(EMAIL_CHANGE_STORAGE_KEY, {
        purpose: "email_change",
        step: 3,
        new_email: newEmail.trim().toLowerCase(),
        reset_token: data.reset_token,
        reset_token_expires_at:
          data.reset_token_expires_at || null,
      });

      setEmailResetToken(data.reset_token);
      setEmailOtp("");
      setEmailStep(3);

      showToast("Email OTP verified successfully.");
    } catch (error) {
      setEmailError(error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Confirm email change.
  // This endpoint uses reset_token, not JWT authentication.
  const handleEmailConfirm = async () => {
    setEmailError("");

    if (!emailResetToken) {
      setEmailError(
        "Email verification token is missing. Please verify again."
      );
      return;
    }

    setEmailLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/change-email/confirm/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reset_token: emailResetToken,
          }),
        }
      );

      const data = await readResponse(response);

      setProfile((previous) => ({
        ...previous,
        email: data.email,
        is_email_verified: true,
      }));

      clearFlow(EMAIL_CHANGE_STORAGE_KEY);
      closeEmailModal();

      showToast("Email address changed successfully.");
    } catch (error) {
      setEmailError(error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Reset and close password modal.
  const closePasswordModal = () => {
    clearFlow(PASSWORD_CHANGE_STORAGE_KEY);

    setShowPasswordModal(false);
    setPasswordStep(1);
    setPasswordOtp("");
    setPasswordResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");

    setPasswordOtpTimeLeft(0);
    setPasswordOtpResendAt(null);
    setPasswordOtpResendMessage("");
    setIsResendingPasswordOtp(false);
  };

  // Send password change OTP.
  const handlePasswordRequest = async () => {
    setPasswordError("");
    setPasswordLoading(true);

    try {
      const response = await apiRequest(
        "/auth/change-password/send-otp/",
        {
          method: "POST",
        }
      );

      const data = await readResponse(response);

      const resendAvailableAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      saveFlow(PASSWORD_CHANGE_STORAGE_KEY, {
        purpose: "password_change",
        step: 2,
        otp_expires_at: data.expires_at || null,
        resend_available_at: resendAvailableAt,
      });

      setPasswordOtp("");
      setPasswordResetToken("");
      setPasswordOtpResendAt(resendAvailableAt);
      setPasswordOtpResendMessage("");
      setPasswordStep(2);

      showToast("Password verification OTP sent.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Verify password change OTP.
  const handlePasswordVerify = async () => {
    setPasswordError("");

    if (!/^\d{6}$/.test(passwordOtp)) {
      setPasswordError("Enter a valid 6-digit OTP.");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await apiRequest(
        "/auth/change-password/verify-otp/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            otp: passwordOtp,
          }),
        }
      );

      const data = await readResponse(response);

      if (!data.reset_token) {
        throw new Error(
          "Verification token was not returned by the server."
        );
      }

      saveFlow(PASSWORD_CHANGE_STORAGE_KEY, {
        purpose: "password_change",
        step: 3,
        reset_token: data.reset_token,
        reset_token_expires_at:
          data.reset_token_expires_at || null,
      });

      setPasswordResetToken(data.reset_token);
      setPasswordOtp("");
      setPasswordStep(3);

      showToast("Password OTP verified successfully.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Validate the new password.
  const validateNewPassword = () => {
    if (newPassword.length < 8) {
      return "Password must contain at least 8 characters.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "Include at least one uppercase letter.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "Include at least one lowercase letter.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "Include at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "Include at least one special character.";
    }

    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  // Set new password.
  // This endpoint uses reset_token, not JWT authentication.
  const handleSetNewPassword = async () => {
    setPasswordError("");

    if (!passwordResetToken) {
      setPasswordError(
        "Password verification token is missing. Please verify again."
      );
      return;
    }

    const validationError = validateNewPassword();

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/change-password/set-new-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reset_token: passwordResetToken,
            new_password: newPassword,
          }),
        }
      );

      await readResponse(response);

      clearFlow(PASSWORD_CHANGE_STORAGE_KEY);
      closePasswordModal();

      showToast(
        "Your password has been changed successfully."
      );
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Resend email verification OTP.
  const handleResendEmailOtp = async () => {
    if (
      emailOtpTimeLeft > 0 ||
      isResendingEmailOtp
    ) {
      return;
    }

    setIsResendingEmailOtp(true);
    setEmailOtpResendMessage("");

    try {
      const response = await apiRequest(
        "/auth/change-email/request-otp/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_email: newEmail.trim().toLowerCase(),
          }),
        }
      );

      const data = await readResponse(response);

      const resendAvailableAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      saveFlow(EMAIL_CHANGE_STORAGE_KEY, {
        purpose: "email_change",
        step: 2,
        new_email: newEmail.trim().toLowerCase(),
        otp_expires_at: data.expires_at || null,
        resend_available_at: resendAvailableAt,
      });

      setEmailOtp("");
      setEmailOtpResendAt(resendAvailableAt);
      setEmailOtpResendMessage(
        data.message || "A new verification OTP has been sent."
      );
    } catch (error) {
      setEmailOtpResendMessage(error.message);
    } finally {
      setIsResendingEmailOtp(false);
    }
  };

  // Resend password verification OTP.
  const handleResendPasswordOtp = async () => {
    if (
      passwordOtpTimeLeft > 0 ||
      isResendingPasswordOtp
    ) {
      return;
    }

    setIsResendingPasswordOtp(true);
    setPasswordOtpResendMessage("");

    try {
      const response = await apiRequest(
        "/auth/change-password/send-otp/",
        {
          method: "POST",
        }
      );

      const data = await readResponse(response);

      const resendAvailableAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      saveFlow(PASSWORD_CHANGE_STORAGE_KEY, {
        purpose: "password_change",
        step: 2,
        otp_expires_at: data.expires_at || null,
        resend_available_at: resendAvailableAt,
      });

      setPasswordOtp("");
      setPasswordOtpResendAt(resendAvailableAt);
      setPasswordOtpResendMessage(
        data.message || "A new password verification OTP has been sent."
      );
    } catch (error) {
      setPasswordOtpResendMessage(error.message);
    } finally {
      setIsResendingPasswordOtp(false);
    }
  };

  const initials = getInitials(profile.full_name);

  return (
    <div className="min-h-screen bg-[#EAF2F8] text-[#172B3A]">


      {/* Floating notification */}
      {toast && (
        <div className="fixed right-4 top-20 z-[60] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-[0_8px_30px_rgba(23,43,58,0.12)] ${
              toast.type === "error"
                ? "border-red-200"
                : "border-[#D8E3EB]"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle
                className="shrink-0 text-red-600"
                size={20}
              />
            ) : (
              <CheckCircle2
                className="shrink-0 text-[#426782]"
                size={20}
              />
            )}

            <p className="flex-1 text-sm text-[#172B3A]">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="text-[#8295A5] transition-colors hover:text-[#172B3A]"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#426782]">
            SpeQ Eyewear / My Account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-[#172B3A] sm:text-4xl">
            Your Account
          </h1>

          <p className="mt-2 text-sm text-[#8295A5]">
            Manage your personal information and account preferences.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#D8E3EB] bg-white p-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#426782] border-t-transparent" />
            <span className="text-sm text-[#8295A5]">
              Loading your account...
            </span>
          </div>
        )}

        {/* Page error */}
        {!loading && pageError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{pageError}</p>
          </div>
        )}

        {!loading && !pageError && (
          <>
            {/* Customer summary */}
            <section className="rounded-2xl border border-[#D8E3EB] bg-white p-6 shadow-[0_4px_20px_rgba(23,43,58,0.04)] transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(23,43,58,0.07)] sm:p-8">
              <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#172B3A] text-2xl font-semibold text-white">
                      {profile.profile_picture ? (
                        <img
                          src={profile.profile_picture}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    {profile.is_email_verified && (
                      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#EAF2F8] p-1">
                        <ShieldCheck
                          size={17}
                          className="text-[#426782]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#426782]">
                      Personal Account
                    </p>

                    <h2 className="mt-1 truncate text-2xl font-semibold text-[#172B3A] sm:text-3xl">
                      {profile.full_name || "Customer"}
                    </h2>

                    <p className="mt-1 break-all text-sm text-[#8295A5]">
                      {profile.email}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#526879]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#426782]" />
                      {profile.is_email_verified
                        ? "Verified account"
                        : "Email verification pending"}
                    </span>
                  </div>
                </div>

                {/* Account information */}
                <div className="grid grid-cols-2 gap-3 lg:w-[340px]">
                  <div className="rounded-xl border border-[#D8E3EB] bg-[#F5F9FC] p-4 transition-colors duration-200 hover:bg-[#EAF2F8]">
                    <p className="text-xs text-[#8295A5]">
                      Account Status
                    </p>

                    <p className="mt-2 text-xl font-semibold text-[#172B3A]">
                      Active
                    </p>

                    <p className="mt-1 text-[10px] text-[#8295A5]">
                      Account access
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D8E3EB] bg-[#F5F9FC] p-4 transition-colors duration-200 hover:bg-[#EAF2F8]">
                    <p className="text-xs text-[#8295A5]">
                      Email Status
                    </p>

                    <p className="mt-2 text-xl font-semibold text-[#172B3A]">
                      {profile.is_email_verified
                        ? "Verified"
                        : "Pending"}
                    </p>

                    <p className="mt-1 text-[10px] text-[#8295A5]">
                      Primary email
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Main layout */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">

              {/* Sidebar */}
              <aside>
                <ProfileSidebar activeItem="Personal Information" />
              </aside>

              {/* Profile form */}
              <section className="min-w-0 overflow-hidden rounded-2xl border border-[#D8E3EB] bg-white shadow-[0_4px_20px_rgba(23,43,58,0.04)]">

                {/* Section heading */}
                <div className="border-b border-[#E5EDF3] px-6 py-7 sm:px-9">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#426782]">
                    Personal Details
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-[#172B3A] sm:text-3xl">
                    Account Information
                  </h2>

                  <p className="mt-2 text-sm text-[#8295A5]">
                    Keep your contact details up to date.
                  </p>
                </div>

                <form onSubmit={handleSave}>

                  {/* Profile picture */}
                  <div className="flex flex-col items-center border-b border-[#E5EDF3] px-6 py-8 sm:px-9">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#D8E3EB] bg-[#172B3A] text-3xl font-semibold text-white">
                        {profile.profile_picture ? (
                          <img
                            src={profile.profile_picture}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>

                      <div className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#426782] p-1.5">
                        <Pencil size={14} className="text-white" />
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />

                    <button
                      type="button"
                      disabled={photoLoading}
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D8E3EB] px-5 py-2.5 text-xs font-medium text-[#426782] transition-colors duration-200 hover:border-[#426782] hover:bg-[#EAF2F8] disabled:opacity-50"
                    >
                      <ImagePlus size={15} />

                      {photoLoading
                        ? "Uploading..."
                        : "Change Photo"}
                    </button>

                    <p className="mt-2 text-[10px] text-[#8295A5]">
                      PNG, JPG or WEBP · Maximum 2 MB
                    </p>
                  </div>

                  {/* Form fields */}
                  <div className="px-6 py-8 sm:px-9">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                      {/* Full name */}
                      <div>
                        <label
                          htmlFor="full_name"
                          className="mb-2 block text-[10px] font-semibold tracking-[0.12em] text-[#526879]"
                        >
                          FULL LEGAL NAME
                        </label>

                        <div className="relative">
                          <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your full name"
                            className={`${fieldClass} pr-11`}
                          />

                          <UserRound
                            size={17}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8295A5]"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <label className="text-[10px] font-semibold tracking-[0.12em] text-[#526879]">
                            PRIMARY EMAIL
                          </label>

                          {profile.is_email_verified && (
                            <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[9px] font-semibold text-[#426782]">
                              VERIFIED
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <div className="relative min-w-0 flex-1">
                            <input
                              type="email"
                              value={profile.email}
                              readOnly
                              className={`${fieldClass} bg-[#EEF3F7] pr-10 text-[#8295A5]`}
                            />

                            <Mail
                              size={17}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8295A5]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowEmailModal(true)}
                            className="shrink-0 rounded-lg border border-[#D8E3EB] px-3 text-xs font-medium text-[#426782] transition-colors duration-200 hover:border-[#426782] hover:bg-[#EAF2F8]"
                          >
                            Change
                          </button>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="md:col-span-2">
                        <label
                          htmlFor="phone"
                          className="mb-2 block text-[10px] font-semibold tracking-[0.12em] text-[#526879]"
                        >
                          TELEPHONE CONTACT
                        </label>

                        <div className="relative">
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your 10-digit phone number"
                            className={`${fieldClass} pr-11`}
                          />

                          <Phone
                            size={17}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8295A5]"
                          />
                        </div>

                        <p className="mt-2 text-[10px] text-[#8295A5]">
                          Optional · Enter exactly 10 digits if provided.
                        </p>
                      </div>
                    </div>

                    {/* Security section */}
                    <div className="mt-10 border-t border-[#E5EDF3] pt-8">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-lg bg-[#EAF2F8] p-2.5">
                          <ShieldCheck
                            size={20}
                            className="text-[#426782]"
                          />
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-[#172B3A]">
                            Security & Account Access
                          </h3>

                          <p className="mt-1 text-xs text-[#8295A5]">
                            Protect your account with a secure password.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-xl border border-[#D8E3EB] bg-[#F5F9FC] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-medium text-[#526879]">
                            Account Passcode
                          </p>

                          <p className="mt-1 tracking-[0.25em] text-[#172B3A]">
                            ••••••••••••
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordModal(true)
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#172B3A] px-5 py-3 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#426782]"
                        >
                          <LockKeyhole size={15} />
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save and discard */}
                  {isDirty && (
                    <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#E5EDF3] bg-[#F5F9FC] px-6 py-5 sm:flex-row sm:px-9">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={saving}
                        className={secondaryButtonClass}
                      >
                        Discard
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className={primaryButtonClass}
                      >
                        <CheckCircle2 size={15} />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </form>
              </section>
            </div>
          </>
        )}
      </main>


      {/* EMAIL CHANGE MODAL */}
      {showEmailModal && (
        <Modal
          title="Change Email Address"
          subtitle="Verify your new email address to update your account."
          onClose={closeEmailModal}
        >
          <div className="space-y-4">
            {emailStep === 1 && (
              <>
                <label className="block text-xs font-medium text-[#526879]">
                  NEW EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  className={fieldClass}
                />

                <button
                  type="button"
                  onClick={handleEmailRequest}
                  disabled={emailLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {emailLoading
                    ? "Sending..."
                    : "Send Verification OTP"}
                </button>
              </>
            )}

            {emailStep === 2 && (
              <>
                <p className="text-sm text-[#8295A5]">
                  Enter the 6-digit code sent to{" "}
                  <strong className="text-[#172B3A]">{newEmail}</strong>.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) =>
                    setEmailOtp(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="000000"
                  className={`${fieldClass} text-center text-xl tracking-[0.4em]`}
                />

                <div className="rounded-lg bg-[#F5F9FC] p-3 text-center text-xs text-[#526879]">
                  {emailOtpTimeLeft > 0 ? (
                    <p>
                      Resend OTP in{" "}
                      <strong className="text-[#172B3A]">
                        {emailOtpTimeLeft}s
                      </strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendEmailOtp}
                      disabled={isResendingEmailOtp}
                      className="font-semibold text-[#426782] transition-colors hover:text-[#172B3A] disabled:opacity-50"
                    >
                      {isResendingEmailOtp
                        ? "SENDING..."
                        : "RESEND OTP"}
                    </button>
                  )}

                  {emailOtpResendMessage && (
                    <p className="mt-2 text-[#526879]">
                      {emailOtpResendMessage}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEmailVerify}
                  disabled={emailLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {emailLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}

            {emailStep === 3 && (
              <>
                <div className="rounded-xl border border-[#D8E3EB] bg-[#EAF2F8] p-4 text-center">
                  <ShieldCheck
                    size={30}
                    className="mx-auto text-[#426782]"
                  />

                  <p className="mt-2 text-sm font-medium text-[#172B3A]">
                    New email verified
                  </p>

                  <p className="mt-1 text-xs text-[#8295A5]">
                    Confirm to replace your current email address.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEmailConfirm}
                  disabled={emailLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {emailLoading
                    ? "Updating..."
                    : "Confirm Email Change"}
                </button>
              </>
            )}

            {emailError && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {emailError}
              </p>
            )}

            <button
              type="button"
              onClick={closeEmailModal}
              className="w-full py-2 text-xs text-[#8295A5] transition-colors hover:text-[#172B3A]"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {showPasswordModal && (
        <Modal
          title="Update Password"
          subtitle="Verify your identity before creating a new password."
          onClose={closePasswordModal}
        >
          <div className="space-y-4">
            {passwordStep === 1 && (
              <>
                <div className="rounded-xl border border-[#D8E3EB] bg-[#F5F9FC] p-4">
                  <p className="text-xs text-[#8295A5]">
                    VERIFICATION EMAIL
                  </p>

                  <p className="mt-1 break-all text-sm text-[#172B3A]">
                    {profile.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordRequest}
                  disabled={passwordLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {passwordLoading
                    ? "Sending..."
                    : "Send Verification OTP"}
                </button>
              </>
            )}

            {passwordStep === 2 && (
              <>
                <p className="text-sm text-[#8295A5]">
                  Enter the 6-digit OTP sent to your registered email.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={passwordOtp}
                  onChange={(e) =>
                    setPasswordOtp(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="000000"
                  className={`${fieldClass} text-center text-xl tracking-[0.4em]`}
                />

                <div className="rounded-lg bg-[#F5F9FC] p-3 text-center text-xs text-[#526879]">
                  {passwordOtpTimeLeft > 0 ? (
                    <p>
                      Resend OTP in{" "}
                      <strong className="text-[#172B3A]">
                        {passwordOtpTimeLeft}s
                      </strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendPasswordOtp}
                      disabled={isResendingPasswordOtp}
                      className="font-semibold text-[#426782] transition-colors hover:text-[#172B3A] disabled:opacity-50"
                    >
                      {isResendingPasswordOtp
                        ? "SENDING..."
                        : "RESEND OTP"}
                    </button>
                  )}

                  {passwordOtpResendMessage && (
                    <p className="mt-2 text-[#526879]">
                      {passwordOtpResendMessage}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePasswordVerify}
                  disabled={passwordLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {passwordLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}

            {passwordStep === 3 && (
              <>
                <label className="block text-xs font-medium text-[#526879]">
                  NEW PASSWORD
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={fieldClass}
                />

                <label className="block text-xs font-medium text-[#526879]">
                  CONFIRM NEW PASSWORD
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  className={fieldClass}
                />

                <div className="rounded-lg border border-[#D8E3EB] bg-[#F5F9FC] p-3 text-[11px] leading-6 text-[#526879]">
                  <p className="font-semibold text-[#172B3A]">
                    Password requirements:
                  </p>

                  <ul className="list-disc pl-5">
                    <li>Minimum 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleSetNewPassword}
                  disabled={passwordLoading}
                  className={`w-full ${primaryButtonClass}`}
                >
                  {passwordLoading
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </>
            )}

            {passwordError && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {passwordError}
              </p>
            )}

            <button
              type="button"
              onClick={closePasswordModal}
              className="w-full py-2 text-xs text-[#8295A5] transition-colors hover:text-[#172B3A]"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Profile;
