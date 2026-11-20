
import { apiRequest } from "../utils/api";

// Handle the API response and errors.
const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      data?.message ||
      "Something went wrong with the review request."
    );
  }

  return data;
};

// Fetch approved reviews for a product.
// Public endpoint — authentication is not required.
export const getProductReviews = async (productId) => {
  const response = await apiRequest(
    `/products/${productId}/reviews/`
  );

  return handleResponse(response);
};

// Submit a review for a product.
// Requires the customer to be logged in.
export const addProductReview = async (productId, reviewData) => {
  const response = await apiRequest(
    `/products/${productId}/reviews/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: reviewData.rating,
        comment: reviewData.comment,
      }),
    }
  );

  return handleResponse(response);
};
