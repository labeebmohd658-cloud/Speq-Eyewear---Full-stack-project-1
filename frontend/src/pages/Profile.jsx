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

import ProfileNavbar from "../components/ProfileNavbar";
import ProfileSidebar from "../components/ProfileSidebar";
import { API_BASE, apiRequest } from "../utils/api";

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
    return Object.values(error).flatMap((item) => getErrorMessages(item));
  }

  return [String(error)];
};

// Reusable modal wrapper.
const Modal = ({ title, subtitle, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#29251f]">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#81776B]">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
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
  const [emailOtpTimeLeft, setEmailOtpTimeLeft] = useState(60);
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
  const [passwordOtpTimeLeft, setPasswordOtpTimeLeft] = useState(60);
  const [isResendingPasswordOtp, setIsResendingPasswordOtp] = useState(false);
  const [passwordOtpResendMessage, setPasswordOtpResendMessage] = useState("");

  // Run the email OTP countdown while the email verification step is active.
  useEffect(() => {
    if (emailStep !== 2) return;

    const timer = setInterval(() => {
      setEmailOtpTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [emailStep]);

  // Run the password OTP countdown while the password verification step is active.
  useEffect(() => {
    if (passwordStep !== 2) return;

    const timer = setInterval(() => {
      setPasswordOtpTimeLeft((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [passwordStep]);

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
      const message = messages[0] || "Something went wrong. Please try again.";

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
      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
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
      showToast("Enter a valid 10-digit Indian mobile number.", "error");
      return;
    }

    const trimmedName = formData.full_name.trim();

    if (trimmedName.length < 3) {
      showToast("Full name must contain at least 3 characters.", "error");
      return;
    }

    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedName)) {
      showToast(
        "Full name can contain only letters, spaces, hyphens and apostrophes.",
        "error",
      );
      return;
    }

    if (trimmedName.replace(/[^A-Za-z]/g, "").length < 3) {
      showToast("Full name must contain at least 3 letters.", "error");
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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(image.type)) {
      showToast("Only JPG, PNG and WEBP images are allowed.", "error");
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

      // Do not manually set Content-Type for FormData.
      // The browser must add the multipart boundary.
      const response = await apiRequest("/auth/profile/upload-picture/", {
        method: "POST",
        body: uploadData,
      });

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
    setShowEmailModal(false);
    setNewEmail("");
    setEmailOtp("");
    setEmailResetToken("");
    setEmailStep(1);
    setEmailError("");

    setEmailOtpTimeLeft(60);
    setEmailOtpResendMessage("");
    setIsResendingEmailOtp(false);
  };

  // Request email change OTP.
  const handleEmailRequest = async () => {
    setEmailError("");

    if (!newEmail.trim()) {
      setEmailError("Please enter your new email address.");
      return;
    }

    if (newEmail.trim().toLowerCase() === profile.email?.trim().toLowerCase()) {
      setEmailError(
        "Your new email must be different from your current email.",
      );
      return;
    }

    setEmailLoading(true);

    try {
      const response = await apiRequest("/auth/change-email/request-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_email: newEmail.trim(),
        }),
      });

      await readResponse(response);

      setEmailOtpTimeLeft(60);
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
      const response = await apiRequest("/auth/change-email/verify-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp: emailOtp }),
      });

      const data = await readResponse(response);

      setEmailResetToken(data.reset_token);
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
        "Email verification token is missing. Please verify again.",
      );
      return;
    }

    setEmailLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/change-email/confirm/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reset_token: emailResetToken,
        }),
      });

      const data = await readResponse(response);

      setProfile((previous) => ({
        ...previous,
        email: data.email,
        is_email_verified: true,
      }));

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
    setShowPasswordModal(false);
    setPasswordStep(1);
    setPasswordOtp("");
    setPasswordResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");

    setPasswordOtpTimeLeft(60);
    setPasswordOtpResendMessage("");
    setIsResendingPasswordOtp(false);
  };

  // Send password change OTP.
  const handlePasswordRequest = async () => {
    setPasswordError("");
    setPasswordLoading(true);

    try {
      const response = await apiRequest("/auth/change-password/send-otp/", {
        method: "POST",
      });

      await readResponse(response);

      setPasswordOtpTimeLeft(60);
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
      const response = await apiRequest("/auth/change-password/verify-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: passwordOtp,
        }),
      });

      const data = await readResponse(response);

      setPasswordResetToken(data.reset_token);
      setPasswordStep(3);

      showToast("Password OTP verified successfully.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Validate the new password using the same rules as signup/reset password.
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
        "Password verification token is missing. Please verify again.",
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
        },
      );

      await readResponse(response);

      closePasswordModal();
      showToast("Your password has been changed successfully.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Resend email verification OTP after the countdown finishes.
  const handleResendEmailOtp = async () => {
    if (emailOtpTimeLeft > 0 || isResendingEmailOtp) return;

    setIsResendingEmailOtp(true);
    setEmailOtpResendMessage("");

    try {
      const response = await apiRequest("/auth/change-email/request-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_email: newEmail.trim(),
        }),
      });

      const data = await readResponse(response);

      setEmailOtpTimeLeft(60);
      setEmailOtpResendMessage(
        data.message || "A new verification OTP has been sent.",
      );
    } catch (error) {
      setEmailOtpResendMessage(error.message);
    } finally {
      setIsResendingEmailOtp(false);
    }
  };

  // Resend password verification OTP after the countdown finishes.
  const handleResendPasswordOtp = async () => {
    if (passwordOtpTimeLeft > 0 || isResendingPasswordOtp) return;

    setIsResendingPasswordOtp(true);
    setPasswordOtpResendMessage("");

    try {
      const response = await apiRequest("/auth/change-password/send-otp/", {
        method: "POST",
      });

      const data = await readResponse(response);

      setPasswordOtpTimeLeft(60);
      setPasswordOtpResendMessage(
        data.message || "A new password verification OTP has been sent.",
      );
    } catch (error) {
      setPasswordOtpResendMessage(error.message);
    } finally {
      setIsResendingPasswordOtp(false);
    }
  };

  const initials = getInitials(profile.full_name);

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#29251f]">
      <ProfileNavbar />

      {/* Floating notification */}
      {toast && (
        <div className="fixed right-4 top-20 z-[60] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-3 duration-300">
          <div
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-xl ${
              toast.type === "error" ? "border-red-200" : "border-[#eae3d8]"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="shrink-0 text-red-600" size={20} />
            ) : (
              <CheckCircle2 className="shrink-0 text-green-700" size={20} />
            )}

            <p className="flex-1 text-sm text-[#3b342b]">{toast.message}</p>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={17} className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a88962]">
            SpeQ Eyewear / My Account
          </p>

          <h1 className="font-serif text-3xl text-[#29251f] sm:text-4xl">
            Your Account
          </h1>

          <p className="mt-2 text-sm text-[#81776B]">
            Manage your personal information and account preferences.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#a88962] border-t-transparent" />
            <span className="text-sm text-gray-500">
              Loading your account...
            </span>
          </div>
        )}

        {!loading && pageError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-sm text-red-700">{pageError}</p>
          </div>
        )}

        {!loading && !pageError && (
          <>
            {/* Customer summary */}
            <section className="rounded-2xl border border-[#eee9e1] bg-white p-6 shadow-[0_4px_25px_rgba(41,37,31,0.035)] sm:p-8">
              <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#29251f] font-serif text-2xl text-white">
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
                      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#d8c3a5] p-1">
                        <ShieldCheck size={17} className="text-[#5b4933]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a88962]">
                      Personal Account
                    </p>

                    <h2 className="mt-1 truncate font-serif text-2xl text-[#29251f] sm:text-3xl">
                      {profile.full_name || "Customer"}
                    </h2>

                    <p className="mt-1 break-all text-sm text-[#81776B]">
                      {profile.email}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#81776B]">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                      {profile.is_email_verified
                        ? "Verified account"
                        : "Email verification pending"}
                    </span>
                  </div>
                </div>

                {/* Account information */}
                <div className="grid grid-cols-2 gap-3 lg:w-[340px]">
                  <div className="rounded-xl bg-[#f7f6f3] p-4">
                    <p className="text-xs text-[#81776B]">Account Status</p>
                    <p className="mt-2 font-serif text-xl text-[#29251f]">
                      Active
                    </p>
                    <p className="mt-1 text-[10px] text-[#81776B]">
                      Account access
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f7f6f3] p-4">
                    <p className="text-xs text-[#81776B]">Email Status</p>
                    <p className="mt-2 font-serif text-xl text-[#29251f]">
                      {profile.is_email_verified ? "Verified" : "Pending"}
                    </p>
                    <p className="mt-1 text-[10px] text-[#81776B]">
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
                <ProfileSidebar />
              </aside>

              {/* Profile form */}
              <section className="min-w-0 overflow-hidden rounded-2xl border border-[#eee9e1] bg-white shadow-[0_4px_25px_rgba(41,37,31,0.035)]">
                <div className="border-b border-[#eee9e1] px-6 py-7 sm:px-9">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a88962]">
                    Personal Details
                  </p>

                  <h2 className="mt-2 font-serif text-2xl text-[#29251f] sm:text-3xl">
                    Account Information
                  </h2>

                  <p className="mt-2 text-sm text-[#81776B]">
                    Keep your contact details up to date.
                  </p>
                </div>

                <form onSubmit={handleSave}>
                  {/* Profile picture */}
                  <div className="flex flex-col items-center border-b border-[#eee9e1] px-6 py-8 sm:px-9">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#29251f] font-serif text-3xl text-white">
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

                      <div className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-[#d8c3a5] p-1.5">
                        <Pencil size={14} className="text-[#5b4933]" />
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
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e8e1d6] px-5 py-2.5 text-xs font-medium text-[#5c5143] transition hover:bg-[#f7f4ef] disabled:opacity-50"
                    >
                      <ImagePlus size={15} />
                      {photoLoading ? "Uploading..." : "Change Photo"}
                    </button>

                    <p className="mt-2 text-[10px] text-[#a49a8d]">
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
                          className="mb-2 block text-[10px] font-semibold tracking-[0.12em] text-[#81776B]"
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
                            className="h-13 w-full rounded-lg bg-[#f7f6f3] px-4 pr-11 text-sm text-[#29251f] outline-none transition focus:ring-2 focus:ring-[#d8c3a5]/50"
                          />

                          <UserRound
                            size={17}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a49a8d]"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <label className="text-[10px] font-semibold tracking-[0.12em] text-[#81776B]">
                            PRIMARY EMAIL
                          </label>

                          {profile.is_email_verified && (
                            <span className="rounded-full bg-[#f4eddf] px-2 py-0.5 text-[9px] font-semibold text-[#8d704d]">
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
                              className="h-13 w-full rounded-lg bg-[#f7f6f3] px-4 pr-10 text-sm text-[#81776B] outline-none"
                            />

                            <Mail
                              size={17}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a49a8d]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowEmailModal(true)}
                            className="shrink-0 rounded-lg border border-[#d8c3a5] px-3 text-xs font-medium text-[#8d704d] transition hover:bg-[#f7f4ef]"
                          >
                            Change
                          </button>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="md:col-span-2">
                        <label
                          htmlFor="phone"
                          className="mb-2 block text-[10px] font-semibold tracking-[0.12em] text-[#81776B]"
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
                            className="h-13 w-full rounded-lg bg-[#f7f6f3] px-4 pr-11 text-sm text-[#29251f] outline-none transition focus:ring-2 focus:ring-[#d8c3a5]/50"
                          />

                          <Phone
                            size={17}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a49a8d]"
                          />
                        </div>

                        <p className="mt-2 text-[10px] text-[#a49a8d]">
                          Optional · Enter exactly 10 digits if provided.
                        </p>
                      </div>
                    </div>

                    {/* Security section */}
                    <div className="mt-10 border-t border-[#eee9e1] pt-8">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-lg bg-[#f5f1e9] p-2.5">
                          <ShieldCheck size={20} className="text-[#a88962]" />
                        </div>

                        <div>
                          <h3 className="font-serif text-xl text-[#29251f]">
                            Security & Account Access
                          </h3>
                          <p className="mt-1 text-xs text-[#81776B]">
                            Protect your account with a secure password.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-xl bg-[#f7f6f3] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-medium text-[#81776B]">
                            Account Passcode
                          </p>
                          <p className="mt-1 tracking-[0.25em] text-[#29251f]">
                            ••••••••••••
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPasswordModal(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-medium text-[#5c5143] shadow-sm transition hover:bg-[#eee9e1]"
                        >
                          <LockKeyhole size={15} />
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save and discard */}
                  {isDirty && (
                    <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#eee9e1] bg-[#fcfbf9] px-6 py-5 sm:flex-row sm:px-9">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={saving}
                        className="rounded-full bg-[#f0eee9] px-7 py-3 text-xs font-medium text-[#5c5143] transition hover:bg-[#e8e5de] disabled:opacity-50"
                      >
                        Discard
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#29251f] px-7 py-3 text-xs font-medium text-white transition hover:bg-[#494239] disabled:opacity-50"
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

      {/* Footer */}
      <footer className="mt-16 border-t border-[#eee9e1] bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4 lg:px-10">
          <div>
            <h3 className="font-serif text-2xl tracking-wide text-[#29251f]">
              SPEQ
            </h3>
            <p className="mt-3 max-w-[220px] text-xs leading-6 text-[#81776B]">
              Thoughtfully designed eyewear for the modern individual.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#29251f]">
              Explore
            </h4>
            <ul className="mt-4 space-y-3 text-xs text-[#81776B]">
              <li>Eyeglasses</li>
              <li>Sunglasses</li>
              <li>Collections</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#29251f]">
              Customer Care
            </h4>
            <ul className="mt-4 space-y-3 text-xs text-[#81776B]">
              <li>Contact</li>
              <li>Shipping & Returns</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#29251f]">
              My Account
            </h4>
            <ul className="mt-4 space-y-3 text-xs text-[#81776B]">
              <li>Account Information</li>
              <li>My Orders</li>
              <li>Address Book</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#eee9e1] px-6 py-5 text-center text-[10px] text-[#a49a8d]">
          © {new Date().getFullYear()} SpeQ Eyewear. All rights reserved.
        </div>
      </footer>

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
                <label className="block text-xs font-medium text-[#81776B]">
                  NEW EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  className="w-full rounded-lg bg-[#f7f6f3] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#d8c3a5]/50"
                />

                <button
                  type="button"
                  onClick={handleEmailRequest}
                  disabled={emailLoading}
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {emailLoading ? "Sending..." : "Send Verification OTP"}
                </button>
              </>
            )}

            {emailStep === 2 && (
              <>
                <p className="text-sm text-[#81776B]">
                  Enter the 6-digit code sent to <strong>{newEmail}</strong>.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) =>
                    setEmailOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full rounded-lg bg-[#f7f6f3] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-[#d8c3a5]/50"
                />

                <div className="otp-resend-section">
                  {emailOtpTimeLeft > 0 ? (
                    <p>
                      Resend OTP in <strong>{emailOtpTimeLeft}s</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendEmailOtp}
                      disabled={isResendingEmailOtp}
                    >
                      {isResendingEmailOtp ? "SENDING..." : "RESEND OTP"}
                    </button>
                  )}

                  {emailOtpResendMessage && (
                    <p className="field-error">{emailOtpResendMessage}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEmailVerify}
                  disabled={emailLoading}
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {emailLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}

            {emailStep === 3 && (
              <>
                <div className="rounded-xl bg-[#f5f1e9] p-4 text-center">
                  <ShieldCheck size={30} className="mx-auto text-[#8d704d]" />
                  <p className="mt-2 text-sm font-medium text-[#5c5143]">
                    New email verified
                  </p>
                  <p className="mt-1 text-xs text-[#81776B]">
                    Confirm to replace your current email address.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEmailConfirm}
                  disabled={emailLoading}
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {emailLoading ? "Updating..." : "Confirm Email Change"}
                </button>
              </>
            )}

            {emailError && (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {emailError}
              </p>
            )}

            <button
              type="button"
              onClick={closeEmailModal}
              className="w-full py-2 text-xs text-[#81776B] underline"
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
                <div className="rounded-xl bg-[#f7f6f3] p-4">
                  <p className="text-xs text-[#81776B]">VERIFICATION EMAIL</p>
                  <p className="mt-1 break-all text-sm text-[#29251f]">
                    {profile.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordRequest}
                  disabled={passwordLoading}
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {passwordLoading ? "Sending..." : "Send Verification OTP"}
                </button>
              </>
            )}

            {passwordStep === 2 && (
              <>
                <p className="text-sm text-[#81776B]">
                  Enter the 6-digit OTP sent to your registered email.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={passwordOtp}
                  onChange={(e) =>
                    setPasswordOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="w-full rounded-lg bg-[#f7f6f3] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-[#d8c3a5]/50"
                />

                <div className="otp-resend-section">
                  {passwordOtpTimeLeft > 0 ? (
                    <p>
                      Resend OTP in <strong>{passwordOtpTimeLeft}s</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendPasswordOtp}
                      disabled={isResendingPasswordOtp}
                    >
                      {isResendingPasswordOtp ? "SENDING..." : "RESEND OTP"}
                    </button>
                  )}

                  {passwordOtpResendMessage && (
                    <p className="field-error">{passwordOtpResendMessage}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePasswordVerify}
                  disabled={passwordLoading}
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {passwordLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}

            {passwordStep === 3 && (
              <>
                <label className="block text-xs font-medium text-[#81776B]">
                  NEW PASSWORD
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-lg bg-[#f7f6f3] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#d8c3a5]/50"
                />

                <label className="block text-xs font-medium text-[#81776B]">
                  CONFIRM NEW PASSWORD
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg bg-[#f7f6f3] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#d8c3a5]/50"
                />

                <div className="rounded-lg bg-[#f7f6f3] p-3 text-[11px] leading-6 text-[#81776B]">
                  <p>Password requirements:</p>
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
                  className="w-full rounded-full bg-[#29251f] py-3 text-sm text-white disabled:opacity-50"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </>
            )}

            {passwordError && (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {passwordError}
              </p>
            )}

            <button
              type="button"
              onClick={closePasswordModal}
              className="w-full py-2 text-xs text-[#81776B] underline"
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
