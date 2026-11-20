
import { API_BASE } from "../utils/api";

// Public catalog requests do not need customer authentication.
const publicRequest = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`Failed to load ${endpoint}: ${response.status}`);
  }

  const data = await response.json();

  // Handle both normal arrays and DRF paginated responses.
  return Array.isArray(data) ? data : (data.results ?? []);
};

// Product listing needs pagination metadata too.
const publicPaginatedRequest = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`Failed to load ${endpoint}: ${response.status}`);
  }

  return response.json();
};

// Fetch one product and preserve its HTTP error status.
const publicDetailRequest = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    const error = new Error(
      `Failed to load product: ${response.status}`
    );

    error.status = response.status;

    throw error;
  }

  return response.json();
};

// Fetch catalog reference data.
export const getCategories = () =>
  publicRequest("/products/categories/");

export const getCollections = () =>
  publicRequest("/products/collections/");

export const getOccasions = () =>
  publicRequest("/products/occasions/");

// Fetch products with backend filters, sorting and pagination.
export const getProducts = (params = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, value);
    }
  });

  const queryString = queryParams.toString();

  return publicPaginatedRequest(
    `/products/${queryString ? `?${queryString}` : ""}`
  );
};

// Fetch a single product for the Product Detail Page.
export const getProductById = (productId) =>
  publicDetailRequest(`/products/${productId}/`);

// Fetch related products for the current product.
export const getRelatedProducts = (productId) =>
  publicRequest(`/products/${productId}/related/`);