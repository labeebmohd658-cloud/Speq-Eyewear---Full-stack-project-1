
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
      "Something went wrong with the cart request."
    );
  }

  return data;
};

// Fetch the logged-in customer's cart.
export const getCart = async () => {
  const response = await apiRequest("/products/cart/");
  return handleResponse(response);
};

// Add a product variant and selected lens option to the cart.
export const addToCart = async (
  productVariantId,
  quantity = 1,
  lensOption = "frame_only"
) => {
  const response = await apiRequest("/products/cart/add/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_variant: productVariantId,
      quantity: quantity,
      lens_option: lensOption,
    }),
  });

  return handleResponse(response);
};

// Update the quantity of an existing cart item.
export const updateCartItem = async (itemId, quantity) => {
  const response = await apiRequest(`/products/cart/update/${itemId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quantity: quantity,
    }),
  });

  return handleResponse(response);
};

// Remove an item from the cart.
export const removeCartItem = async (itemId) => {
  const response = await apiRequest(`/products/cart/remove/${itemId}/`, {
    method: "DELETE",
  });

  return handleResponse(response);
};
