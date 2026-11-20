
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  MailCheck,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  LoaderCircle,
  X,
  CheckCircle,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api/auth/admin/users/";
const PAGE_SIZE = 10;

// Get the admin access token from either storage location.
const getAdminToken = () => {
  return (
    localStorage.getItem("admin_access") ||
    sessionStorage.getItem("admin_access")
  );
};

// Reusable customer statistics card.
const StatCard = ({ title, value, description, icon: Icon }) => {
  return (
    <div className="rounded-xl border border-[#EAE7E0] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <div className="rounded-lg bg-[#F3F0E8] p-2 text-[#1B3B2B]">
          <Icon size={20} />
        </div>
      </div>

      <h2 className="mt-4 text-3xl font-semibold text-[#252720]">
        {value}
      </h2>

      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  );
};

// Format the customer's registration date.
const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Determine customer status from the fields returned by the API.
const getCustomerStatus = (customer) => {
  if (customer.is_blocked) return "Blocked";
  if (!customer.is_active) return "Inactive";
  return "Active";
};

const AdminUserManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [ordering, setOrdering] = useState("-date_joined");

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Customer waiting for block/unblock confirmation.
  const [confirmCustomer, setConfirmCustomer] = useState(null);

  // Fetch customers from the Django REST Framework API.
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin access token not found. Please log in again."
        );
      }

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ordering: ordering,
      });

      // Backend currently uses the search parameter "search".
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(
        `${API_BASE_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Unable to load customers."
        );
      }

      // Supports standard DRF pagination and a plain array response.
      const customerList = Array.isArray(data)
        ? data
        : data.results || [];

      setCustomers(customerList);

      setTotalCustomers(
        Array.isArray(data)
          ? data.length
          : (data.count ?? customerList.length)
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setCustomers([]);
      setTotalCustomers(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, ordering]);

  // Fetch again whenever page, search or ordering changes.
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter the customers currently loaded on this page.
  const filteredCustomers = useMemo(() => {
    if (activeFilter === "All") return customers;

    return customers.filter(
      (customer) => getCustomerStatus(customer) === activeFilter
    );
  }, [customers, activeFilter]);

  // Statistics are calculated from the current API page.
  const pageStats = useMemo(() => {
    return {
      active: customers.filter(
        (customer) => getCustomerStatus(customer) === "Active"
      ).length,

      blocked: customers.filter(
        (customer) => getCustomerStatus(customer) === "Blocked"
      ).length,

      verified: customers.filter(
        (customer) => customer.is_email_verified
      ).length,
    };
  }, [customers]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCustomers / PAGE_SIZE)
  );

  // Open the custom confirmation modal.
  const handleStatusChange = (customer) => {
    setActionError("");
    setSuccessMessage("");
    setConfirmCustomer(customer);
  };

  // Execute block/unblock only after admin confirmation.
  const confirmStatusChange = async () => {
    if (!confirmCustomer || actionLoading !== null) return;

    const customer = confirmCustomer;
    const nextBlockedStatus = !Boolean(customer.is_blocked);

    const action = nextBlockedStatus ? "block" : "unblock";

    setActionLoading(customer.id);
    setActionError("");

    try {
      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin access token not found. Please log in again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}${customer.id}/status/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_blocked: nextBlockedStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || `Unable to ${action} customer.`
        );
      }

      // Close the confirmation modal after a successful API response.
      setConfirmCustomer(null);

      setSuccessMessage(
        `${customer.full_name || "Customer"} has been ${
          nextBlockedStatus ? "blocked" : "unblocked"
        } successfully.`
      );

      // Reload the latest customer data from the backend.
      await fetchCustomers();
    } catch (err) {
      // Keep the modal open and display the backend error inside it.
      setActionError(
        err.message || "Customer status update failed."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Reset pagination when starting a new search.
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  // Close the confirmation modal.
  const closeConfirmation = () => {
    if (actionLoading !== null) return;

    setConfirmCustomer(null);
    setActionError("");
  };

  const filterOptions = ["All", "Active", "Blocked", "Inactive"];

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#B99A5B]">
            Customer Management
          </p>

          <h1 className="font-serif text-3xl text-[#252720]">
            Customers
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            View and manage your SPEQ Eyewear customers.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCustomers}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#EAE7E0] bg-white px-4 py-3 text-sm font-medium text-[#1B3B2B] transition hover:bg-[#F3F0E8] disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle size={18} className="shrink-0" />

          <p className="flex-1">{successMessage}</p>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="rounded p-1 hover:bg-green-100"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          description="Matching customers across all pages"
          icon={Users}
        />

        <StatCard
          title="Active Customers"
          value={pageStats.active}
          description="On this page"
          icon={UserCheck}
        />

        <StatCard
          title="Verified Emails"
          value={pageStats.verified}
          description="On this page"
          icon={MailCheck}
        />

        <StatCard
          title="Blocked Customers"
          value={pageStats.blocked}
          description="On this page"
          icon={UserX}
        />
      </div>

      {/* Customer table container */}
      <div className="overflow-hidden rounded-xl border border-[#EAE7E0] bg-white">

        {/* Search and filters */}
        <div className="flex flex-col gap-5 border-b border-[#EAE7E0] p-5 lg:flex-row lg:items-center lg:justify-between">

          {/* Search */}
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search name, email or phone..."
              className="w-full rounded-lg border border-[#EAE7E0] bg-[#FCFBF9] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#1B3B2B]"
            />
          </div>

          {/* Sorting dropdown */}
          <div className="w-full lg:w-52">
            <select
              value={ordering}
              onChange={(event) => {
                setOrdering(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#EAE7E0] bg-[#FCFBF9] px-4 py-3 text-sm text-gray-600 outline-none focus:border-[#1B3B2B]"
            >
              <option value="-date_joined">Newest First</option>
              <option value="date_joined">Oldest First</option>
              <option value="full_name">Name: A–Z</option>
              <option value="-full_name">Name: Z–A</option>
              <option value="email">Email: A–Z</option>
              <option value="-email">Email: Z–A</option>
            </select>
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  activeFilter === filter
                    ? "bg-[#1B3B2B] font-medium text-white"
                    : "bg-[#F5F4F0] text-gray-600 hover:bg-[#EAE7E0]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Customer list error */}
        {error && (
          <div className="m-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">
                Unable to load customers
              </p>

              <p className="mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={fetchCustomers}
              className="font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading and empty states */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <LoaderCircle
              size={30}
              className="animate-spin text-[#1B3B2B]"
            />

            <p className="text-sm text-gray-500">
              Loading customers...
            </p>
          </div>
        ) : !error && filteredCustomers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-[#F3F0E8] p-4 text-[#1B3B2B]">
              <Users size={28} />
            </div>

            <h3 className="mt-4 font-medium text-[#252720]">
              No customers found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : !error ? (
          <>
            {/* Customer table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#FCFBF9]">
                  <tr className="border-b border-[#EAE7E0] text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4 font-medium">
                      Customer
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Phone
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Joined Date
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Verification
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0EEE8]">
                  {filteredCustomers.map((customer) => {
                    const status = getCustomerStatus(customer);
                    const blocked = status === "Blocked";

                    return (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-[#FCFBF9]"
                      >
                        {/* Customer name and email */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8E1D2] text-sm font-semibold text-[#1B3B2B]">
                              {customer.full_name
                                ?.charAt(0)
                                ?.toUpperCase() || "C"}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-[#252720]">
                                {customer.full_name || "Unnamed Customer"}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {customer.email}
                              </p>

                              <p className="mt-1 text-[10px] text-gray-400">
                                ID: {customer.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-5 text-sm text-gray-600">
                          {customer.phone || "Not provided"}
                        </td>

                        {/* Registration date */}
                        <td className="px-6 py-5 text-sm text-gray-600">
                          {formatDate(customer.date_joined)}
                        </td>

                        {/* Email verification */}
                        <td className="px-6 py-5">
                          {customer.is_email_verified ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                              <ShieldCheck size={14} />
                              Verified
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Customer status */}
                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                              status === "Active"
                                ? "bg-green-50 text-green-700"
                                : blocked
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(customer)}
                              title="View customer details"
                              className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#1B3B2B]"
                            >
                              <MoreHorizontal size={19} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading === customer.id ||
                                status === "Inactive"
                              }
                              onClick={() => handleStatusChange(customer)}
                              className={`text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                blocked
                                  ? "text-green-700 hover:text-green-900"
                                  : "text-red-600 hover:text-red-800"
                              }`}
                            >
                              {actionLoading === customer.id
                                ? "Updating..."
                                : blocked
                                  ? "Unblock"
                                  : "Block"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-[#EAE7E0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing{" "}
                {totalCustomers === 0
                  ? 0
                  : (page - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(page * PAGE_SIZE, totalCustomers)}
                {" of "}
                {totalCustomers} customers
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((previous) => previous - 1)}
                  className="rounded-lg border border-[#EAE7E0] p-2 text-gray-600 transition hover:bg-[#F5F4F0] disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="px-3 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((previous) => previous + 1)}
                  className="rounded-lg border border-[#EAE7E0] p-2 text-gray-600 transition hover:bg-[#F5F4F0] disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Customer details modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-[#252720]">
                Customer Details
              </h2>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="mt-1 font-medium text-[#252720]">
                  {selectedCustomer.full_name || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="mt-1 text-gray-700">
                  {selectedCustomer.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="mt-1 text-gray-700">
                  {selectedCustomer.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Registration Date
                </p>
                <p className="mt-1 text-gray-700">
                  {formatDate(selectedCustomer.date_joined)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Email Verification
                </p>
                <p className="mt-1 text-gray-700">
                  {selectedCustomer.is_email_verified
                    ? "Verified"
                    : "Pending"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Account Status
                </p>
                <p className="mt-1 font-medium text-[#1B3B2B]">
                  {getCustomerStatus(selectedCustomer)}
                </p>
              </div>

              {selectedCustomer.blocked_at && (
                <div>
                  <p className="text-xs text-gray-400">
                    Blocked Date
                  </p>
                  <p className="mt-1 text-gray-700">
                    {formatDate(selectedCustomer.blocked_at)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="mt-7 w-full rounded-lg bg-[#1B3B2B] py-3 text-sm font-medium text-white transition hover:bg-[#274D39]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Premium SPEQ Block / Unblock Confirmation Modal */}
      {confirmCustomer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#101810]/55 p-4 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#EAE5D9] bg-[#FDFCF9] shadow-[0_25px_80px_rgba(0,0,0,0.22)] animate-[modalEnter_0.3s_ease-out]">

            {/* Decorative top accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#1B3B2B] via-[#B99A5B] to-[#1B3B2B]" />

            <div className="p-7 sm:p-8">

              {/* Modal heading */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">

                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      confirmCustomer.is_blocked
                        ? "bg-[#E8EFE9] text-[#1B3B2B]"
                        : "bg-[#FCEBE8] text-[#B9473D]"
                    }`}
                  >
                    {confirmCustomer.is_blocked ? (
                      <ShieldCheck size={27} strokeWidth={1.7} />
                    ) : (
                      <ShieldAlert size={27} strokeWidth={1.7} />
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B99A5B]">
                      SPEQ Eyewear
                    </p>

                    <h2
                      id="confirmation-title"
                      className="font-serif text-2xl font-medium text-[#1B3B2B]"
                    >
                      {confirmCustomer.is_blocked
                        ? "Unblock Customer?"
                        : "Block Customer?"}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={closeConfirmation}
                  className="rounded-full p-2 text-[#8B8B80] transition hover:bg-[#F0EEE7] hover:text-[#1B3B2B] disabled:opacity-40"
                  aria-label="Close confirmation"
                >
                  <X size={19} />
                </button>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-[#EAE5D9]" />

              {/* Customer information */}
              <div className="flex items-center gap-3 rounded-xl border border-[#EAE5D9] bg-white p-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8E1D2] font-serif text-lg font-semibold text-[#1B3B2B]">
                  {confirmCustomer.full_name
                    ?.charAt(0)
                    ?.toUpperCase() || "C"}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#252720]">
                    {confirmCustomer.full_name || "Unnamed Customer"}
                  </p>

                  <p className="mt-1 truncate text-xs text-[#929187]">
                    {confirmCustomer.email}
                  </p>
                </div>

                <span
                  className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                    confirmCustomer.is_blocked
                      ? "bg-[#E8EFE9] text-[#1B3B2B]"
                      : "bg-[#FCEBE8] text-[#B9473D]"
                  }`}
                >
                  {confirmCustomer.is_blocked ? "BLOCKED" : "ACTIVE"}
                </span>
              </div>

              {/* Confirmation description */}
              <div className="mt-5">
                <p className="text-sm leading-7 text-[#5F6259]">
                  {confirmCustomer.is_blocked
                    ? "Are you sure you want to restore account access for this customer?"
                    : "Are you sure you want to restrict this customer's account access?"}
                </p>

                <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F3F0E8] p-4">
                  <ShieldAlert
                    size={17}
                    className="mt-0.5 shrink-0 text-[#B99A5B]"
                  />

                  <p className="text-xs leading-6 text-[#77766D]">
                    {confirmCustomer.is_blocked
                      ? "The customer will be able to access their SPEQ account again after this action."
                      : "The customer will not be able to access their SPEQ account until an administrator unblocks it."}
                  </p>
                </div>
              </div>

              {/* Backend action error */}
              {actionError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                >
                  {actionError}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">

                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={closeConfirmation}
                  className="flex-1 rounded-xl border border-[#DEDACF] bg-white px-5 py-3.5 text-sm font-medium text-[#5D6057] transition duration-200 hover:border-[#1B3B2B] hover:bg-[#F8F7F2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={confirmStatusChange}
                  className={`flex-1 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
                    confirmCustomer.is_blocked
                      ? "bg-[#1B3B2B] shadow-[#1B3B2B]/15 hover:bg-[#274D39]"
                      : "bg-[#B9473D] shadow-red-900/10 hover:bg-[#A83D34]"
                  }`}
                >
                  {actionLoading === confirmCustomer.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />

                      {confirmCustomer.is_blocked
                        ? "Unblocking..."
                        : "Blocking..."}
                    </span>
                  ) : confirmCustomer.is_blocked ? (
                    "Confirm Unblock"
                  ) : (
                    "Confirm Block"
                  )}
                </button>
              </div>

              {/* Modal footer */}
              <p className="mt-5 text-center text-[10px] tracking-wide text-[#AAA79D]">
                SPEQ EYEWEAR · CUSTOMER MANAGEMENT
              </p>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;
