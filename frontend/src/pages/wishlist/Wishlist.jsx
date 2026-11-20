
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Heart, Trash2, ArrowRight, ShoppingBag } from "lucide-react";

import {
  fetchWishlist,
  deleteWishlistItem,
} from "../../redux/features/cart/wishlist/wishlistSlice";

const Wishlist = () => {
  const dispatch = useDispatch();

  const { items, totalItems, loading, error } = useSelector(
    (state) => state.wishlist
  );

  // Fetch the customer's wishlist when the page loads.
  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  // Remove a product using its wishlist item ID.
  const handleRemove = async (itemId) => {
    try {
      await dispatch(deleteWishlistItem(itemId)).unwrap();
    } catch (error) {
      console.error("Unable to remove wishlist item:", error);
    }
  };

  // Format product prices in Indian Rupees.
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  return (
    <main className="min-h-screen bg-[#EAF2F8] px-4 py-12 sm:px-8 lg:px-16">

      {/* Page heading */}
      <div className="mx-auto mb-10 max-w-7xl">
        <div className="mb-3 flex items-center gap-2 text-sm text-[#8295A5]">
          <Link to="/products" className="transition hover:text-[#172B3A]">
            Shop
          </Link>
          <span>/</span>
          <span className="text-[#172B3A]">Wishlist</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#426782]">
              Your personal collection
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#172B3A] sm:text-4xl">
              My Wishlist
            </h1>

            <p className="mt-2 text-sm text-[#8295A5]">
              Keep the frames you love close.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#D9E3EA] bg-white px-4 py-2 text-sm text-[#263B4B]">
            <Heart size={16} />
            <span>{totalItems} saved items</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">

        {/* Loading state */}
        {loading && items.length === 0 && (
          <div className="py-24 text-center text-[#8295A5]">
            Loading your wishlist...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-xl border border-rose-200 bg-white p-8 text-center">
            <p className="text-rose-600">{error}</p>

            <button
              onClick={() => dispatch(fetchWishlist())}
              className="mt-4 text-sm font-semibold text-[#426782] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty wishlist */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-[#D9E3EA] bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF2F8]">
              <Heart size={32} className="text-[#426782]" />
            </div>

            <h2 className="text-2xl font-semibold text-[#172B3A]">
              Your wishlist is empty
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8295A5]">
              Discover frames that match your style and save your favourites
              here for later.
            </p>

            <Link
              to="/products"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#172B3A] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#263B4B]"
            >
              Explore Collection
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Wishlist products */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-[#D9E3EA] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Product image */}
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#F2F6F9]">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <ShoppingBag size={40} className="text-[#B9C8D5]" />
                  )}

                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={loading}
                    aria-label="Remove from wishlist"
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#172B3A] shadow-sm transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                  </button>

                  {!item.is_available && (
                    <span className="absolute bottom-4 left-4 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">
                      Currently unavailable
                    </span>
                  )}
                </div>

                {/* Product details */}
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-[#8295A5]">
                    {item.category || "Eyewear"}
                  </p>

                  <h3 className="mt-2 line-clamp-1 text-lg font-semibold text-[#172B3A]">
                    {item.product_name}
                  </h3>

                  {item.frame_shape && (
                    <p className="mt-1 text-sm capitalize text-[#8295A5]">
                      {item.frame_shape} frame
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-lg font-semibold text-[#172B3A]">
                      {formatPrice(item.selling_price)}
                    </span>

                    {Number(item.base_price) > Number(item.selling_price) && (
                      <span className="text-sm text-[#8295A5] line-through">
                        {formatPrice(item.base_price)}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/products/${item.product}`}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-[#172B3A] px-5 py-3 text-sm font-semibold text-[#172B3A] transition hover:bg-[#172B3A] hover:text-white"
                  >
                    View Details
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Wishlist;
