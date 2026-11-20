
import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  X,
  Trash2,
  RefreshCw,
  Star,
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
} from "../../../services/adminReviewServices";

const FILTERS = [
  { label: "All Reviews", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const PAGE_SIZE = 10;

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);

  const [activeFilter, setActiveFilter] = useState("PENDING");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Fetch reviews based on the selected filter.
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getAdminReviews(activeFilter);

      const reviewList = Array.isArray(data)
        ? data
        : data?.results || [];

      setReviews(reviewList);
    } catch (err) {
      setError(err.message || "Unable to load reviews.");
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  // Fetch all reviews separately for statistics.
  const fetchAllReviews = useCallback(async () => {
    setIsStatsLoading(true);

    try {
      const data = await getAdminReviews("");

      const reviewList = Array.isArray(data)
        ? data
        : data?.results || [];

      setAllReviews(reviewList);
    } catch (err) {
      console.error("Review statistics error:", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Initial load and filter changes.
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  // Calculate review statistics.
  const reviewStats = {
    total: allReviews.length,
    pending: allReviews.filter(
      (review) => review.status === "PENDING"
    ).length,
    approved: allReviews.filter(
      (review) => review.status === "APPROVED"
    ).length,
    rejected: allReviews.filter(
      (review) => review.status === "REJECTED"
    ).length,
  };

  // Calculate pagination.
  const totalPages = Math.max(
    1,
    Math.ceil(reviews.length / PAGE_SIZE)
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  const currentReviews = reviews.slice(startIndex, endIndex);

  // Refresh both the list and statistics.
  const handleRefresh = async () => {
    await Promise.all([
      fetchReviews(),
      fetchAllReviews(),
    ]);
  };

  // Reset pagination when changing filters.
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  // Approve or reject a review.
  const handleStatusChange = async (reviewId, newStatus) => {
    if (
      newStatus === "REJECTED" &&
      !window.confirm("Are you sure you want to reject this review?")
    ) {
      return;
    }

    setProcessingId(reviewId);
    setError("");

    try {
      await updateAdminReviewStatus(reviewId, newStatus);

      // Update the filtered review list.
      if (activeFilter && activeFilter !== newStatus) {
        setReviews((previous) =>
          previous.filter((review) => review.id !== reviewId)
        );
      } else {
        setReviews((previous) =>
          previous.map((review) =>
            review.id === reviewId
              ? { ...review, status: newStatus }
              : review
          )
        );
      }

      // Update the statistics data.
      setAllReviews((previous) =>
        previous.map((review) =>
          review.id === reviewId
            ? { ...review, status: newStatus }
            : review
        )
      );
    } catch (err) {
      setError(err.message || "Could not update review.");
    } finally {
      setProcessingId(null);
    }
  };

  // Permanently delete a review.
  const handleDelete = async (reviewId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this review?"
      )
    ) {
      return;
    }

    setProcessingId(reviewId);
    setError("");

    try {
      await deleteAdminReview(reviewId);

      setReviews((previous) =>
        previous.filter((review) => review.id !== reviewId)
      );

      setAllReviews((previous) =>
        previous.filter((review) => review.id !== reviewId)
      );
    } catch (err) {
      setError(err.message || "Could not delete review.");
    } finally {
      setProcessingId(null);
    }
  };

  // Format review date.
  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Status badge styling.
  const getStatusStyle = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-50 text-green-700";
      case "REJECTED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  };

  return (
    <div className="space-y-7">

      {/* PAGE HEADING */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B99A5B]">
            Customer Management
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#171914]">
            Review Management
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Review, approve or reject customer product reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isStatsLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#EAE7E0] bg-white px-4 py-3 text-sm font-medium text-[#252720] transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              isLoading || isStatsLoading ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* REVIEW STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* TOTAL */}
        <div className="rounded-xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Total Reviews
            </p>
            <ClipboardList size={20} className="text-[#B99A5B]" />
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-[#171914]">
            {isStatsLoading ? "—" : reviewStats.total}
          </h2>

          <p className="mt-2 text-xs text-gray-400">
            All fetched reviews
          </p>
        </div>

        {/* PENDING */}
        <div className="rounded-xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Pending Reviews
            </p>
            <Clock size={20} className="text-amber-600" />
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-amber-600">
            {isStatsLoading ? "—" : reviewStats.pending}
          </h2>

          <p className="mt-2 text-xs text-gray-400">
            Awaiting approval
          </p>
        </div>

        {/* APPROVED */}
        <div className="rounded-xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Approved Reviews
            </p>
            <CheckCircle size={20} className="text-green-600" />
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-green-600">
            {isStatsLoading ? "—" : reviewStats.approved}
          </h2>

          <p className="mt-2 text-xs text-gray-400">
            Published to customers
          </p>
        </div>

        {/* REJECTED */}
        <div className="rounded-xl border border-[#EAE7E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Rejected Reviews
            </p>
            <XCircle size={20} className="text-red-600" />
          </div>

          <h2 className="mt-3 text-3xl font-semibold text-red-600">
            {isStatsLoading ? "—" : reviewStats.rejected}
          </h2>

          <p className="mt-2 text-xs text-gray-400">
            Not published
          </p>
        </div>

      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 border-b border-[#EAE7E0] pb-4">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || "ALL"}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              activeFilter === filter.value
                ? "bg-[#171914] text-white"
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* REVIEW TABLE */}
      <div className="overflow-hidden rounded-xl border border-[#EAE7E0] bg-white">

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-gray-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <MessageSquareText size={36} className="text-gray-300" />

            <h3 className="mt-4 text-base font-semibold text-[#252720]">
              No reviews found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              There are no reviews in this category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">

              <thead className="border-b border-[#EAE7E0] bg-[#FAF9F6]">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Rating</th>
                  <th className="px-6 py-4 font-semibold">Review</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEE9]">
                {currentReviews.map((review) => {
                  const isProcessing = processingId === review.id;

                  return (
                    <tr
                      key={review.id}
                      className="align-top hover:bg-[#FCFBF9]"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[#252720]">
                          {review.customer_name || "Customer"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Review #{review.id}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="max-w-40 text-sm text-[#252720]">
                          {review.product_name || "Product"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= review.rating
                                  ? "fill-[#D6BD83] text-[#D6BD83]"
                                  : "text-gray-200"
                              }
                            />
                          ))}
                        </div>

                        <p className="mt-1 text-xs text-gray-400">
                          {review.rating}/5
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="max-w-xs whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {review.comment}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            review.status
                          )}`}
                        >
                          {review.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">

                          {review.status !== "APPROVED" && (
                            <button
                              type="button"
                              title="Approve review"
                              disabled={isProcessing}
                              onClick={() =>
                                handleStatusChange(
                                  review.id,
                                  "APPROVED"
                                )
                              }
                              className="rounded-lg bg-green-50 p-2 text-green-700 transition hover:bg-green-100 disabled:opacity-40"
                            >
                              <Check size={17} />
                            </button>
                          )}

                          {review.status !== "REJECTED" && (
                            <button
                              type="button"
                              title="Reject review"
                              disabled={isProcessing}
                              onClick={() =>
                                handleStatusChange(
                                  review.id,
                                  "REJECTED"
                                )
                              }
                              className="rounded-lg bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
                            >
                              <X size={17} />
                            </button>
                          )}

                          <button
                            type="button"
                            title="Delete review"
                            disabled={isProcessing}
                            onClick={() => handleDelete(review.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                          >
                            <Trash2 size={17} />
                          </button>

                        </div>

                        {isProcessing && (
                          <p className="mt-2 text-center text-xs text-gray-400">
                            Updating...
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!isLoading && reviews.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-[#252720]">
              {startIndex + 1}
            </span>
            {" - "}
            <span className="font-medium text-[#252720]">
              {Math.min(endIndex, reviews.length)}
            </span>
            {" of "}
            <span className="font-medium text-[#252720]">
              {reviews.length}
            </span>
            {" reviews"}
          </p>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => page - 1)
              }
              className="flex items-center gap-1 rounded-lg border border-[#EAE7E0] px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                  currentPage === page
                    ? "bg-[#171914] text-white"
                    : "border border-[#EAE7E0] text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => page + 1)
              }
              className="flex items-center gap-1 rounded-lg border border-[#EAE7E0] px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReviews;
