import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  X,
  ZoomIn,
  Send,
  Heart,
  UserRound,
  Search,
} from "lucide-react";

import {
  getProductById,
  getRelatedProducts,
} from "../../../services/catalogService";

import {
  getProductReviews,
  addProductReview,
} from "../../../services/reviewService";

import { addCartItem } from "../../../redux/features/cart/cartSlice";

import {
  fetchWishlist,
  addWishlistItem,
  deleteWishlistItem,
} from "../../../redux/features/cart/wishlist/wishlistSlice";

// --------------------------------------------------
// LENS OPTIONS
// --------------------------------------------------

const LENS_OPTIONS = [
  {
    value: "blue_light",
    title: "Blue-Light Protection",
    description: "Blue-light filtering lens for everyday screen use.",
    price: 500,
  },
  {
    value: "zero_power",
    title: "Zero-Power Clear Lens",
    description: "Clear, non-prescription lens.",
    price: 0,
  },
  {
    value: "frame_only",
    title: "Frame Only",
    description: "Purchase the frame without lenses.",
    price: 0,
  },
];

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price || 0));

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// --------------------------------------------------
// PRODUCT DETAIL COMPONENT
// --------------------------------------------------

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const dispatch = useDispatch();

  // Redux cart quantity.
  const cartQuantity = useSelector((state) => state.cart.totalQuantity);

  // Redux wishlist data.
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const wishlistLoading = useSelector((state) => state.wishlist.loading);

  // --------------------------------------------------
  // PRODUCT STATE
  // --------------------------------------------------

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [quantity, setQuantity] = useState(1);

  const [wishlistFeedback, setWishlistFeedback] = useState("");

  const [stockToast, setStockToast] = useState("");

  // --------------------------------------------------
  // LENS AND CART STATE
  // --------------------------------------------------

  const [lensModalOpen, setLensModalOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState("frame_only");

  const [addingToCart, setAddingToCart] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [cartError, setCartError] = useState("");

  // --------------------------------------------------
  // IMAGE ZOOM STATE
  // --------------------------------------------------

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({
    x: 0,
    y: 0,
  });

  const dragStart = useRef(null);

  // --------------------------------------------------
  // REVIEW STATE
  // --------------------------------------------------

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // --------------------------------------------------
  // RELATED PRODUCTS STATE
  // --------------------------------------------------

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState("");

  // --------------------------------------------------
  // FETCH PRODUCT DETAILS
  // --------------------------------------------------

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getProductById(id);

        setProduct(data);

        const firstColor = data.colors?.[0];

        if (firstColor) {
          setSelectedColorId(firstColor.id);

          const firstAvailableVariant = firstColor.variants?.find(
            (variant) => variant.stock_quantity > 0,
          );

          setSelectedVariantId(firstAvailableVariant?.id ?? null);
        }
      } catch (err) {
        if (err.status === 404) {
          navigate("/products", { replace: true });
          return;
        }

        setError(err.message || "Unable to load product.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, navigate]);

  // --------------------------------------------------
  // FETCH APPROVED REVIEWS
  // --------------------------------------------------

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError("");

        const data = await getProductReviews(id);

        setReviews(Array.isArray(data) ? data : data?.results || []);
      } catch (err) {
        setReviewsError(err.message || "Unable to load reviews.");
      } finally {
        setReviewsLoading(false);
      }
    };

    if (id) fetchReviews();
  }, [id]);

  // --------------------------------------------------
  // FETCH RELATED PRODUCTS
  // --------------------------------------------------

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setRelatedLoading(true);
        setRelatedError("");

        const data = await getRelatedProducts(id);

        setRelatedProducts(data);
      } catch (err) {
        setRelatedError(err.message || "Unable to load related products.");
      } finally {
        setRelatedLoading(false);
      }
    };

    if (id) fetchRelatedProducts();
  }, [id]);

  // Fetch the customer's wishlist.
  useEffect(() => {
    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      dispatch(fetchWishlist());
    }
  }, [dispatch]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [id]);

  // --------------------------------------------------
  // SELECTED PRODUCT DATA
  // --------------------------------------------------

  const selectedColor = useMemo(
    () => product?.colors?.find((color) => color.id === selectedColorId),
    [product, selectedColorId],
  );

  // Images belonging to selected colour.
  const images = useMemo(() => {
    if (!selectedColor?.images) return [];

    return [...selectedColor.images].sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return a.image_order - b.image_order;
    });
  }, [selectedColor]);

  const variants = selectedColor?.variants || [];

  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId,
  );

  const availableVariants = variants.filter(
    (variant) => variant.stock_quantity > 0,
  );

  const selectedLensDetails = LENS_OPTIONS.find(
    (option) => option.value === selectedLens,
  );

  // --------------------------------------------------
  // PRODUCT PRICE CALCULATIONS
  // --------------------------------------------------

  const basePrice = Number(product?.base_price || 0);
  const sellingPrice = Number(product?.selling_price || 0);

  const discountAmount = Math.max(0, basePrice - sellingPrice);

  const discountPercentage =
    basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;

  const totalPrice = sellingPrice + (selectedLensDetails?.price || 0);

  const currentImage = images[selectedImageIndex]?.image_url;

  // --------------------------------------------------
  // CHANGE COLOUR
  // --------------------------------------------------

  const handleColorChange = (color) => {
    setSelectedColorId(color.id);
    setSelectedImageIndex(0);
    setQuantity(1);

    const availableVariant = color.variants?.find(
      (variant) => variant.stock_quantity > 0,
    );

    setSelectedVariantId(availableVariant?.id ?? null);
  };

  // --------------------------------------------------
  // CHANGE SIZE
  // --------------------------------------------------

  const handleVariantChange = (variant) => {
    if (variant.stock_quantity <= 0) return;

    setSelectedVariantId(variant.id);
    setQuantity(1);
  };

  // --------------------------------------------------
  // QUANTITY CONTROLS
  // --------------------------------------------------

  const decreaseQuantity = () => {
    setQuantity((previous) => Math.max(1, previous - 1));
  };

  const increaseQuantity = () => {
    if (!selectedVariant) return;

    const stockLimit = Math.min(selectedVariant.stock_quantity, 10);

    if (quantity >= stockLimit) {
      setStockToast(
        `Only ${selectedVariant.stock_quantity} units available in stock.`,
      );

      return;
    }

    setQuantity((previous) => previous + 1);
  };

  // --------------------------------------------------
  // OPEN LENS SELECTION
  // --------------------------------------------------

  const handleOpenLensModal = () => {
    setCartError("");
    setSuccessMessage("");

    if (!selectedVariant) {
      setCartError("Please select an available size first.");
      return;
    }

    setLensModalOpen(true);
  };

  // --------------------------------------------------
  // ADD TO CART USING REDUX
  // --------------------------------------------------

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    try {
      setAddingToCart(true);
      setCartError("");

      await dispatch(
        addCartItem({
          productVariantId: selectedVariant.id,
          quantity,
          lensOption: selectedLens,
        }),
      ).unwrap();

      setLensModalOpen(false);

      setSuccessMessage("Added to your bag successfully.");
    } catch (err) {
      setCartError(err || "Unable to add this product to your bag.");
    } finally {
      setAddingToCart(false);
    }
  };

  // --------------------------------------------------
  // GALLERY NAVIGATION
  // --------------------------------------------------

  const showPreviousImage = () => {
    setSelectedImageIndex((previous) =>
      previous === 0 ? images.length - 1 : previous - 1,
    );
  };

  const showNextImage = () => {
    setSelectedImageIndex((previous) =>
      previous === images.length - 1 ? 0 : previous + 1,
    );
  };

  // Check whether the current product is in the wishlist.
  const isWishlisted = wishlistItems.some(
    (item) => Number(item.product) === Number(product?.id),
  );

  // Add or remove the current product from the wishlist.
  const handleWishlistToggle = async () => {
    const accessToken = localStorage.getItem("access");

    if (!accessToken) {
      setWishlistFeedback("Please log in to use your wishlist.");
      return;
    }

    try {
      setWishlistFeedback("");

      const existingItem = wishlistItems.find(
        (item) => Number(item.product) === Number(product.id),
      );

      if (existingItem) {
        await dispatch(deleteWishlistItem(existingItem.id)).unwrap();

        setWishlistFeedback("Removed from your wishlist.");
      } else {
        await dispatch(addWishlistItem(product.id)).unwrap();

        setWishlistFeedback("Added to your wishlist.");
      }
    } catch (err) {
      setWishlistFeedback(
        typeof err === "string" ? err : "Unable to update your wishlist.",
      );
    }
  };

  // --------------------------------------------------
  // IMAGE ZOOM
  // --------------------------------------------------

  const changeZoom = (amount) => {
    setZoomLevel((current) => {
      const next = Math.min(
        3,
        Math.max(1, Number((current + amount).toFixed(2))),
      );

      if (next === 1) {
        setImagePosition({ x: 0, y: 0 });
      }

      return next;
    });
  };

  const resetImageZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleWheelZoom = (event) => {
    event.preventDefault();

    changeZoom(event.deltaY < 0 ? 0.25 : -0.25);
  };

  const handleImagePointerDown = (event) => {
    if (zoomLevel <= 1) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      initialX: imagePosition.x,
      initialY: imagePosition.y,
    };
  };

  const handleImagePointerMove = (event) => {
    if (!dragStart.current) return;

    const deltaX = event.clientX - dragStart.current.x;

    const deltaY = event.clientY - dragStart.current.y;

    setImagePosition({
      x: dragStart.current.initialX + deltaX,
      y: dragStart.current.initialY + deltaY,
    });
  };

  const handleImagePointerUp = () => {
    dragStart.current = null;
  };

  // --------------------------------------------------
  // SUBMIT CUSTOMER REVIEW
  // --------------------------------------------------

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    setReviewSuccess("");
    setReviewSubmitError("");

    const trimmedComment = reviewComment.trim();

    if (selectedRating < 1 || selectedRating > 5) {
      setReviewSubmitError("Please select a star rating.");
      return;
    }

    if (trimmedComment.length < 3) {
      setReviewSubmitError("Your review must contain at least 3 characters.");
      return;
    }

    if (trimmedComment.length > 2000) {
      setReviewSubmitError("Your review cannot exceed 2000 characters.");
      return;
    }

    try {
      setSubmittingReview(true);

      await addProductReview(id, {
        rating: selectedRating,
        comment: trimmedComment,
      });

      setReviewSuccess(
        "Your review has been submitted successfully. It will appear publicly after admin approval.",
      );

      setReviewSubmitted(true);
      setReviewComment("");
      setSelectedRating(0);
    } catch (err) {
      setReviewSubmitError(err.message || "Unable to submit your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAF2F8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#172B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-sm tracking-widest uppercase text-[#8295A5]">
            Loading Collection
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#EAF2F8] flex flex-col items-center justify-center px-6">
        <h2 className="text-2xl font-serif text-[#172B3A] mb-3">
          Product unavailable
        </h2>

        <p className="text-[#8295A5] mb-6">
          {error || "We couldn't find this product."}
        </p>

        <Link
          to="/products"
          className="text-sm uppercase tracking-widest underline text-[#172B3A]"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <main className="min-h-screen bg-[#EAF2F8] text-[#172B3A]">
      {/* ==============================================
          BREADCRUMB
      ============================================== */}

      <div className="max-w-[1440px] mx-auto px-5 md:px-10 pt-8 pb-6">
        <nav className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-[0.16em] text-[#8295A5]">
          <Link to="/" className="hover:text-[#172B3A]">
            Home
          </Link>

          <ChevronRight size={13} />

          <Link to="/products" className="hover:text-[#172B3A]">
            Collection
          </Link>

          <ChevronRight size={13} />

          <span className="text-[#172B3A] truncate">{product.name}</span>
        </nav>
      </div>

      {/* ==============================================
          PRODUCT SECTION
      ============================================== */}

      <section className="max-w-[1440px] mx-auto px-5 md:px-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-10 lg:gap-20">
          {/* LEFT: IMAGE GALLERY */}
          <div className="min-w-0">
            <div className="relative bg-[#DCE7F0] overflow-hidden aspect-[4/5] flex items-center justify-center group">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
                  onClick={() => setLightboxOpen(true)}
                />
              ) : (
                <div className="text-[#8295A5] text-sm">
                  No product image available
                </div>
              )}

              {discountPercentage > 0 && (
                <span className="absolute top-5 left-5 bg-[#172B3A] text-white text-[10px] uppercase tracking-widest px-4 py-2">
                  {discountPercentage}% Off
                </span>
              )}

              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-5 right-5 bg-white/80 backdrop-blur-sm p-3 rounded-full opacity-0 group-hover:opacity-100 transition"
                aria-label="Zoom image"
              >
                <ZoomIn size={18} />
              </button>

              {images.length > 1 && (
                <>
                  <button
                    onClick={showPreviousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full hover:bg-white transition"
                    aria-label="Previous image"
                  >
                    <ArrowLeft size={17} />
                  </button>

                  <button
                    onClick={showNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-3 rounded-full hover:bg-white transition"
                    aria-label="Next image"
                  >
                    <ArrowRight size={17} />
                  </button>
                </>
              )}
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-[#DCE7F0] overflow-hidden border-2 transition ${
                      selectedImageIndex === index
                        ? "border-[#172B3A]"
                        : "border-transparent hover:border-[#8295A5]"
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${product.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* PRODUCT HIGHLIGHTS */}
            {product.highlights?.length > 0 && (
              <div className="mt-12 border-t border-[#D9E3EA] pt-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8295A5] mb-6">
                  Product Highlights
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[...product.highlights]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((highlight) => (
                      <div
                        key={highlight.id}
                        className="flex items-center gap-3"
                      >
                        <Check size={16} className="text-[#426782]" />

                        <span className="text-sm text-[#263B4B]">
                          {highlight.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PRODUCT INFORMATION */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#8295A5] mb-4">
              SpeQ — Atelier Optical
            </p>

            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight">
                {product.name}
              </h1>

              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                aria-pressed={isWishlisted}
                className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full border border-[#D9E3EA] bg-white transition hover:border-[#172B3A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Heart
                  size={21}
                  fill={isWishlisted ? "#172B3A" : "none"}
                  stroke="#172B3A"
                />
              </button>
            </div>

            {wishlistFeedback && (
              <p className="mb-4 text-sm text-[#426782]" role="status">
                {wishlistFeedback}
              </p>
            )}

            {/* RATING SUMMARY */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                <Star size={14} fill="#C5AE87" stroke="#C5AE87" />

                <span className="text-sm">
                  {Number(product.average_rating || 0).toFixed(1)}
                </span>
              </div>

              <span className="text-xs text-[#8295A5]">
                ({product.review_count || 0} Reviews)
              </span>
            </div>

            {/* PRICE */}
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <span className="text-2xl font-medium">
                {formatPrice(sellingPrice)}
              </span>

              {discountAmount > 0 && (
                <>
                  <span className="text-sm line-through text-[#8295A5]">
                    {formatPrice(basePrice)}
                  </span>

                  <span className="text-xs text-[#426782]">
                    Save {formatPrice(discountAmount)}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm leading-7 text-[#426782] mb-8">
              {product.description}
            </p>

            <div className="border-t border-[#D9E3EA] pt-7 space-y-8">
              {/* COLOUR SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em]">
                    Select Colour
                  </p>

                  <span className="text-xs text-[#8295A5]">
                    {selectedColor?.color_name}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {product.colors?.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorChange(color)}
                      title={color.color_name}
                      className={`w-9 h-9 rounded-full flex items-center justify-center border transition ${
                        selectedColorId === color.id
                          ? "border-[#172B3A] ring-2 ring-[#172B3A] ring-offset-2 ring-offset-[#EAF2F8]"
                          : "border-[#D9E3EA]"
                      }`}
                      style={{
                        backgroundColor: color.color_code || "#DCE7F0",
                      }}
                    >
                      {selectedColorId === color.id && (
                        <Check size={15} className="text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIZE SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em]">
                    Select Size
                  </p>

                  <span className="text-xs text-[#8295A5]">
                    {availableVariants.length} Available
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {variants.map((variant) => {
                    const unavailable = variant.stock_quantity <= 0;

                    return (
                      <button
                        key={variant.id}
                        disabled={unavailable}
                        onClick={() => handleVariantChange(variant)}
                        className={`min-w-14 h-12 px-4 border text-xs transition ${
                          selectedVariantId === variant.id
                            ? "bg-[#172B3A] text-white border-[#172B3A]"
                            : unavailable
                              ? "border-[#D9E3EA] text-[#AAB7C1] line-through cursor-not-allowed"
                              : "border-[#D9E3EA] hover:border-[#172B3A]"
                        }`}
                      >
                        {variant.size}
                      </button>
                    );
                  })}
                </div>

                {selectedVariant && (
                  <p className="text-xs text-[#8295A5] mt-3">
                    {selectedVariant.stock_quantity} units available
                  </p>
                )}
              </div>

              {/* QUANTITY */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] mb-4">
                  Quantity
                </p>

                <div className="inline-flex items-center border border-[#D9E3EA] h-12">
                  <button
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="w-12 h-full flex items-center justify-center disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>

                  <span className="w-12 text-center text-sm">{quantity}</span>

                  <button
                    onClick={increaseQuantity}
                    disabled={!selectedVariant}
                    className="w-12 h-full flex items-center justify-center disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* STOCK INFORMATION */}
                {selectedVariant && (
                  <p className="text-xs text-[#8295A5] mt-3">
                    {selectedVariant.stock_quantity} units available
                  </p>
                )}

                {/* STOCK TOAST */}
                {stockToast && (
                  <div
                    role="status"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#D9E3EA] bg-white px-4 py-3 text-xs text-[#172B3A] shadow-sm"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#C5AE87]" />
                    {stockToast}
                  </div>
                )}
              </div>
              {/* ADD TO BAG */}
              <div>
                <button
                  onClick={handleOpenLensModal}
                  disabled={
                    !product.is_available ||
                    !selectedVariant ||
                    selectedVariant.stock_quantity <= 0
                  }
                  className="w-full h-14 bg-[#172B3A] text-white flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] hover:bg-[#263B4B] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={17} />

                  {!product.is_available ? "Out of Stock" : "Add to Bag"}
                </button>

                {successMessage && (
                  <p className="text-sm text-green-700 mt-4 flex items-center gap-2">
                    <Check size={16} />
                    {successMessage}
                  </p>
                )}

                {cartError && (
                  <p className="text-sm text-red-600 mt-4">{cartError}</p>
                )}
              </div>

              {/* PRODUCT INFORMATION */}
              <div className="border-t border-[#D9E3EA] pt-6 space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8295A5]">Frame Shape</span>

                  <span className="capitalize">
                    {product.frame_shape?.replaceAll("_", " ") || "—"}
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#8295A5]">Category</span>

                  <span className="capitalize">
                    {product.category?.replaceAll("_", " ") || "—"}
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#8295A5]">Collection</span>

                  <span className="capitalize">
                    {product.collection?.replaceAll("_", " ") || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================
          CUSTOMER REVIEWS
      ============================================== */}

      <section
        id="reviews"
        className="max-w-[1440px] mx-auto px-5 md:px-10 pb-24"
      >
        <div className="border-t border-[#D9E3EA] pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
            {/* REVIEW SUMMARY AND FORM */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#8295A5] mb-4">
                Customer Experience
              </p>

              <h2 className="font-serif text-3xl md:text-4xl mb-5">
                Reviews & Ratings
              </h2>

              <div className="flex items-center gap-4 mb-8">
                <span className="font-serif text-5xl">
                  {Number(product.average_rating || 0).toFixed(1)}
                </span>

                <div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        fill={
                          star <= Number(product.average_rating || 0)
                            ? "#C5AE87"
                            : "none"
                        }
                        stroke="#C5AE87"
                      />
                    ))}
                  </div>

                  <p className="text-xs text-[#8295A5]">
                    Based on {product.review_count || 0} approved reviews
                  </p>
                </div>
              </div>

              <div className="bg-[#DCE7F0]/60 p-6 md:p-8">
                <h3 className="font-serif text-2xl mb-2">
                  Share Your Experience
                </h3>

                <p className="text-sm text-[#8295A5] leading-6 mb-6">
                  Tell other customers what you think about this product.
                </p>

                {reviewSubmitted ? (
                  <div className="border border-[#D9E3EA] p-5">
                    <div className="flex items-center gap-2 text-[#426782] mb-3">
                      <Check size={18} />

                      <span className="text-sm font-medium">
                        Review Submitted
                      </span>
                    </div>

                    <p className="text-sm text-[#426782] leading-6">
                      {reviewSuccess}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit}>
                    <label className="block text-[10px] uppercase tracking-[0.2em] mb-4">
                      Your Rating
                    </label>

                    <div className="flex gap-2 mb-7">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedRating(star)}
                          aria-label={`Rate ${star} out of 5`}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={28}
                            fill={star <= selectedRating ? "#C5AE87" : "none"}
                            stroke="#C5AE87"
                          />
                        </button>
                      ))}
                    </div>

                    <label
                      htmlFor="review-comment"
                      className="block text-[10px] uppercase tracking-[0.2em] mb-3"
                    >
                      Your Review
                    </label>

                    <textarea
                      id="review-comment"
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows={5}
                      maxLength={2000}
                      placeholder="Write about your experience with this product..."
                      className="w-full resize-y bg-[#EAF2F8] border border-[#D9E3EA] p-4 text-sm outline-none focus:border-[#172B3A] transition"
                    />

                    <p className="text-[10px] text-right text-[#8295A5] mt-2 mb-5">
                      {reviewComment.length}/2000 characters
                    </p>

                    {reviewSubmitError && (
                      <p className="text-sm text-red-600 mb-4">
                        {reviewSubmitError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full h-12 bg-[#172B3A] text-white flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#263B4B] transition disabled:opacity-50"
                    >
                      <Send size={15} />

                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>

                    <p className="text-[10px] text-[#8295A5] leading-5 mt-4">
                      You must be logged in to submit a review. Reviews are
                      displayed publicly after admin approval. Only one review
                      is allowed per customer for each product.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* APPROVED REVIEW LIST */}
            <div>
              <div className="flex items-center justify-between border-b border-[#D9E3EA] pb-5 mb-6">
                <h3 className="font-serif text-2xl">Customer Reviews</h3>

                <span className="text-xs text-[#8295A5]">
                  {product.review_count || 0} Reviews
                </span>
              </div>

              {reviewsLoading ? (
                <div className="py-12 text-center">
                  <div className="w-7 h-7 border-2 border-[#172B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />

                  <p className="text-xs uppercase tracking-widest text-[#8295A5]">
                    Loading Reviews
                  </p>
                </div>
              ) : reviewsError ? (
                <div className="py-8">
                  <p className="text-sm text-red-600">{reviewsError}</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-12 text-center border border-[#D9E3EA]">
                  <Star size={28} className="mx-auto mb-4 text-[#C5AE87]" />

                  <h4 className="font-serif text-xl mb-2">No Reviews Yet</h4>

                  <p className="text-sm text-[#8295A5]">
                    Be the first to share your experience.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#D9E3EA]">
                  {reviews.map((review) => (
                    <article key={review.id} className="py-7 first:pt-0">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            {review.customer_name ||
                              review.user?.full_name ||
                              review.user?.username ||
                              "Customer"}
                          </h4>

                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={13}
                                fill={
                                  star <= Number(review.rating)
                                    ? "#C5AE87"
                                    : "none"
                                }
                                stroke="#C5AE87"
                              />
                            ))}
                          </div>
                        </div>

                        <span className="text-[10px] text-[#8295A5] whitespace-nowrap">
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      <p className="text-sm leading-7 text-[#426782] whitespace-pre-line">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================
          RELATED PRODUCTS
      ============================================== */}

      <section className="max-w-[1440px] mx-auto px-5 md:px-10 pb-24">
        <div className="border-t border-[#D9E3EA] pt-14">
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#8295A5] mb-3">
              Curated For You
            </p>

            <h2 className="font-serif text-3xl md:text-4xl text-[#172B3A]">
              You May Also Like
            </h2>

            <p className="text-sm text-[#8295A5] mt-3">
              Discover more frames selected to complement your style.
            </p>
          </div>

          {relatedLoading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-[#172B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />

              <p className="text-xs uppercase tracking-widest text-[#8295A5]">
                Finding Your Next Frame
              </p>
            </div>
          ) : relatedError ? (
            <p className="text-sm text-red-600 py-6">{relatedError}</p>
          ) : relatedProducts.length === 0 ? (
            <p className="text-sm text-[#8295A5] py-6">
              No related products available at the moment.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-7">
              {relatedProducts.map((relatedProduct) => {
                const originalPrice = Number(relatedProduct.base_price || 0);

                const currentPrice = Number(relatedProduct.selling_price || 0);

                const hasDiscount = originalPrice > currentPrice;

                return (
                  <Link
                    key={relatedProduct.id}
                    to={`/products/${relatedProduct.id}`}
                    className="group block min-w-0"
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative aspect-[4/5] bg-[#DCE7F0] overflow-hidden mb-4">
                      {relatedProduct.image_url ? (
                        <img
                          src={relatedProduct.image_url}
                          alt={relatedProduct.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#8295A5]">
                          No Image Available
                        </div>
                      )}

                      {hasDiscount && (
                        <span className="absolute top-3 left-3 bg-[#172B3A] text-white text-[9px] uppercase tracking-wider px-3 py-2">
                          {Math.round(
                            ((originalPrice - currentPrice) / originalPrice) *
                              100,
                          )}
                          % Off
                        </span>
                      )}
                    </div>

                    {/* PRODUCT INFORMATION */}
                    <div>
                      <h3 className="text-sm md:text-base font-medium text-[#172B3A] line-clamp-2 group-hover:text-[#426782] transition-colors">
                        {relatedProduct.name}
                      </h3>

                      {relatedProduct.frame_shape && (
                        <p className="text-[10px] uppercase tracking-widest text-[#8295A5] mt-2">
                          {relatedProduct.frame_shape.replaceAll("_", " ")}
                        </p>
                      )}

                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <span className="text-sm font-medium text-[#172B3A]">
                          {formatPrice(currentPrice)}
                        </span>

                        {hasDiscount && (
                          <span className="text-xs line-through text-[#8295A5]">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>

                      <span className="inline-block text-[9px] uppercase tracking-[0.18em] border-b border-[#172B3A] pb-1 mt-4 opacity-70 group-hover:opacity-100">
                        Discover Frame
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==============================================
          LENS SELECTION MODAL
      ============================================== */}

      {lensModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#172B3A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#EAF2F8] w-full max-w-lg p-6 md:p-9 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setLensModalOpen(false)}
              className="absolute right-5 top-5 p-2 hover:bg-[#DCE7F0] rounded-full"
              aria-label="Close lens selection"
            >
              <X size={20} />
            </button>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#8295A5] mb-3">
              Personalise Your Eyewear
            </p>

            <h2 className="font-serif text-3xl mb-3">Choose Your Lens</h2>

            <p className="text-sm text-[#8295A5] leading-6 mb-8">
              Select the lens option that suits your preference.
            </p>

            <div className="space-y-3">
              {LENS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedLens(option.value)}
                  className={`w-full text-left p-5 border transition ${
                    selectedLens === option.value
                      ? "border-[#172B3A] bg-[#DCE7F0]"
                      : "border-[#D9E3EA] hover:border-[#8295A5]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3">
                      <div
                        className={`w-4 h-4 mt-1 rounded-full border flex items-center justify-center ${
                          selectedLens === option.value
                            ? "border-[#172B3A]"
                            : "border-[#8295A5]"
                        }`}
                      >
                        {selectedLens === option.value && (
                          <span className="w-2 h-2 rounded-full bg-[#172B3A]" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium">{option.title}</h3>

                        <p className="text-xs text-[#8295A5] mt-2 leading-5">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <span className="text-sm whitespace-nowrap">
                      {option.price > 0
                        ? `+${formatPrice(option.price)}`
                        : "Free"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* PRICE SUMMARY */}
            <div className="border-t border-[#D9E3EA] mt-7 pt-6">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-[#8295A5]">Frame Price</span>

                <span>{formatPrice(sellingPrice)}</span>
              </div>

              <div className="flex justify-between text-sm mb-5">
                <span className="text-[#8295A5]">Lens Price</span>

                <span>{formatPrice(selectedLensDetails?.price || 0)}</span>
              </div>

              <div className="flex justify-between items-center border-t border-[#D9E3EA] pt-5 mb-6">
                <span className="text-sm uppercase tracking-widest">Total</span>

                <span className="text-xl font-medium">
                  {formatPrice(totalPrice * quantity)}
                </span>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full h-14 bg-[#172B3A] text-white text-[11px] uppercase tracking-[0.2em] hover:bg-[#263B4B] transition disabled:opacity-50"
              >
                {addingToCart ? "Adding..." : "Confirm & Add to Bag"}
              </button>

              <p className="text-[10px] text-center text-[#8295A5] mt-4">
                {quantity} × {formatPrice(totalPrice)} per item
              </p>

              {cartError && (
                <p className="text-sm text-red-600 mt-4 text-center">
                  {cartError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          IMAGE LIGHTBOX
      ============================================== */}

      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-[60] bg-[#172B3A]/95 flex items-center justify-center p-5"
          onWheel={handleWheelZoom}
        >
          <button
            onClick={() => {
              setLightboxOpen(false);
              resetImageZoom();
            }}
            className="absolute top-6 right-6 text-white p-3 z-20 hover:bg-white/10 rounded-full transition"
            aria-label="Close image viewer"
          >
            <X size={26} />
          </button>

          <div className="w-full h-[85vh] overflow-hidden flex items-center justify-center">
            <img
              src={currentImage}
              alt={product.name}
              draggable={false}
              onPointerDown={handleImagePointerDown}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={handleImagePointerUp}
              onDoubleClick={resetImageZoom}
              className={`max-h-[85vh] max-w-full object-contain select-none ${
                zoomLevel > 1
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-zoom-in"
              }`}
              style={{
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel})`,
                transition: dragStart.current ? "none" : "transform 200ms ease",
                touchAction: "none",
              }}
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={() => {
                  showPreviousImage();
                  resetImageZoom();
                }}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/10 rounded-full transition"
                aria-label="Previous image"
              >
                <ArrowLeft size={25} />
              </button>

              <button
                onClick={() => {
                  showNextImage();
                  resetImageZoom();
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white p-3 hover:bg-white/10 rounded-full transition"
                aria-label="Next image"
              >
                <ArrowRight size={25} />
              </button>
            </>
          )}

          {/* ZOOM CONTROLS */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 text-white">
            <button
              onClick={() => changeZoom(-0.25)}
              disabled={zoomLevel <= 1}
              className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition"
              aria-label="Zoom out"
            >
              <Minus size={19} />
            </button>

            <span className="text-xs min-w-[48px] text-center tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => changeZoom(0.25)}
              disabled={zoomLevel >= 3}
              className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition"
              aria-label="Zoom in"
            >
              <Plus size={19} />
            </button>

            <div className="w-px h-5 bg-white/30 mx-1" />

            <button
              onClick={resetImageZoom}
              className="px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-white/10 rounded-full transition"
            >
              Reset
            </button>
          </div>

          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/50 tracking-wider whitespace-nowrap">
            SCROLL TO ZOOM · DRAG TO EXPLORE · DOUBLE CLICK TO RESET
          </p>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
