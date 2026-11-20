
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Tags,
  Layers,
  CalendarDays,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";

import { adminApiRequest } from "../../utils/adminApi";

// --------------------------------------------------
// CATALOG CONFIGURATION
// --------------------------------------------------

const CATALOG_CONFIG = {
  categories: {
    title: "Categories",
    singular: "Category",
    endpoint: "/admin/categories/",
    icon: Tags,
    hasImage: false,
    description: "Organize your eyewear products into categories.",
  },

  collections: {
    title: "Collections",
    singular: "Collection",
    endpoint: "/admin/collections/",
    icon: Layers,
    hasImage: true,
    description: "Manage your curated eyewear collections.",
  },

  occasions: {
    title: "Occasions",
    singular: "Occasion",
    endpoint: "/admin/occasions/",
    icon: CalendarDays,
    hasImage: true,
    description: "Organize products by occasions and lifestyle.",
  },
};

const PAGE_SIZE = 10;

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

const slugify = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
};

const getErrorMessage = (errorData) => {
  if (!errorData) return "Something went wrong. Please try again.";

  if (typeof errorData === "string") return errorData;

  if (errorData.detail) return errorData.detail;

  if (errorData.non_field_errors) {
    return errorData.non_field_errors.join(", ");
  }

  const messages = Object.entries(errorData).map(([field, errors]) => {
    const message = Array.isArray(errors)
      ? errors.join(", ")
      : String(errors);

    return `${field}: ${message}`;
  });

  return messages.length
    ? messages.join(" | ")
    : "Something went wrong. Please try again.";
};

const readResponse = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
};

// --------------------------------------------------
// FIELD VALIDATION
// --------------------------------------------------


const validateName = (value) => {
  const name = value.trim();

  if (!name) {
    return "Name is required.";
  }

  if (name.length < 3) {
    return "Name must contain at least 3 characters.";
  }

  // Allow letters, numbers, spaces and common name symbols.
  if (!/^[\p{L}\p{N}\s&,'().\-–—]+$/u.test(name)) {
    return "Name contains unsupported characters.";
  }

  return "";
};


const validateDescription = (value) => {
  const description = value.trim();

  if (!description) {
    return "Description is required.";
  }

  if (description.length < 10) {
    return "Description must contain at least 10 characters.";
  }

  // Allow letters, numbers, spaces, punctuation and common symbols.
  // Also allows line breaks for formatted descriptions.
  if (!/^[\p{L}\p{N}\s.,!?;:'"()\-–—/&%+#@]+$/u.test(description)) {
    return "Description contains unsupported characters.";
  }

  return "";
};


// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const CatalogManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentType = location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  const activeType = CATALOG_CONFIG[currentType]
    ? currentType
    : "categories";

  const config = CATALOG_CONFIG[activeType];
  const ActiveIcon = config.icon;

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    image: "",
    is_active: true,
  });

  // Stores individual validation errors.
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    description: "",
  });

  // Tracks whether the user has interacted with each field.
  const [touched, setTouched] = useState({
    name: false,
    description: false,
  });

  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --------------------------------------------------
  // FETCH CATALOG DATA
  // --------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ordering: "-created_at",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await adminApiRequest(
        `${config.endpoint}?${params.toString()}`,
        {
          method: "GET",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const results = Array.isArray(data)
        ? data
        : data.results || [];

      setItems(results);

      setTotalCount(
        typeof data.count === "number"
          ? data.count
          : results.length
      );

      setHasNext(Boolean(data.next));
      setHasPrevious(Boolean(data.previous));
    } catch (error) {
      console.error("Catalog fetch error:", error);

      setPageError(error.message || "Failed to load catalog.");
      setItems([]);
      setTotalCount(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Reset state when switching catalog types.
  useEffect(() => {
    setPage(1);
    setSearch("");
    setStatusFilter("all");
    setItems([]);
    setPageError("");
    setSuccessMessage("");
  }, [activeType]);

  // --------------------------------------------------
  // TAB NAVIGATION
  // --------------------------------------------------

  const handleTabChange = (type) => {
    navigate(`/admin/${type}`);
  };

  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      image: "",
      is_active: true,
    });

    setEditingItem(null);

    setFieldErrors({
      name: "",
      description: "",
    });

    setTouched({
      name: false,
      description: false,
    });

    setFormError("");
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);

    setForm({
      name: item.name || "",
      description: item.description || "",
      image: item.image || "",
      is_active: item.is_active,
    });

    setFieldErrors({
      name: "",
      description: "",
    });

    setTouched({
      name: false,
      description: false,
    });

    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  };

  // Handle changes in form fields.
  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    const updatedValue = type === "checkbox" ? checked : value;

    setForm((previous) => ({
      ...previous,
      [name]: updatedValue,
    }));

    // Validate only after the field has been touched.
    if (name === "name" && touched.name) {
      setFieldErrors((previous) => ({
        ...previous,
        name: validateName(value),
      }));
    }

    if (name === "description" && touched.description) {
      setFieldErrors((previous) => ({
        ...previous,
        description: validateDescription(value),
      }));
    }

    setFormError("");
  };

  // Mark the field as touched when the user leaves it.
  const handleFieldBlur = (event) => {
    const { name, value } = event.target;

    if (name !== "name" && name !== "description") return;

    setTouched((previous) => ({
      ...previous,
      [name]: true,
    }));

    const error = name === "name"
      ? validateName(value)
      : validateDescription(value);

    setFieldErrors((previous) => ({
      ...previous,
      [name]: error,
    }));
  };

  // --------------------------------------------------
  // CREATE / UPDATE
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate both fields before submitting.
    const nameError = validateName(form.name);
    const descriptionError = validateDescription(form.description);

    setTouched({
      name: true,
      description: true,
    });

    setFieldErrors({
      name: nameError,
      description: descriptionError,
    });

    // Stop submission if either field is invalid.
    if (nameError || descriptionError) {
      return;
    }

    const generatedSlug = slugify(form.name);

    if (!generatedSlug) {
      setFormError("Please enter a valid name.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: generatedSlug,
      description: form.description.trim(),
      is_active: form.is_active,
    };

    if (config.hasImage) {
      payload.image = form.image.trim();
    }

    setSaving(true);
    setFormError("");

    try {
      const endpoint = editingItem
        ? `${config.endpoint}${editingItem.id}/`
        : config.endpoint;

      const response = await adminApiRequest(endpoint, {
        method: editingItem ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setModalOpen(false);
      resetForm();

      setSuccessMessage(
        editingItem
          ? `${config.singular} updated successfully.`
          : `${config.singular} created successfully.`
      );

      await fetchItems();
    } catch (error) {
      console.error("Catalog save error:", error);
      setFormError(error.message || "Unable to save the record.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // SOFT DELETE
  // --------------------------------------------------

  const handleDeactivate = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${item.name}"?`
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");

    try {
      const response = await adminApiRequest(
        `${config.endpoint}${item.id}/delete/`,
        {
          method: "DELETE",
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setSuccessMessage(
        `${config.singular} deactivated successfully.`
      );

      await fetchItems();
    } catch (error) {
      console.error("Catalog deactivate error:", error);
      setPageError(error.message || "Unable to deactivate the record.");
    }
  };

  // --------------------------------------------------
  // RESTORE INACTIVE RECORD
  // --------------------------------------------------

  const handleRestore = async (item) => {
    setPageError("");
    setSuccessMessage("");

    try {
      const response = await adminApiRequest(
        `${config.endpoint}${item.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: true,
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setSuccessMessage(
        `${config.singular} restored successfully.`
      );

      await fetchItems();
    } catch (error) {
      console.error("Catalog restore error:", error);
      setPageError(error.message || "Unable to restore the record.");
    }
  };

  // --------------------------------------------------
  // SEARCH / FILTER / PAGINATION
  // --------------------------------------------------

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter === "active") return item.is_active;
    if (statusFilter === "inactive") return !item.is_active;

    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const startRecord = totalCount === 0
    ? 0
    : (page - 1) * PAGE_SIZE + 1;

  const endRecord = Math.min(
    page * PAGE_SIZE,
    totalCount
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#A28A55]">
            <Package size={14} />
            Product Management
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#252720]">
            Catalog Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {config.description}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B3B2B] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#254D38]"
        >
          <Plus size={17} />
          Add {config.singular}
        </button>

      </div>

      {/* CATALOG TABS */}
      <div className="flex flex-wrap gap-2 border-b border-[#EAE7E0]">

        {Object.entries(CATALOG_CONFIG).map(([type, tab]) => {
          const Icon = tab.icon;
          const isActive = activeType === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTabChange(type)}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-[#1B3B2B] text-[#1B3B2B]"
                  : "border-transparent text-gray-400 hover:text-[#1B3B2B]"
              }`}
            >
              <Icon size={17} />
              {tab.title}
            </button>
          );
        })}

      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total {config.title}
              </p>

              <p className="mt-2 text-3xl font-semibold text-[#252720]">
                {totalCount}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1EEE6] text-[#1B3B2B]">
              <ActiveIcon size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Records on this page
              </p>

              <p className="mt-2 text-3xl font-semibold text-[#252720]">
                {items.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1EEE6] text-[#1B3B2B]">
              <Package size={22} />
            </div>
          </div>
        </div>

      </div>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={17} />
          {successMessage}

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="ml-auto"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* PAGE ERROR */}
      {pageError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} />
          <span>{pageError}</span>

          <button
            type="button"
            onClick={() => setPageError("")}
            className="ml-auto"
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TABLE CONTAINER */}
      <div className="overflow-hidden rounded-2xl border border-[#EAE7E0] bg-white">

        {/* TABLE TOOLBAR */}
        <div className="flex flex-col gap-4 border-b border-[#EAE7E0] p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="font-semibold text-[#252720]">
              All {config.title}
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              Manage your {config.title.toLowerCase()} here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                className="w-full rounded-xl border border-[#EAE7E0] bg-[#FCFBF9] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#1B3B2B] sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#EAE7E0] bg-[#FCFBF9] px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-[#1B3B2B]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">

          <table className="w-full min-w-[650px] text-left">

            <thead className="bg-[#F8F7F3]">
              <tr className="text-xs uppercase tracking-wider text-gray-500">

                {config.hasImage && (
                  <th className="px-6 py-4 font-semibold">
                    Image
                  </th>
                )}

                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Slug</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>

                <th className="px-6 py-4 text-right font-semibold">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0EEE9]">

              {loading ? (
                <tr>
                  <td
                    colSpan={config.hasImage ? 6 : 5}
                    className="px-6 py-16 text-center"
                  >
                    <Loader2
                      size={25}
                      className="mx-auto animate-spin text-[#1B3B2B]"
                    />

                    <p className="mt-3 text-sm text-gray-400">
                      Loading {config.title.toLowerCase()}...
                    </p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.hasImage ? 6 : 5}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1EEE6] text-[#1B3B2B]">
                      <ActiveIcon size={22} />
                    </div>

                    <p className="mt-3 font-medium text-[#252720]">
                      No {config.title.toLowerCase()} found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {search
                        ? "Try changing your search or status filter."
                        : `Create your first ${config.singular.toLowerCase()}.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-[#FCFBF9]"
                  >

                    {config.hasImage && (
                      <td className="px-6 py-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg border border-[#EAE7E0] object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F1EEE6] text-gray-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4">
                      <p className="font-medium text-[#252720]">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md bg-[#F5F4F0] px-2 py-1 text-xs text-gray-500">
                        {item.slug}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          item.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.is_active
                              ? "bg-green-600"
                              : "bg-gray-400"
                          }`}
                        />

                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-[#F1EEE6] hover:text-[#1B3B2B]"
                        >
                          <Pencil size={17} />
                        </button>

                        {item.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(item)}
                            title="Deactivate"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            title="Restore"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-700"
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-[#EAE7E0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-[#252720]">
              {startRecord}-{endRecord}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[#252720]">
              {totalCount}
            </span>{" "}
            records
          </p>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={!hasPrevious || loading}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              className="flex items-center gap-1 rounded-lg border border-[#EAE7E0] px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-[#F8F7F3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span className="px-2 text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={!hasNext || loading}
              onClick={() => setPage((previous) => previous + 1)}
              className="flex items-center gap-1 rounded-lg border border-[#EAE7E0] px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-[#F8F7F3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>

          </div>
        </div>

      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#FCFBF9] shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-[#EAE7E0] px-6 py-5">

              <div>
                <h2 className="text-lg font-semibold text-[#252720]">
                  {editingItem
                    ? `Edit ${config.singular}`
                    : `Add ${config.singular}`}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Enter the details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-[#F1EEE6] hover:text-gray-700"
                aria-label="Close modal"
              >
                <X size={19} />
              </button>

            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">

              {/* NAME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#252720]">
                  Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  onBlur={handleFieldBlur}
                  placeholder={`Enter ${config.singular.toLowerCase()} name`}
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 ${
                    fieldErrors.name && touched.name
                      ? "border-red-400 focus:border-red-500"
                      : "border-[#EAE7E0] focus:border-[#1B3B2B]"
                  }`}
                />

                {fieldErrors.name && touched.name ? (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle size={13} />
                    {fieldErrors.name}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">
                    Letters and spaces only. Minimum 3 characters, maximum 100.
                  </p>
                )}
              </div>

              {/* SLUG PREVIEW */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#252720]">
                  Slug
                </label>

                <div className="rounded-xl border border-[#EAE7E0] bg-[#F5F4F0] px-4 py-3 text-sm text-gray-500">
                  {slugify(form.name) || "your-slug-will-appear-here"}
                </div>

                <p className="mt-1.5 text-xs text-gray-400">
                  Automatically generated from the name.
                </p>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#252720]">
                  Description <span className="text-red-500">*</span>
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  onBlur={handleFieldBlur}
                  rows={4}
                  placeholder={`Describe this ${config.singular.toLowerCase()}...`}
                  aria-invalid={Boolean(fieldErrors.description)}
                  className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 ${
                    fieldErrors.description && touched.description
                      ? "border-red-400 focus:border-red-500"
                      : "border-[#EAE7E0] focus:border-[#1B3B2B]"
                  }`}
                />

                {fieldErrors.description && touched.description ? (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle size={13} />
                    {fieldErrors.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">
                    Letters and spaces only. Minimum 10 characters.
                  </p>
                )}
              </div>

              {/* IMAGE URL */}
              {config.hasImage && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#252720]">
                    Image URL
                  </label>

                  <input
                    type="url"
                    name="image"
                    value={form.image}
                    onChange={handleFormChange}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-xl border border-[#EAE7E0] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1B3B2B]"
                  />

                  {form.image && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs text-gray-400">
                        Image preview
                      </p>

                      <img
                        src={form.image}
                        alt="Preview"
                        className="h-28 w-28 rounded-xl border border-[#EAE7E0] object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE STATUS */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EAE7E0] bg-white p-4">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleFormChange}
                  className="h-4 w-4 accent-[#1B3B2B]"
                />

                <div>
                  <p className="text-sm font-medium text-[#252720]">
                    Active
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400">
                    Allow this catalog record to be used.
                  </p>
                </div>
              </label>

              {/* SERVER ERROR */}
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* FORM ACTIONS */}
              <div className="flex justify-end gap-3 border-t border-[#EAE7E0] pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#EAE7E0] px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-[#F1EEE6] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#1B3B2B] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#254D38] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 size={16} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : `Create ${config.singular}`}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default CatalogManagement;
