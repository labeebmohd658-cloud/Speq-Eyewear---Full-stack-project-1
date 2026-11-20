import React, { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Package,
  Eye,
  EyeOff,
  AlertTriangle,
  XCircle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  MoreHorizontal,
  RefreshCw,
  Pencil,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { adminApiRequest } from "../../../utils/adminApi";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const normalizeProduct = (product) => {
  const basePrice = Number(product.base_price ?? 0);
  const sellingPrice = Number(product.selling_price ?? basePrice);

  // Calculate total stock from all colour variants.
  const stock = (product.colors ?? []).reduce((total, color) => {
    const colorStock = (color.variants ?? []).reduce(
      (sum, variant) => sum + Number(variant.stock_quantity ?? 0),
      0,
    );

    return total + colorStock;
  }, 0);

  const discountPercentage =
    basePrice > 0 && sellingPrice < basePrice
      ? Math.round(((basePrice - sellingPrice) / basePrice) * 100)
      : 0;

  const isPublished = Boolean(product.is_listed);

  // Get all images from the product's color options
  const allImages = (product.colors ?? []).flatMap(
    (color) => color.images ?? [],
  );

  // Find the image marked as primary
  const primaryImage = allImages.find((image) => image.is_primary);

  // Use the primary image, or fall back to the first available image
  const productImage = primaryImage?.image_url ?? allImages[0]?.image_url ?? "";

  return {
    id: product.id,
    name: product.name ?? "Unnamed product",
    image: productImage,
    material: product.frame_shape ?? "Eyewear frame",
    category: product.category_name ?? "Uncategorized",
    basePrice,
    sellingPrice,
    stock,
    offer: discountPercentage > 0 ? `${discountPercentage}% OFF` : "No offer",
    status: isPublished ? "Published" : "Hidden",
    isArchived: Boolean(product.is_archived),
  };
};

// Format Indian currency.
const formatPrice = (price) => {
  return Number(price).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500">
          {title}
        </p>

        <div className={`rounded-xl p-2 ${color}`}>
          <Icon size={17} />
        </div>
      </div>

      <h2 className="mt-5 font-serif text-4xl text-stone-900">{value}</h2>

      <p className="mt-2 text-xs text-stone-500">{subtitle}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Hidden: "bg-amber-50 text-amber-700",
    Archived: "bg-stone-100 text-stone-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] || "bg-stone-100 text-stone-600"
      }`}
    >
      {status}
    </span>
  );
};

const StockBadge = ({ stock }) => {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <XCircle size={14} />
        Out of stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600">
        <AlertTriangle size={14} />
        Low stock ({stock})
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-emerald-700">{stock} units</span>
  );
};

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const AdminProductList = () => {
  const navigate = useNavigate();

  // Tracks which product's action menu is open.
  const [openActionId, setOpenActionId] = useState(null);

  // Tracks which product is currently being published/hidden.
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Product data from Django.
  const [products, setProducts] = useState([]);

  // API states.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination metadata from Django.
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [previousPageUrl, setPreviousPageUrl] = useState(null);

  // Search and filters.
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [quickFilter, setQuickFilter] = useState("All");

  // Sorting.
  const [sortBy, setSortBy] = useState("name");

  // Current backend page.
  const [currentPage, setCurrentPage] = useState(1);

  // Your backend pagination page_size is 10.
  const productsPerPage = 10;

  // --------------------------------------------------
  // FETCH PRODUCTS
  // --------------------------------------------------

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await adminApiRequest(`/admin/products/?page=${page}`);

      if (!response.ok) {
        throw new Error(`Unable to fetch products (${response.status}).`);
      }

      const data = await response.json();

      console.log("Products API response:", data);

      // Support standard DRF pagination and normal arrays.
      const productList = Array.isArray(data) ? data : data.results;

      if (!Array.isArray(productList)) {
        throw new Error("Unexpected product API response format.");
      }

      // Archived products are not displayed in this list.
      const normalizedProducts = productList
        .filter((product) => !product.is_archived)
        .map(normalizeProduct);

      setProducts(normalizedProducts);

      setTotalCount(
        Array.isArray(data)
          ? normalizedProducts.length
          : Number(data.count ?? 0),
      );

      setNextPageUrl(Array.isArray(data) ? null : (data.next ?? null));

      setPreviousPageUrl(Array.isArray(data) ? null : (data.previous ?? null));
    } catch (err) {
      console.error("Product fetching error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  // --------------------------------------------------
  // EDIT PRODUCT
  // --------------------------------------------------

  const handleEditProduct = (productId) => {
    setOpenActionId(null);

    navigate(`/admin/products/${productId}/edit`);
  };

  // --------------------------------------------------
  // PUBLISH / HIDE PRODUCT
  // --------------------------------------------------

  const handleToggleListing = async (product) => {
    // A hidden product should be published.
    // A published product should be hidden.
    const shouldPublish = product.status !== "Published";

    const confirmationMessage = shouldPublish
      ? `Publish "${product.name}"? It will become visible in the store.`
      : `Hide "${product.name}" from the store? Customers will no longer see it.`;

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoadingId(product.id);
      setOpenActionId(null);

      const response = await adminApiRequest(
        `/admin/products/${product.id}/publish/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_listed: shouldPublish,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data.is_listed?.[0] ||
          data.detail ||
          data.error ||
          data.non_field_errors?.[0] ||
          "Unable to update product visibility.";

        throw new Error(message);
      }

      // Fetch the latest data after a successful update.
      await fetchProducts(currentPage);
    } catch (err) {
      console.error("Product visibility update failed:", err);
      window.alert(err.message || "Unable to update product visibility.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --------------------------------------------------
  // KPI CALCULATIONS
  // --------------------------------------------------

  const totalProducts = totalCount;

  // These metrics are calculated from the currently loaded page.
  const activeProducts = products.filter(
    (product) => product.status === "Published",
  ).length;

  const hiddenProducts = products.filter(
    (product) => product.status === "Hidden",
  ).length;

  const lowStockProducts = products.filter(
    (product) => product.stock > 0 && product.stock <= 5,
  ).length;

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0,
  ).length;

  // --------------------------------------------------
  // FILTER AND SORT
  // --------------------------------------------------

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search) ||
        product.material.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" || product.status === statusFilter;

      let matchesQuickFilter = true;

      if (quickFilter === "Published") {
        matchesQuickFilter = product.status === "Published";
      } else if (quickFilter === "Hidden") {
        matchesQuickFilter = product.status === "Hidden";
      } else if (quickFilter === "Low Stock") {
        matchesQuickFilter = product.stock > 0 && product.stock <= 5;
      } else if (quickFilter === "Out of Stock") {
        matchesQuickFilter = product.stock === 0;
      }

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesQuickFilter
      );
    });
  }, [products, searchTerm, categoryFilter, statusFilter, quickFilter]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "price-low") {
        return a.sellingPrice - b.sellingPrice;
      }

      if (sortBy === "price-high") {
        return b.sellingPrice - a.sellingPrice;
      }

      if (sortBy === "stock") {
        return a.stock - b.stock;
      }

      return 0;
    });
  }, [filteredProducts, sortBy]);

  // --------------------------------------------------
  // FILTER HANDLERS
  // --------------------------------------------------

  const updateQuickFilter = (filter) => {
    setQuickFilter(filter);
    setCurrentPage(1);
  };

  const updateSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const updateCategory = (value) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const updateStatus = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const updateSorting = (value) => {
    setSortBy(value);
  };

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(totalCount / productsPerPage));

  const startIndex =
    totalCount === 0 ? 0 : (currentPage - 1) * productsPerPage + 1;

  const endIndex = Math.min(currentPage * productsPerPage, totalCount);

  // --------------------------------------------------
  // LOADING AND ERROR STATES
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <RefreshCw size={18} className="animate-spin" />
          Loading products...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <XCircle size={30} className="mx-auto mb-3 text-rose-500" />

        <p className="font-medium text-stone-800">Could not load products</p>

        <p className="mt-2 text-sm text-stone-500">{error}</p>

        <button
          type="button"
          onClick={() => fetchProducts(currentPage)}
          className="mt-5 rounded-full bg-[#1C1917] px-5 py-2.5 text-sm text-white hover:bg-[#3B342B]"
        >
          Try again
        </button>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C55343]" />

            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#C55343]">
              ATELIER CATALOG MANAGEMENT
            </p>
          </div>

          <h1 className="font-serif text-4xl text-stone-900">Products</h1>

          <p className="mt-2 text-sm text-stone-500">
            Manage your eyewear collection, pricing and availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/products/add")}
          className="flex items-center justify-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#3B342B]"
        >
          <Plus size={17} />
          Add Product
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="TOTAL PRODUCTS"
          value={totalProducts}
          subtitle="Products in catalog"
          icon={Package}
          color="bg-stone-100 text-stone-600"
        />

        <MetricCard
          title="PUBLISHED"
          value={activeProducts}
          subtitle="Visible on current page"
          icon={Eye}
          color="bg-emerald-50 text-emerald-700"
        />

        <MetricCard
          title="HIDDEN / DRAFT"
          value={hiddenProducts}
          subtitle="Not visible on current page"
          icon={EyeOff}
          color="bg-amber-50 text-amber-700"
        />

        <MetricCard
          title="LOW STOCK"
          value={lowStockProducts}
          subtitle="Current page only"
          icon={AlertTriangle}
          color="bg-orange-50 text-orange-700"
        />

        <MetricCard
          title="OUT OF STOCK"
          value={outOfStockProducts}
          subtitle="Current page only"
          icon={XCircle}
          color="bg-rose-50 text-rose-700"
        />
      </div>

      {/* PRODUCT TABLE SECTION */}
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
        {/* TABLE HEADER */}
        <div className="border-b border-stone-100 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-serif text-2xl text-stone-900">
                Product Inventory
              </h2>

              <p className="mt-1 text-xs text-stone-500">
                View and manage your eyewear products.
              </p>
            </div>

            {/* SEARCH */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#C55343] focus:bg-white"
              />
            </div>
          </div>

          {/* QUICK FILTERS */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {["All", "Published", "Hidden", "Low Stock", "Out of Stock"].map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => updateQuickFilter(filter)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                    quickFilter === filter
                      ? "bg-[#1C1917] text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {filter}
                </button>
              ),
            )}
          </div>

          {/* FILTERS AND SORTING */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <SlidersHorizontal size={15} />
              Filters
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(event) => updateCategory(event.target.value)}
                className="w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-9 text-xs text-stone-600 outline-none focus:border-[#C55343] sm:w-auto"
              >
                <option value="All">All Categories</option>
                <option value="Eyeglasses">Eyeglasses</option>
                <option value="Sunglasses">Sunglasses</option>
                <option value="Screen Glasses">Screen Glasses</option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => updateStatus(event.target.value)}
                className="w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-9 text-xs text-stone-600 outline-none focus:border-[#C55343] sm:w-auto"
              >
                <option value="All">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Hidden">Hidden</option>
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>

            <div className="relative sm:ml-auto">
              <ArrowUpDown
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <select
                value={sortBy}
                onChange={(event) => updateSorting(event.target.value)}
                className="w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-xs text-stone-600 outline-none focus:border-[#C55343] sm:w-auto"
              >
                <option value="name">Sort by Name</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="stock">Stock: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRODUCT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-stone-50">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Offer</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-stone-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F2EEE6]">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-serif text-lg text-[#806B4C]">
                              {product.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {product.material}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-stone-600">
                      {product.category}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-stone-800">
                        ₹{formatPrice(product.sellingPrice)}
                      </div>

                      {product.sellingPrice < product.basePrice && (
                        <div className="mt-1 text-xs text-stone-400 line-through">
                          ₹{formatPrice(product.basePrice)}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StockBadge stock={product.stock} />
                    </td>

                    <td className="px-5 py-4">
                      {product.offer === "No offer" ? (
                        <span className="text-xs text-stone-400">No offer</span>
                      ) : (
                        <span className="rounded-md bg-[#F8EEE9] px-2.5 py-1 text-xs font-medium text-[#B4533F]">
                          {product.offer}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={product.status} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4 text-center">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          aria-label={`More actions for ${product.name}`}
                          aria-expanded={openActionId === product.id}
                          onClick={() =>
                            setOpenActionId(
                              openActionId === product.id ? null : product.id,
                            )
                          }
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {openActionId === product.id && (
                          <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-left shadow-lg">
                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product.id)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-stone-700 transition hover:bg-stone-50"
                            >
                              <Pencil size={16} />
                              Edit Product
                            </button>

                            <div className="my-1 border-t border-stone-100" />

                            {/* HIDE / PUBLISH */}
                            <button
                              type="button"
                              disabled={actionLoadingId === product.id}
                              onClick={() => handleToggleListing(product)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                product.status === "Published"
                                  ? "text-amber-700 hover:bg-amber-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {actionLoadingId === product.id ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : product.status === "Published" ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}

                              {actionLoadingId === product.id
                                ? "Updating..."
                                : product.status === "Published"
                                  ? "Hide from Store"
                                  : "Publish Product"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <Package
                      size={30}
                      className="mx-auto mb-3 text-stone-300"
                    />

                    <p className="text-sm font-medium text-stone-700">
                      No products found
                    </p>

                    <p className="mt-1 text-xs text-stone-400">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col justify-between gap-4 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-stone-500">
            Showing{" "}
            <span className="font-medium text-stone-800">
              {startIndex} - {endIndex}
            </span>{" "}
            of <span className="font-medium text-stone-800">{totalCount}</span>{" "}
            products
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!previousPageUrl || currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border border-stone-200 p-2 text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 text-xs text-stone-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={!nextPageUrl}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="rounded-lg border border-stone-200 p-2 text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminProductList;
