import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Truck,
  Minus,
  Plus,
  Trash2,
  Tag,
  X,
  Lock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Check,
  PackageCheck,
} from "lucide-react";

import {
  fetchCart,
  changeCartItemQuantity,
  deleteCartItem,
  clearCartError,
} from "../../redux/features/cart/cartSlice";

const MAX_QTY_PER_ITEM = 5;

const formatPrice = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const getUnitPrice = (item) =>
  Number(item.selling_price || 0) + Number(item.lens_price || 0);

const getMaxQuantity = (item) =>
  Math.max(0, Math.min(Number(item.stock_quantity || 0), MAX_QTY_PER_ITEM));

const Cart = () => {
  const dispatch = useDispatch();

  const {
    items: cartItems,
    totalQuantity,
    loading,
    error,
  } = useSelector((state) => state.cart);

  const [itemErrors, setItemErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [processingItem, setProcessingItem] = useState(null);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  // Fetch the user's cart when this page loads.
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  // Clear Redux errors when leaving the page.
  useEffect(() => {
    return () => {
      dispatch(clearCartError());
    };
  }, [dispatch]);

  // Automatically dismiss toast notifications.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Separate available and unavailable products.
  const availableItems = useMemo(
    () => cartItems.filter((item) => item.is_available),
    [cartItems],
  );

  const outOfStockItems = useMemo(
    () => cartItems.filter((item) => Number(item.stock_quantity) <= 0),
    [cartItems],
  );

  const unavailableItems = useMemo(
    () => cartItems.filter((item) => !item.is_available),
    [cartItems],
  );

  // An item is invalid if its quantity exceeds live stock or the maximum.
  const invalidQtyItems = useMemo(
    () =>
      cartItems.filter(
        (item) => item.is_available && item.quantity > getMaxQuantity(item),
      ),
    [cartItems],
  );

  // Only available items contribute to the payable subtotal.
  // Only available items contribute to the payable subtotal.
const subtotal = useMemo(
  () =>
    availableItems.reduce(
      (total, item) => total + getUnitPrice(item) * Number(item.quantity),
      0,
    ),
  [availableItems],
);

// Calculate total available item quantity.
const totalItemCount = useMemo(
  () =>
    availableItems.reduce((total, item) => total + Number(item.quantity), 0),
  [availableItems],
);

// Calculate frame savings.
const catalogSavings = useMemo(
  () =>
    availableItems.reduce(
      (total, item) =>
        total + Number(item.discount_amount || 0) * Number(item.quantity),
      0,
    ),
  [availableItems],
);

// No coupon functionality.
const payableTotal = subtotal;

// Checkout eligibility.
const canCheckout =
  cartItems.length > 0 &&
  outOfStockItems.length === 0 &&
  unavailableItems.length === 0 &&
  invalidQtyItems.length === 0;

  // Update quantity through the existing Redux thunk.
  const handleQuantityChange = async (item, nextQuantity) => {
    const maxQuantity = getMaxQuantity(item);

    if (!item.is_available || maxQuantity <= 0) return;

    if (nextQuantity < 1) return;

    if (nextQuantity > Number(item.stock_quantity)) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: `Only ${item.stock_quantity} units are currently available.`,
      }));
      return;
    }

    if (nextQuantity > MAX_QTY_PER_ITEM) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: `Maximum ${MAX_QTY_PER_ITEM} units allowed per frame.`,
      }));
      return;
    }

    setItemErrors((previous) => ({
      ...previous,
      [item.id]: "",
    }));

    setProcessingItem(item.id);

    try {
      await dispatch(
        changeCartItemQuantity({
          itemId: item.id,
          quantity: nextQuantity,
        }),
      ).unwrap();

      showToast("Bag updated successfully.");
    } catch (err) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: err || "Unable to update quantity.",
      }));
    } finally {
      setProcessingItem(null);
    }
  };

  // Remove an item from the cart.
  const handleRemoveItem = async (item) => {
    setProcessingItem(item.id);

    try {
      await dispatch(deleteCartItem(item.id)).unwrap();

      setItemErrors((previous) => {
        const updated = { ...previous };
        delete updated[item.id];
        return updated;
      });

      showToast(`${item.product_name} removed from your bag.`);
    } catch (err) {
      showToast(err || "Unable to remove this item.", "error");
    } finally {
      setProcessingItem(null);
    }
  };

  // Open the remove confirmation modal.
  const confirmRemoveItem = (item) => {
    setItemToRemove(item);
    setRemoveModalOpen(true);
  };

  // Remove the item after confirmation.
  const handleConfirmRemove = async () => {
    if (!itemToRemove) return;

    const item = itemToRemove;

    setRemoveModalOpen(false);
    setItemToRemove(null);

    await handleRemoveItem(item);
  };

  const getCheckoutRestriction = () => {
    if (outOfStockItems.length > 0) {
      return "Remove out-of-stock items before proceeding.";
    }

    if (unavailableItems.length > 0) {
      return "Remove unavailable items before proceeding.";
    }

    if (invalidQtyItems.length > 0) {
      return "Some item quantities exceed available stock. Update them before proceeding.";
    }

    if (cartItems.length === 0) {
      return "Your shopping bag is empty.";
    }

    return "";
  };

  // Loading state.
  if (loading && cartItems.length === 0) {
    return (
      <main className="min-h-[65vh] bg-[#EAF2F8] px-5 py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D9E3EA] border-t-[#172B3A]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#426782]">
            Preparing your SpeQ bag...
          </p>
        </div>
      </main>
    );
  }

  // Initial loading error.
  if (error && cartItems.length === 0) {
    return (
      <main className="min-h-[65vh] bg-[#EAF2F8] px-5 py-24">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-rose-200 bg-white/80 p-10 text-center">
          <AlertTriangle size={32} className="mx-auto text-rose-700" />
          <h2 className="mt-5 font-serif text-2xl text-[#172B3A]">
            Unable to load your bag
          </h2>
          <p className="mt-3 text-sm text-[#8295A5]">{error}</p>
          <button
            onClick={() => dispatch(fetchCart())}
            className="mt-6 rounded-full bg-[#172B3A] px-7 py-3 text-xs font-bold uppercase tracking-widest text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EAF2F8] font-sans text-[#263B4B]">
      {/* BREADCRUMB + PAGE HEADER */}
      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
        <nav className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8295A5]">
          <Link to="/" className="transition-colors hover:text-[#172B3A]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#172B3A]">Shopping Bag</span>
        </nav>

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C5AE87]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#426782]">
                SpeQ Checkout Archive
              </span>
            </div>

            <h1 className="font-serif text-4xl font-medium tracking-tight text-[#172B3A] sm:text-5xl">
              Your Shopping Bag
            </h1>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-[#426782]">
            {totalItemCount} Frames Selected
          </p>
        </div>
      </section>

      {/* EMPTY CART */}
      {cartItems.length === 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-white/90 bg-white/75 px-7 py-14 text-center shadow-[0_6px_24px_rgba(23,43,58,0.04)] sm:px-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white bg-[#EAF2F8] text-[#426782]">
              <ShoppingBag size={30} strokeWidth={1.4} />
            </div>

            <h2 className="mt-7 font-serif text-3xl text-[#172B3A]">
              Your bag is empty
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#8295A5]">
              Your next favourite frame is waiting. Explore our collection and
              find the perfect expression of your style.
            </p>

            <Link
              to="/products"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#172B3A] px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#426782]"
            >
              Explore Collection
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-10">
          {/* LEFT: CART ITEMS */}
          <div className="space-y-5 lg:col-span-7 xl:col-span-8">
            {/* CART ITEM CARDS */}
            <div className="space-y-4">
              {cartItems.map((item) => {
                const unavailable = !item.is_available;
                const outOfStock = Number(item.stock_quantity) <= 0;
                const maxQuantity = getMaxQuantity(item);
                const lineTotal = getUnitPrice(item) * Number(item.quantity);
                const originalLineTotal =
                  (Number(item.base_price || 0) +
                    Number(item.lens_price || 0)) *
                  Number(item.quantity);

                return (
                  <article
                    key={item.id}
                    className={`flex flex-col gap-4 rounded-[1.75rem] border p-4 shadow-[0_6px_24px_rgba(23,43,58,0.04)] transition-colors sm:flex-row sm:gap-6 sm:p-5 ${
                      unavailable
                        ? "border-rose-200/80 bg-white/55"
                        : "border-white/90 bg-white/75 hover:bg-white/90"
                    }`}
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl bg-[#DCE7F0] sm:w-32">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          loading="lazy"
                          decoding="async"
                          className={`h-full w-full object-cover transition-transform duration-500 ${
                            unavailable
                              ? "grayscale opacity-50"
                              : "hover:scale-105"
                          }`}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#8295A5]">
                          <PackageCheck size={32} />
                        </div>
                      )}

                      {unavailable && (
                        <div className="absolute inset-x-0 bottom-0 bg-[#172B3A]/90 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-white">
                          {outOfStock ? "Out of Stock" : "Unavailable"}
                        </div>
                      )}
                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#426782]">
                            {item.lens_option === "blue_light"
                              ? "Blue Light Protection"
                              : item.lens_option === "zero_power"
                                ? "Zero Power"
                                : "Frame Only"}
                          </p>

                          <h2 className="mt-1 font-serif text-2xl text-[#172B3A]">
                            {item.product_name}
                          </h2>

                          <p className="mt-1 text-xs text-[#8295A5]">
                            Size: {item.size || "One Size"}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p
                            className={`font-serif text-xl font-semibold ${
                              unavailable
                                ? "text-[#8295A5] line-through"
                                : "text-[#172B3A]"
                            }`}
                          >
                            {formatPrice(lineTotal)}
                          </p>

                          {Number(item.discount_amount) > 0 && (
                            <p className="mt-1 text-xs text-[#8295A5] line-through">
                              {formatPrice(originalLineTotal)}
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-[#8295A5]">
                            {formatPrice(getUnitPrice(item))} / unit
                          </p>
                        </div>
                      </div>

                      {/* VARIANT + STOCK */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#D9E3EA] bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-[#426782]">
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{
                              backgroundColor: item.color_code || "#8295A5",
                            }}
                          />
                          {item.color_name || "Standard"}
                        </span>

                        <span className="font-mono text-[10px] text-[#8295A5]">
                          Variant #{item.product_variant}
                        </span>

                        {unavailable ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-700">
                            {item.availability_message || "Unavailable"}
                          </span>
                        ) : maxQuantity <= 3 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Only {item.stock_quantity} left
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800">
                            In Stock · Max 5 / order
                          </span>
                        )}
                      </div>

                      {/* LENS OPTION */}
                      <p className="mt-3 text-xs text-[#8295A5]">
                        Lens option:{" "}
                        <span className="font-semibold text-[#426782]">
                          {item.lens_option === "blue_light"
                            ? "Blue Light (+₹500)"
                            : item.lens_option === "zero_power"
                              ? "Zero Power"
                              : "Frame Only"}
                        </span>
                      </p>

                      {/* ITEM ERROR */}
                      {itemErrors[item.id] && (
                        <div
                          role="alert"
                          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                        >
                          {itemErrors[item.id]}
                        </div>
                      )}

                      {/* ITEM CONTROLS */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#D9E3EA]/70 pt-4">
                        {/* QUANTITY */}
                        <div
                          className={`flex items-center rounded-full border border-[#D9E3EA] bg-white/80 ${
                            unavailable ? "pointer-events-none opacity-45" : ""
                          }`}
                        >
                          <button
                            type="button"
                            disabled={
                              unavailable ||
                              item.quantity <= 1 ||
                              processingItem === item.id
                            }
                            onClick={() =>
                              handleQuantityChange(
                                item,
                                Number(item.quantity) - 1,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center text-[#426782] transition-colors hover:text-[#172B3A] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>

                          <span className="min-w-8 text-center text-xs font-bold text-[#172B3A]">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={
                              unavailable ||
                              item.quantity >= maxQuantity ||
                              processingItem === item.id
                            }
                            onClick={() =>
                              handleQuantityChange(
                                item,
                                Number(item.quantity) + 1,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center text-[#426782] transition-colors hover:text-[#172B3A] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* REMOVE */}
                        <button
                          type="button"
                          disabled={processingItem === item.id}
                          onClick={() => confirmRemoveItem(item)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                            unavailable
                              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border-[#D9E3EA] bg-white/80 text-[#8295A5] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <aside className="lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4">
            <div className="rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_12px_36px_rgba(23,43,58,0.06)] sm:p-7">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#426782]">
                  Order Summary
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#172B3A]">
                  Total Breakdown
                </h2>
              </div>

              {/* PRICE BREAKDOWN */}
              <div className="space-y-3 border-b border-[#D9E3EA]/80 pb-5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#8295A5]">
                    Bag Subtotal ({totalItemCount} items)
                  </span>
                  <span className="font-semibold text-[#172B3A]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {catalogSavings > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-emerald-800">
                      SpeQ Frame Savings
                    </span>
                    <span className="font-semibold text-emerald-800">
                      −{formatPrice(catalogSavings)}
                    </span>
                  </div>
                )}
              </div>

              {/* GRAND TOTAL */}
              <div className="flex items-end justify-between gap-3 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#426782]">
                    Grand Total
                  </p>
                  <p className="mt-1 text-[10px] text-[#8295A5]">
                    Inclusive of all taxes
                  </p>
                </div>

                <p className="font-serif text-3xl font-bold text-[#172B3A]">
                  {formatPrice(payableTotal)}
                </p>
              </div>

              {/* SAVINGS */}
              {catalogSavings > 0 && (
                <div className="mb-5 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800">
                  <Sparkles size={14} />
                  You are saving {formatPrice(catalogSavings)} on this order
                </div>
              )}

              {/* CHECKOUT RESTRICTION */}
              {!canCheckout && (
                <div
                  role="alert"
                  className="mb-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3"
                >
                  <AlertTriangle size={17} className="shrink-0 text-rose-700" />

                  <div>
                    <p className="text-xs font-bold text-rose-800">
                      Checkout Restricted
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-rose-700">
                      {getCheckoutRestriction()}
                    </p>
                  </div>
                </div>
              )}

              {/* CHECKOUT BUTTON */}
              <button
                type="button"
                disabled={!canCheckout}
                onClick={() => setCheckoutModalOpen(true)}
                className={`flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-[11px] font-bold uppercase tracking-[0.17em] transition-colors ${
                  canCheckout
                    ? "bg-[#172B3A] text-white hover:bg-[#426782]"
                    : "cursor-not-allowed bg-[#B9C8D5] text-white"
                }`}
              >
                {canCheckout ? (
                  <>
                    <Lock size={15} />
                    Proceed to Checkout
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    Checkout Unavailable
                  </>
                )}
              </button>

              {/* TRUST STRIP */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#EAF2F8]/70 p-2.5 text-center">
                  <ShieldCheck size={17} className="mx-auto text-[#426782]" />
                  <p className="mt-2 text-[9px] font-bold text-[#426782]">
                    1-Yr Warranty
                  </p>
                </div>

                <div className="rounded-xl bg-[#EAF2F8]/70 p-2.5 text-center">
                  <RefreshCw size={17} className="mx-auto text-[#426782]" />
                  <p className="mt-2 text-[9px] font-bold text-[#426782]">
                    14-Day Return
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      )}

      {/* CHECKOUT CONFIRMATION MODAL */}
      {checkoutModalOpen && canCheckout && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#172B3A]/60 p-4 backdrop-blur-md"
          onClick={() => setCheckoutModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            className="w-full max-w-md rounded-3xl border border-white/80 bg-[#EAF2F8]/95 p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#426782]">
                  SpeQ Checkout
                </p>

                <h2
                  id="checkout-modal-title"
                  className="mt-2 font-serif text-3xl text-[#172B3A]"
                >
                  Review Your Bag
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="rounded-full p-2 text-[#426782] hover:bg-white"
                aria-label="Close checkout modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-7 space-y-4 border-y border-[#D9E3EA] py-5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8295A5]">Subtotal</span>
                <span className="font-semibold text-[#172B3A]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="font-bold text-[#172B3A]">Payable Total</span>
                <span className="font-serif text-2xl font-bold text-[#172B3A]">
                  {formatPrice(payableTotal)}
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs leading-6 text-[#8295A5]">
              Your cart is ready. Continue to the next stage to provide delivery
              details and payment information.
            </p>

            <button
              type="button"
              onClick={() => {
                setCheckoutModalOpen(false);
                showToast(
                  "Cart reviewed. Address and payment integration is not connected yet.",
                  "error",
                );
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#172B3A] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.17em] text-white transition-colors hover:bg-[#426782]"
            >
              Continue to Address & Payment
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* REMOVE ITEM CONFIRMATION MODAL */}
      {removeModalOpen && itemToRemove && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#172B3A]/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!processingItem) {
              setRemoveModalOpen(false);
              setItemToRemove(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-modal-title"
            className="w-full max-w-sm rounded-3xl border border-white/80 bg-[#EAF2F8] p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <Trash2 size={23} />
            </div>

            <h2
              id="remove-modal-title"
              className="mt-5 text-center font-serif text-2xl text-[#172B3A]"
            >
              Remove this frame?
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-[#8295A5]">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-[#172B3A]">
                {itemToRemove.product_name}
              </span>{" "}
              from your shopping bag?
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={processingItem === itemToRemove.id}
                onClick={() => {
                  setRemoveModalOpen(false);
                  setItemToRemove(null);
                }}
                className="flex-1 rounded-full border border-[#D9E3EA] bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#426782] hover:bg-[#F5F8FA] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={processingItem === itemToRemove.id}
                onClick={handleConfirmRemove}
                className="flex-1 rounded-full bg-rose-700 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {processingItem === itemToRemove.id
                  ? "Removing..."
                  : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[100] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 text-xs font-semibold text-white shadow-xl ${
            toast.type === "error" ? "bg-rose-700" : "bg-[#172B3A]"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={16} />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C5AE87] text-[#172B3A]">
              <Check size={14} />
            </span>
          )}

          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
};

export default Cart;
