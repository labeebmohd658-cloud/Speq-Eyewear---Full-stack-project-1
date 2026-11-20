import { adminApiRequest } from "../utils/adminApi";

// Convert the API response into useful data or a readable error.
const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data?.detail ||
      data?.error ||
      data?.message ||
      Object.values(data || {}).flat().join(" ") ||
      "Something went wrong with the review request.";

    throw new Error(errorMessage);
  }

  return data;
};

// Fetch all reviews or filter by status.
export const getAdminReviews = async (status = "") => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  const response = await adminApiRequest(
    `/admin/reviews/${query}`
  );

  return handleResponse(response);
};

// Change a review's status to APPROVED or REJECTED.
export const updateAdminReviewStatus = async (reviewId, status) => {
  const response = await adminApiRequest(
    `/admin/reviews/${reviewId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  return handleResponse(response);
};

// Permanently delete a review.
export const deleteAdminReview = async (reviewId) => {
  const response = await adminApiRequest(
    `/admin/reviews/${reviewId}/delete/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    return handleResponse(response);
  }

  return true;
};