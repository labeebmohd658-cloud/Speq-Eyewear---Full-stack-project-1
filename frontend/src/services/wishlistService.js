
import { apiRequest } from "../utils/api";

// Convert the API response into JSON.
// Handle responses that don't contain a response body.
const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      data?.error ||
      data?.message ||
      "Something went wrong with the wishlist request."
    );
  }

  return data;
};

// Fetch the logged-in customer's wishlist.
export const getWishlist = async () => {
  const response = await apiRequest("/products/wishlist/");
  return handleResponse(response);
};

// Add a product to the wishlist.
export const addToWishlist = async (productId) => {
  const response = await apiRequest("/products/wishlist/add/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product: productId,
    }),
  });

  return handleResponse(response);
};

// Remove a product from the wishlist.
export const removeFromWishlist = async (itemId) => {
  const response = await apiRequest(
    `/products/wishlist/remove/${itemId}/`,
    {
      method: "DELETE",
    }
  );

  return handleResponse(response);
};
