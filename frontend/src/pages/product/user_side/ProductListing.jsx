
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart } from "lucide-react";

import {
  getProducts,
  getCategories,
  getCollections,
  getOccasions,
} from "../../../services/catalogService";

import {
  fetchWishlist,
  addWishlistItem,
  deleteWishlistItem,
} from "../../../redux/features/cart/wishlist/wishlistSlice";

const SHAPES = ["rectangle", "round", "aviator", "geometric", "square"];

const SORT_OPTIONS = [
  { label: "Featured", value: "" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Name: A to Z", value: "name_asc" },
  { label: "Name: Z to A", value: "name_desc" },
];

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Convert a slug or value into readable text.
const readable = (value = "") =>
  String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

// Safely get the first usable product image from nested color data.
const getProductImage = (product, selectedColor) => {
  const colors = product?.colors ?? [];

  const selectedImages = selectedColor?.images ?? [];
  const allImages = colors.flatMap((color) => color?.images ?? []);

  const images = selectedImages.length ? selectedImages : allImages;

  const primaryImage = images.find(
    (image) => image?.is_primary && image?.image_url,
  );

  return (
    primaryImage?.image_url ||
    images.find((image) => image?.image_url)?.image_url ||
    ""
  );
};

const getProductPrice = (product) =>
  Number(product?.selling_price ?? product?.base_price ?? 0);

const getOriginalPrice = (product) => {
  const base = Number(product?.base_price ?? 0);
  const selling = Number(product?.selling_price ?? 0);

  return base > selling ? base : null;
};

const getAvailability = (product) => product?.is_available === true;

function ProductListing() {
  const dispatch = useDispatch();

  const [searchParams, setSearchParams] = useSearchParams();

  // Read wishlist information from Redux.
  const wishlistItems = useSelector(
    (state) => state.wishlist.items,
  );

  const wishlistLoading = useSelector(
    (state) => state.wishlist.loading,
  );

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [occasions, setOccasions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );

  const [selectedColors, setSelectedColors] = useState({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [toast, setToast] = useState("");

  const [totalCount, setTotalCount] = useState(0);

  // Read current filters from the URL.
  const category = searchParams.get("category") ?? "";
  const collection = searchParams.get("collection") ?? "";
  const frameShape = searchParams.get("frame_shape") ?? "";
  const occasion = searchParams.get("occasion") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const page = Number(searchParams.get("page") || 1);
  const search = searchParams.get("search") ?? "";

  // Show a toast message.
  const showToast = (message) => {
    setToast(message);

    window.clearTimeout(showToast.timeout);

    showToast.timeout = window.setTimeout(() => {
      setToast("");
    }, 2400);
  };

  // Fetch the customer's wishlist when the page loads.
  // The wishlist API requires authentication.
  useEffect(() => {
    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      dispatch(fetchWishlist());
    }
  }, [dispatch]);

  // Check whether a product already exists in the wishlist.
  const isWishlisted = (productId) =>
    wishlistItems.some(
      (item) => Number(item.product) === Number(productId),
    );

  // Add or remove a product from the backend wishlist.
  const toggleWishlist = async (product) => {
    // Prevent wishlist requests when the customer is logged out.
    const accessToken = localStorage.getItem("access");

    if (!accessToken) {
      showToast("Please log in to use your wishlist");
      return;
    }

    try {
      const existingItem = wishlistItems.find(
        (item) => Number(item.product) === Number(product.id),
      );

      if (existingItem) {
        await dispatch(
          deleteWishlistItem(existingItem.id),
        ).unwrap();

        showToast("Removed from your wishlist");
      } else {
        await dispatch(
          addWishlistItem(product.id),
        ).unwrap();

        showToast("Added to your wishlist");
      }
    } catch (err) {
      showToast(
        typeof err === "string"
          ? err
          : "Unable to update your wishlist",
      );
    }
  };

  // Load categories, collections and occasions from the backend.
  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);

      try {
        const [
          categoryData,
          collectionData,
          occasionData,
        ] = await Promise.all([
          getCategories(),
          getCollections(),
          getOccasions(),
        ]);

        if (!active) return;

        setCategories(categoryData);
        setCollections(collectionData);
        setOccasions(occasionData);
      } catch (err) {
        if (active) {
          console.error("Catalog loading failed:", err);
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  // Fetch products whenever URL filters or page changes.
  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getProducts({
          search,
          category,
          collection,
          frame_shape: frameShape,
          occasion,
          sort,
          page,
        });

        if (!active) return;

        setProducts(response.results ?? []);
        setTotalCount(Number(response.count ?? 0));
      } catch (err) {
        if (!active) return;

        console.error("Product loading failed:", err);
        setError("We couldn't load the products. Please try again.");
        setProducts([]);
        setTotalCount(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [search, category, collection, frameShape, occasion, sort, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 8));

  // Keep search field synchronized when browser navigation changes URL.
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce search input before updating the URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({
        search: searchInput.trim(),
        page: 1,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL filters without removing active filters.
  const updateFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  const activeFilterCount = [
    category,
    collection,
    frameShape,
    occasion,
  ].filter(Boolean).length;

  const activeCollection = collections.find(
    (item) => item.slug === collection,
  );

  const pageTitle = category
    ? readable(category)
    : collection
      ? activeCollection?.name ?? readable(collection)
      : "The Collection";

  const pageDescription = category
    ? `Explore our ${readable(category).toLowerCase()} collection, thoughtfully designed for everyday distinction.`
    : collection
      ? activeCollection?.description ||
        `Discover the ${activeCollection?.name ?? readable(collection)} collection.`
      : "A considered selection of frames. Designed with intention, made to be worn.";

  const getSelectedColor = (product) => {
    const colors = product?.colors ?? [];
    const selectedId = selectedColors[product.id];

    return (
      colors.find((color) => color.id === selectedId) ||
      colors[0] ||
      null
    );
  };

  const displayedProducts = useMemo(
    () => products,
    [products],
  );

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;

    updateFilters({ page: nextPage });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#EAF2F8] text-[#172B3A]">
      {/* NAVIGATION */}

      <main className="mx-auto max-w-[1600px] px-5 pb-20 md:px-10">

        {/* EDITORIAL HEADER */}
        <section className="py-12 md:py-20">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8295A5]">
                SPEQ / {collection ? "COLLECTION" : "EYEWEAR"}
              </p>

              <h1 className="font-serif text-5xl font-normal leading-[1.05] tracking-tight text-[#172B3A] sm:text-6xl md:text-7xl">
                {pageTitle}
                <span className="text-[#426782]">.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#526879]">
                {pageDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  updateFilters({ collection: "", page: 1 })
                }
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  !collection
                    ? "border-[#172B3A] bg-[#172B3A] text-white"
                    : "border-[#C8D5DF] text-[#526879] hover:bg-white"
                }`}
              >
                All Collections
              </button>

              {collections.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    updateFilters({
                      collection: item.slug,
                      page: 1,
                    })
                  }
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    collection === item.slug
                      ? "border-[#172B3A] bg-[#172B3A] text-white"
                      : "border-[#C8D5DF] text-[#526879] hover:bg-white"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="sticky top-[65px] z-30 mb-8 border-y border-[#D9E3EA] bg-[#EAF2F8]/90 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8295A5]">
                Shape
              </span>

              {SHAPES.map((shape) => (
                <button
                  key={shape}
                  onClick={() =>
                    updateFilters({
                      frame_shape: frameShape === shape ? "" : shape,
                      page: 1,
                    })
                  }
                  className={`rounded-full px-3 py-2 text-[11px] transition ${
                    frameShape === shape
                      ? "bg-[#172B3A] text-white"
                      : "bg-white/60 text-[#526879] hover:bg-white"
                  }`}
                >
                  {readable(shape)}
                </button>
              ))}
            </div>

            <div className="flex flex-1 items-center justify-between gap-3 lg:flex-none">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 rounded-full border border-[#C8D5DF] px-4 py-2 text-xs text-[#263B4B] lg:hidden"
              >
                <span>☷</span>
                Filters

                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#172B3A] px-2 py-0.5 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-[#8295A5] sm:inline">
                  {totalCount} pieces
                </span>

                <select
                  value={sort}
                  onChange={(event) =>
                    updateFilters({
                      sort: event.target.value,
                      page: 1,
                    })
                  }
                  className="rounded-full border border-[#C8D5DF] bg-white/60 px-4 py-2 text-xs text-[#263B4B] outline-none"
                  aria-label="Sort products"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="hidden text-xs text-[#8295A5] underline underline-offset-4 sm:inline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE SEARCH */}
        <div className="mb-6 lg:hidden">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search frames, collections..."
            className="w-full rounded-full border border-[#D9E3EA] bg-white/70 px-5 py-3 text-sm outline-none placeholder:text-[#8295A5] focus:border-[#426782]"
          />
        </div>

        {/* PRODUCT GRID */}
        {error ? (
          <div className="py-24 text-center">
            <p className="font-serif text-3xl">{error}</p>

            <button
              onClick={() => updateFilters({ page })}
              className="mt-5 rounded-full bg-[#172B3A] px-6 py-3 text-xs text-white"
            >
              Try Again
            </button>
          </div>
        ) : loading || catalogLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-7 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/5] rounded-sm bg-[#DCE7F0]" />
                <div className="mt-4 h-3 w-2/3 rounded bg-[#DCE7F0]" />
                <div className="mt-3 h-3 w-1/3 rounded bg-[#DCE7F0]" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="py-28 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8295A5]">
              NOTHING FOUND
            </p>

            <h2 className="font-serif text-4xl text-[#172B3A]">
              A little too selective?
            </h2>

            <p className="mt-4 text-sm text-[#8295A5]">
              Try changing your search or removing some filters.
            </p>

            <button
              onClick={resetFilters}
              className="mt-7 rounded-full bg-[#172B3A] px-7 py-3 text-xs text-white transition hover:bg-[#426782]"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <span className="text-xs text-[#8295A5]">
                {totalCount} pieces
              </span>

              <button
                onClick={resetFilters}
                className="text-xs text-[#8295A5] underline underline-offset-4"
              >
                Clear filters
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-7 md:gap-y-14 xl:grid-cols-4">
              {displayedProducts.map((product) => {
                const selectedColor = getSelectedColor(product);
                const image = getProductImage(product, selectedColor);
                const available = getAvailability(product);
                const originalPrice = getOriginalPrice(product);

                return (
                  <article
                    key={product.id}
                    className="group min-w-0"
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#DCE7F0]">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs tracking-widest text-[#8295A5]">
                          SPEQ
                        </div>
                      )}

                      {product.badge && (
                        <span className="absolute left-3 top-3 bg-white/90 px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#172B3A]">
                          {product.badge}
                        </span>
                      )}

                      {!available && (
                        <span className="absolute left-3 top-3 bg-[#172B3A] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-white">
                          Sold Out
                        </span>
                      )}

                      {/* WISHLIST BUTTON */}
                      <button
                        onClick={() => toggleWishlist(product)}
                        disabled={wishlistLoading}
                        aria-label={
                          isWishlisted(product.id)
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#172B3A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Heart
                          size={18}
                          fill={
                            isWishlisted(product.id)
                              ? "#172B3A"
                              : "none"
                          }
                          stroke="#172B3A"
                        />
                      </button>

                      <Link
                        to={`/products/${product.id}`}
                        className="absolute bottom-3 left-3 right-3 translate-y-2 bg-white/90 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#172B3A] opacity-0 transition duration-300 hover:bg-[#172B3A] hover:text-white group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100"
                      >
                        View Details
                      </Link>
                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="pt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[9px] uppercase tracking-[0.2em] text-[#8295A5]">
                          {readable(product.collection || "SPEQ")}
                        </span>

                        <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] text-[#8295A5]">
                          {readable(product.frame_shape || "")}
                        </span>
                      </div>

                      <h2 className="truncate font-serif text-lg text-[#172B3A] md:text-xl">
                        {product.name}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#172B3A]">
                          {INR.format(getProductPrice(product))}
                        </span>

                        {originalPrice && (
                          <span className="text-xs text-[#8295A5] line-through">
                            {INR.format(originalPrice)}
                          </span>
                        )}
                      </div>

                      {selectedColor && (
                        <div className="mt-3 flex items-center gap-2">
                          {(product.colors ?? [])
                            .slice(0, 5)
                            .map((color) => (
                              <button
                                key={
                                  color.id ??
                                  color.color_code ??
                                  color.color_name
                                }
                                onClick={() =>
                                  setSelectedColors((current) => ({
                                    ...current,
                                    [product.id]: color.id,
                                  }))
                                }
                                title={color.color_name}
                                aria-label={`Select ${color.color_name}`}
                                className={`h-4 w-4 rounded-full border ${
                                  selectedColor === color
                                    ? "border-[#172B3A] ring-1 ring-[#172B3A] ring-offset-2"
                                    : "border-[#B9C8D3]"
                                }`}
                                style={{
                                  backgroundColor:
                                    color.color_code || "#DCE7F0",
                                }}
                              />
                            ))}

                          <span className="ml-1 truncate text-[10px] text-[#8295A5]">
                            {selectedColor.color_name}
                          </span>
                        </div>
                      )}

                      <p className="mt-3 line-clamp-1 text-[10px] text-[#8295A5]">
                        {readable(product.category || "")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                  className="rounded-full border border-[#C8D5DF] px-5 py-3 text-xs text-[#263B4B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-xs tabular-nums text-[#526879]">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1)}
                  className="rounded-full border border-[#C8D5DF] px-5 py-3 text-xs text-[#263B4B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* MOBILE FILTER DRAWER */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-[#172B3A]/40"
          />

          <aside className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#EAF2F8] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-7 flex items-center justify-between">
              <h2 className="font-serif text-3xl">Filters</h2>

              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-2xl text-[#526879]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Category filter */}
            <div className="mb-7">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8295A5]">
                Category
              </h3>

              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      updateFilters({
                        category:
                          category === item.slug ? "" : item.slug,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-4 py-2 text-xs ${
                      category === item.slug
                        ? "border-[#172B3A] bg-[#172B3A] text-white"
                        : "border-[#C8D5DF] text-[#526879]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame shape filter */}
            <div className="mb-7">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8295A5]">
                Frame Shape
              </h3>

              <div className="flex flex-wrap gap-2">
                {SHAPES.map((shape) => (
                  <button
                    key={shape}
                    onClick={() =>
                      updateFilters({
                        frame_shape:
                          frameShape === shape ? "" : shape,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-4 py-2 text-xs ${
                      frameShape === shape
                        ? "border-[#172B3A] bg-[#172B3A] text-white"
                        : "border-[#C8D5DF] text-[#526879]"
                    }`}
                  >
                    {readable(shape)}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion filter */}
            <div className="mb-8">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8295A5]">
                Occasion
              </h3>

              <div className="flex flex-wrap gap-2">
                {occasions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      updateFilters({
                        occasion:
                          occasion === item.slug ? "" : item.slug,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-4 py-2 text-xs ${
                      occasion === item.slug
                        ? "border-[#172B3A] bg-[#172B3A] text-white"
                        : "border-[#C8D5DF] text-[#526879]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 rounded-full border border-[#C8D5DF] py-3 text-xs text-[#526879]"
              >
                Reset
              </button>

              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-full bg-[#172B3A] py-3 text-xs text-white"
              >
                Show {totalCount} Products
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#172B3A] px-6 py-3 text-center text-xs text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default ProductListing;
