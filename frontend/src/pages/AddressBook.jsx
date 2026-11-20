
import React, { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  X,
  UserRound,
  Phone,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";


import ProfileSidebar from "../components/ProfileSidebar";
import { API_BASE } from "../utils/api";

// Default values for a new address.
const EMPTY_ADDRESS = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  is_default: false,
};

// Convert backend validation errors into readable messages.
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

// Extract a general error message from an API response.
const getErrorMessage = (data) => {
  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  const messages = getErrorMessages(data);

  return messages[0] || "Please check the entered details.";
};

// Reusable input styling based on validation state.
const getInputClass = (hasError, readOnly = false) => {
  return `w-full rounded-lg border px-4 py-3 text-sm text-[#172B3A] outline-none transition-colors duration-200 ${
    hasError
      ? "border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-[#d7e2ea] bg-[#F5F8FB] focus:border-[#426782] focus:ring-2 focus:ring-[#426782]/20"
  } ${
    readOnly ? "cursor-not-allowed bg-[#EAF2F8] text-[#8295A5]" : ""
  }`;
};

const AddressBook = () => {
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const [formData, setFormData] = useState(EMPTY_ADDRESS);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");

  const [toast, setToast] = useState(null);
  const [pageError, setPageError] = useState("");

  const token = localStorage.getItem("access");

  // Display a toast notification.
  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Automatically remove toast notifications.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  // Common authorization headers.
  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  // Fetch the customer's saved addresses.
  const fetchAddresses = async () => {
    const response = await fetch(`${API_BASE}/auth/addresses/`, {
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setAddresses(data);
  };

  // Fetch customer profile details.
  const fetchProfile = async () => {
    const response = await fetch(`${API_BASE}/auth/profile/`, {
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setProfile(data);
  };

  // Load addresses and profile when the page opens.
  useEffect(() => {
    const loadPage = async () => {
      if (!token) {
        setPageError(
          "Your session has expired. Please sign in again."
        );
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          fetchAddresses(),
          fetchProfile(),
        ]);
      } catch (error) {
        setPageError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  // Open the modal for adding an address.
  const openAddModal = () => {
    setEditingAddress(null);

    setFormData({
      ...EMPTY_ADDRESS,
      is_default: addresses.length === 0,
    });

    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  // Open the modal for editing an address.
  const openEditModal = (address) => {
    setEditingAddress(address);

    setFormData({
      full_name: address.full_name || "",
      phone: address.phone || "",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      postal_code: address.postal_code || "",
      country: address.country || "India",
      is_default: address.is_default,
    });

    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  // Close and reset the address modal.
  const closeAddressModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingAddress(null);
    setFormData(EMPTY_ADDRESS);
    setFormErrors({});
    setFormError("");
  };

  // Handle changes to form inputs.
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear the field's old error when the customer edits it.
    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setFormError("");
  };

  // Validate all address fields.
  const validateForm = () => {
    const errors = {};

    // Full name: at least 3 letters.
    const name = formData.full_name.trim();

    if (!name) {
      errors.full_name = "Full name is required.";
    } else if (
      !/^[A-Za-z][A-Za-z\s'-]*$/.test(name) ||
      name.replace(/[^A-Za-z]/g, "").length < 3
    ) {
      errors.full_name =
        "Enter a valid name containing at least 3 letters.";
    }

    // Phone: exactly 10 valid Indian mobile digits.
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errors.phone =
        "Enter a valid 10-digit Indian mobile number.";
    }

    // Address line 1.
    if (!formData.address_line1.trim()) {
      errors.address_line1 =
        "Address line 1 is required.";
    }

    // City.
    if (!formData.city.trim()) {
      errors.city = "City is required.";
    }

    // State.
    if (!formData.state.trim()) {
      errors.state = "State is required.";
    }

    // PIN code: exactly 6 digits.
    if (!/^\d{6}$/.test(formData.postal_code.trim())) {
      errors.postal_code =
        "PIN code must contain exactly 6 digits.";
    }

    // Country: India only.
    if (formData.country !== "India") {
      errors.country =
        "Currently, delivery is available only within India.";
    }

    return errors;
  };

  // Map backend validation errors to individual fields.
  const mapBackendErrors = (data) => {
    const fieldNames = [
      "full_name",
      "phone",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "postal_code",
      "country",
      "is_default",
    ];

    const errors = {};

    fieldNames.forEach((field) => {
      if (data[field]) {
        errors[field] = getErrorMessages(data[field]).join(" ");
      }
    });

    return errors;
  };

  // Create a new address or update an existing address.
  const handleSaveAddress = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm();

    setFormErrors(validationErrors);
    setFormError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    const payload = {
      ...formData,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      address_line1: formData.address_line1.trim(),
      address_line2: formData.address_line2.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      postal_code: formData.postal_code.trim(),
      country: "India",
    };

    const isEditing = Boolean(editingAddress);

    const url = isEditing
      ? `${API_BASE}/auth/addresses/${editingAddress.id}/`
      : `${API_BASE}/auth/addresses/`;

    try {
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const backendErrors = mapBackendErrors(data);

        setFormErrors(backendErrors);

        const generalError =
          data.detail || data.non_field_errors?.[0];

        if (!Object.keys(backendErrors).length) {
          setFormError(
            generalError || getErrorMessage(data)
          );
        }

        return;
      }

      await fetchAddresses();

      setModalOpen(false);
      setEditingAddress(null);
      setFormData(EMPTY_ADDRESS);
      setFormErrors({});
      setFormError("");

      showToast(
        isEditing
          ? "Address updated successfully."
          : "New address added successfully."
      );
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Set an address as the default shipping address.
  const handleSetDefault = async (address) => {
    if (address.is_default || actionLoading) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/addresses/${address.id}/`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            is_default: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      await fetchAddresses();

      showToast("Default shipping address updated.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open the delete confirmation dialog.
  const openDeleteModal = (address) => {
    setSelectedAddress(address);
    setDeleteModalOpen(true);
  };

  // Delete the selected address.
  const handleDeleteAddress = async () => {
    if (!selectedAddress || actionLoading) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/addresses/${selectedAddress.id}/`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data));
      }

      await fetchAddresses();

      setDeleteModalOpen(false);
      setSelectedAddress(null);

      showToast("Address removed successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reusable field error display.
  const renderFieldError = (fieldName) => {
    if (!formErrors[fieldName]) return null;

    return (
      <p
        className="mt-1.5 flex items-center gap-1 text-xs text-red-600"
        role="alert"
      >
        <AlertCircle size={13} />
        {formErrors[fieldName]}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-[#EAF2F8] text-[#172B3A]">


      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-5 py-4 shadow-xl ${
            toast.type === "error"
              ? "border-red-200 bg-[#8f2929] text-white"
              : "border-[#d7e2ea] bg-white text-[#172B3A]"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={19} />
          ) : (
            <CheckCircle2
              size={19}
              className="text-[#426782]"
            />
          )}

          <p className="text-sm">{toast.message}</p>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Close notification"
            className="ml-2 rounded-full p-1 transition-colors duration-200 hover:bg-[#EAF2F8]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        {/* Profile Summary */}
        <section className="mb-9 rounded-2xl border border-[#d7e2ea] bg-white p-6 shadow-[0_4px_24px_rgba(23,43,58,0.05)] sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d7e2ea] bg-[#EAF2F8]">
                {profile?.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound
                    size={28}
                    className="text-[#426782]"
                  />
                )}
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#426782]">
                  Your Account
                </p>

                <h1 className="font-serif text-2xl text-[#172B3A] sm:text-3xl">
                  {profile?.full_name || "Your Profile"}
                </h1>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8295A5]">
                  <ShieldCheck
                    size={14}
                    className={
                      profile?.is_email_verified
                        ? "text-[#426782]"
                        : "text-[#8295A5]"
                    }
                  />

                  {profile?.is_email_verified
                    ? "VERIFIED PATRON"
                    : "EMAIL NOT VERIFIED"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="min-w-[125px] rounded-xl border border-[#e3ebf1] bg-[#F5F8FB] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.13em] text-[#8295A5]">
                  Saved Addresses
                </p>

                <p className="mt-1 font-serif text-2xl text-[#172B3A]">
                  {addresses.length.toString().padStart(2, "0")}
                </p>
              </div>

              <div className="min-w-[125px] rounded-xl border border-[#e3ebf1] bg-[#F5F8FB] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.13em] text-[#8295A5]">
                  Account Status
                </p>

                <p className="mt-1 text-sm font-medium text-[#172B3A]">
                  {profile?.is_email_verified
                    ? "Verified"
                    : "Pending"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Layout */}
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* Sidebar */}
          <ProfileSidebar
            activeItem="Address Book"
            onLogout={() => {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              window.location.href = "/login";
            }}
          />

          {/* Address Book Content */}
          <section className="min-w-0">
            <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-3xl text-[#172B3A] sm:text-4xl">
                    Address Book
                  </h2>

                  <span className="rounded-full border border-[#d7e2ea] bg-[#EAF2F8] px-3 py-1 text-xs font-medium text-[#426782]">
                    {addresses.length} Saved
                  </span>
                </div>

                <p className="mt-3 max-w-xl text-sm leading-6 text-[#8295A5]">
                  Manage your primary delivery locations and
                  bespoke atelier delivery destinations.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#172B3A] px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#263B4B] hover:shadow-md"
              >
                <Plus size={17} />
                Add New Address
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-[#d7e2ea] bg-white">
                <LoaderCircle
                  className="animate-spin text-[#426782]"
                  size={28}
                />
              </div>
            )}

            {/* Page Error */}
            {!loading && pageError && (
              <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
                <AlertCircle
                  className="mx-auto mb-3 text-red-500"
                  size={28}
                />

                <p className="text-sm text-red-600">
                  {pageError}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-full bg-[#172B3A] px-5 py-2 text-sm text-white transition-colors duration-200 hover:bg-[#263B4B]"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !pageError && addresses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#c5d5e1] bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2F8]">
                  <MapPin
                    size={25}
                    className="text-[#426782]"
                  />
                </div>

                <h3 className="mt-5 font-serif text-2xl text-[#172B3A]">
                  No Saved Addresses
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8295A5]">
                  Add your first delivery address to make your
                  next purchase easier.
                </p>

                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-6 rounded-full bg-[#172B3A] px-6 py-3 text-sm text-white transition-colors duration-200 hover:bg-[#263B4B] hover:shadow-md"
                >
                  Add Your First Address
                </button>
              </div>
            )}

            {/* Address Cards */}
            {!loading && !pageError && addresses.length > 0 && (
              <div className="flex flex-col gap-5">
                {addresses.map((address) => (
                  <article
                    key={address.id}
                    className="overflow-hidden rounded-2xl border border-[#d7e2ea] bg-white shadow-[0_3px_18px_rgba(23,43,58,0.035)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(23,43,58,0.08)]"
                  >
                    <div className="p-6 sm:p-7">

                      {/* Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {address.is_default ? (
                          <span className="rounded-md bg-[#172B3A] px-3 py-1.5 text-[10px] font-semibold tracking-[0.13em] text-white">
                            DEFAULT SHIPPING
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#EAF2F8] px-3 py-1.5 text-[10px] font-semibold tracking-[0.13em] text-[#426782]">
                            SECONDARY ADDRESS
                          </span>
                        )}

                        {address.is_default ? (
                          <ShieldCheck
                            size={21}
                            className="text-[#426782]"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSetDefault(address)}
                            className="text-[10px] font-semibold tracking-[0.12em] text-[#426782] transition-colors duration-200 hover:text-[#172B3A] disabled:opacity-50"
                          >
                            SET AS DEFAULT
                          </button>
                        )}
                      </div>

                      {/* Address Details */}
                      <h3 className="mt-5 font-serif text-2xl text-[#172B3A]">
                        {address.full_name}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-sm leading-6 text-[#8295A5]">
                        <p>{address.address_line1}</p>

                        {address.address_line2 && (
                          <p>{address.address_line2}</p>
                        )}

                        <p>
                          {address.city}, {address.state} -{" "}
                          {address.postal_code}
                        </p>

                        <p>{address.country}</p>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-sm text-[#426782]">
                        <Phone
                          size={15}
                          className="text-[#C5AE87]"
                        />
                        {address.phone}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-5 border-t border-[#e3ebf1] bg-[#F5F8FB] px-6 py-4 sm:px-7">
                      <button
                        type="button"
                        onClick={() => openEditModal(address)}
                        className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-[#426782] transition-colors duration-200 hover:text-[#172B3A]"
                      >
                        <Pencil size={14} />
                        EDIT
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(address)}
                        className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-[#9b4545] transition-colors duration-200 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                        REMOVE
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Add / Edit Address Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#172B3A]/55 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddressModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-modal-title"
            className="my-auto w-full max-w-2xl rounded-2xl border border-[#d7e2ea] bg-white p-6 shadow-2xl sm:p-8"
          >
            {/* Modal Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#426782]">
                  Your Delivery Details
                </p>

                <h2
                  id="address-modal-title"
                  className="mt-2 font-serif text-3xl text-[#172B3A]"
                >
                  {editingAddress
                    ? "Edit Address"
                    : "Add New Address"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAddressModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-full p-2 text-[#8295A5] transition-colors duration-200 hover:bg-[#EAF2F8] hover:text-[#172B3A]"
              >
                <X size={20} />
              </button>
            </div>

            {/* noValidate disables browser popups.
                React validateForm handles all validation instead. */}
            <form onSubmit={handleSaveAddress} noValidate>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Full Name */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    Full Name *
                  </label>

                  <input
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    maxLength={150}
                    placeholder="Enter full name"
                    aria-invalid={Boolean(formErrors.full_name)}
                    aria-describedby={
                      formErrors.full_name
                        ? "full_name-error"
                        : undefined
                    }
                    className={getInputClass(
                      formErrors.full_name
                    )}
                  />

                  {renderFieldError("full_name")}
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    Phone Number *
                  </label>

                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    aria-invalid={Boolean(formErrors.phone)}
                    aria-describedby={
                      formErrors.phone
                        ? "phone-error"
                        : undefined
                    }
                    className={getInputClass(
                      formErrors.phone
                    )}
                  />

                  {renderFieldError("phone")}
                </div>

                {/* Address Line 1 */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    Street Address *
                  </label>

                  <input
                    name="address_line1"
                    type="text"
                    value={formData.address_line1}
                    onChange={handleChange}
                    maxLength={255}
                    placeholder="House number, street name, area"
                    aria-invalid={Boolean(formErrors.address_line1)}
                    aria-describedby={
                      formErrors.address_line1
                        ? "address_line1-error"
                        : undefined
                    }
                    className={getInputClass(
                      formErrors.address_line1
                    )}
                  />

                  {renderFieldError("address_line1")}
                </div>

                {/* Address Line 2 */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    Apartment / Landmark
                    <span className="ml-1 text-[#8295A5]">
                      (Optional)
                    </span>
                  </label>

                  <input
                    name="address_line2"
                    type="text"
                    value={formData.address_line2}
                    onChange={handleChange}
                    maxLength={255}
                    placeholder="Apartment, suite, landmark"
                    aria-invalid={Boolean(formErrors.address_line2)}
                    className={getInputClass(
                      formErrors.address_line2
                    )}
                  />

                  {renderFieldError("address_line2")}
                </div>

                {/* City */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    City *
                  </label>

                  <input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="City"
                    aria-invalid={Boolean(formErrors.city)}
                    className={getInputClass(
                      formErrors.city
                    )}
                  />

                  {renderFieldError("city")}
                </div>

                {/* State */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    State *
                  </label>

                  <input
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="State"
                    aria-invalid={Boolean(formErrors.state)}
                    className={getInputClass(
                      formErrors.state
                    )}
                  />

                  {renderFieldError("state")}
                </div>

                {/* PIN Code */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    PIN Code *
                  </label>

                  <input
                    name="postal_code"
                    type="text"
                    inputMode="numeric"
                    value={formData.postal_code}
                    onChange={handleChange}
                    maxLength={6}
                    placeholder="6-digit PIN code"
                    aria-invalid={Boolean(formErrors.postal_code)}
                    className={getInputClass(
                      formErrors.postal_code
                    )}
                  />

                  {renderFieldError("postal_code")}
                </div>

                {/* Country */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#426782]">
                    Country *
                  </label>

                  <input
                    type="text"
                    name="country"
                    value="India"
                    readOnly
                    aria-invalid={Boolean(formErrors.country)}
                    className={getInputClass(
                      formErrors.country,
                      true
                    )}
                  />

                  {renderFieldError("country")}
                </div>
              </div>

              {/* Default Address Toggle */}
              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e3ebf1] bg-[#F5F8FB] p-4 transition-colors duration-200 hover:bg-[#EAF2F8]">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[#172B3A]"
                />

                <span>
                  <span className="block text-sm font-medium text-[#172B3A]">
                    Set as default shipping address
                  </span>

                  <span className="mt-1 block text-xs text-[#8295A5]">
                    Use this address as your primary delivery location.
                  </span>
                </span>
              </label>

              {/* General Error */}
              {formError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {formError}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="mt-7 flex flex-col-reverse justify-end gap-3 border-t border-[#e3ebf1] pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeAddressModal}
                  disabled={saving}
                  className="rounded-full px-6 py-3 text-sm text-[#426782] transition-colors duration-200 hover:bg-[#EAF2F8] hover:text-[#172B3A]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#172B3A] px-7 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#263B4B] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : editingAddress
                      ? "Update Address"
                      : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#172B3A]/55 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="w-full max-w-md rounded-2xl border border-[#d7e2ea] bg-white p-7 text-center shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle
                size={25}
                className="text-red-600"
              />
            </div>

            <h2
              id="delete-modal-title"
              className="mt-5 font-serif text-2xl text-[#172B3A]"
            >
              Remove Address?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#8295A5]">
              Are you sure you want to remove this address?
              This action cannot be undone.
            </p>

            {selectedAddress && (
              <p className="mt-3 text-sm font-medium text-[#426782]">
                {selectedAddress.full_name} · {selectedAddress.city}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedAddress(null);
                }}
                className="rounded-full bg-[#EAF2F8] px-6 py-3 text-sm text-[#426782] transition-colors duration-200 hover:bg-[#dce8f0] hover:text-[#172B3A]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteAddress}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a33131] px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#852626] disabled:opacity-60"
              >
                {actionLoading && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

                Remove
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AddressBook;
