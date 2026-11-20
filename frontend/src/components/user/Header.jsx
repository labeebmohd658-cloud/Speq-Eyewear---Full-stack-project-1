
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useSelector } from "react-redux";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchInput, setSearchInput] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read cart quantity from Redux.
  const cartQuantity = useSelector(
    (state) => state.cart?.totalQuantity ?? 0
  );

  // Read wishlist items from Redux.
  const wishlistCount = useSelector((state) => {
    const wishlist = state.wishlist;

    if (Array.isArray(wishlist)) return wishlist.length;
    if (Array.isArray(wishlist?.items)) return wishlist.items.length;
    if (Array.isArray(wishlist?.products)) return wishlist.products.length;

    return wishlist?.totalQuantity ?? wishlist?.count ?? 0;
  });

  const navItems = [
    { label: "Eyeglasses", category: "eyeglasses" },
    { label: "Sunglasses", category: "sunglasses" },
    { label: "Screen Glasses", category: "screenglasses" },
  ];

  // Identify the currently selected product category.
  const currentCategory = new URLSearchParams(location.search).get("category");

  const isActiveCategory = (category) =>
    location.pathname === "/products" && currentCategory === category;

  const handleCategoryClick = (category) => {
    navigate(`/products?category=${category}`);
    setMobileMenuOpen(false);
  };

  // Handle product search.
  const handleSearch = (event) => {
    event.preventDefault();

    const search = searchInput.trim();

    if (!search) return;

    navigate(`/products?search=${encodeURIComponent(search)}`);
    setMobileMenuOpen(false);
  };

  // Clear search input and remove the search filter.
  const clearSearch = () => {
    setSearchInput("");

    if (location.pathname === "/products") {
      navigate("/products");
    }
  };

  return (
    <div className="sticky top-0 z-40">
      {/* MAIN FROSTED NAVIGATION */}
      <header className="border-b border-white/80 bg-[#EAF2F8]/90 shadow-[0_4px_24px_rgba(23,43,58,0.04)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">

          {/* MOBILE MENU + BRAND */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="rounded-full p-2 text-[#172B3A] transition-colors hover:bg-white/70 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            <Link
              to="/"
              className="group flex select-none flex-col leading-none"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center gap-1.5 font-serif text-[30px] font-bold tracking-[0.17em] text-[#172B3A]">
                SPEQ
                <span className="h-1.5 w-1.5 rounded-full bg-[#C5AE87] transition-transform duration-300 group-hover:scale-125" />
              </span>

              <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.34em] text-[#426782]">
                Atelier Optical
              </span>
            </Link>
          </div>

          {/* DESKTOP CATEGORY NAVIGATION */}
          <nav className="hidden items-center gap-7 md:flex lg:gap-10">
            {navItems.map((item) => {
              const active = isActiveCategory(item.category);

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => handleCategoryClick(item.category)}
                  className={`group relative whitespace-nowrap py-3 text-[14px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 lg:text-[15px] ${
                    active
                      ? "text-[#172B3A]"
                      : "text-[#426782] hover:text-[#172B3A]"
                  }`}
                >
                  {item.label}

                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[1.5px] origin-left bg-[#172B3A] transition-transform duration-300 ${
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />

                  {active && (
                    <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C5AE87]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTIONS */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* DESKTOP SEARCH */}
            <form
              onSubmit={handleSearch}
              className="hidden w-64 items-center gap-2 rounded-full border border-white bg-white/75 px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(23,43,58,0.03)] transition-colors duration-200 hover:bg-white focus-within:border-[#426782]/30 focus-within:bg-white xl:flex"
            >
              <Search size={16} className="shrink-0 text-[#8295A5]" />

              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search frames..."
                aria-label="Search frames"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#172B3A] outline-none placeholder:text-[#8295A5]"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="text-[#8295A5] transition-colors hover:text-[#172B3A]"
                >
                  <X size={14} />
                </button>
              )}

              <button
                type="submit"
                disabled={!searchInput.trim()}
                className="text-xs font-semibold text-[#172B3A] transition-colors hover:text-[#426782] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Search
              </button>
            </form>

            {/* WISHLIST */}
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} products`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-[#172B3A] transition-colors hover:border-white hover:bg-white/90"
            >
              <Heart size={20} strokeWidth={1.6} />

              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C5AE87] px-1 text-[9px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* SHOPPING BAG */}
            <Link
              to="/cart"
              aria-label={`Shopping bag, ${cartQuantity} items`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-[#172B3A] transition-colors hover:border-white hover:bg-white/90"
            >
              <ShoppingBag size={20} strokeWidth={1.6} />

              {cartQuantity > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#172B3A] px-1 text-[9px] font-bold text-white">
                  {cartQuantity > 99 ? "99+" : cartQuantity}
                </span>
              )}
            </Link>

            {/* ACCOUNT */}
            <Link
              to="/profile"
              aria-label="My account"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-white bg-white/60 text-[#172B3A] transition-colors hover:bg-[#172B3A] hover:text-white sm:flex"
            >
              <UserRound size={19} strokeWidth={1.6} />
            </Link>
          </div>
        </div>

        {/* MOBILE DROPDOWN */}
        {mobileMenuOpen && (
          <div className="space-y-5 border-t border-white/80 bg-[#EAF2F8] px-5 py-6 md:hidden">

            {/* MOBILE SEARCH */}
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-3 rounded-full border border-white bg-white/85 px-4 py-3"
            >
              <Search size={17} className="shrink-0 text-[#8295A5]" />

              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search frames..."
                aria-label="Search frames"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#172B3A] outline-none placeholder:text-[#8295A5]"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="text-[#8295A5]"
                >
                  <X size={15} />
                </button>
              )}

              <button
                type="submit"
                disabled={!searchInput.trim()}
                className="text-xs font-semibold text-[#172B3A] disabled:opacity-40"
              >
                Search
              </button>
            </form>

            {/* MOBILE CATEGORY LINKS */}
            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => handleCategoryClick(item.category)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold uppercase tracking-[0.16em] text-[#172B3A] transition-colors hover:bg-white/75"
                >
                  {item.label}
                  <ArrowUpRight size={16} className="text-[#426782]" />
                </button>
              ))}
            </nav>

            <div className="border-t border-[#D9E3EA]" />

            {/* MOBILE ACCOUNT SHORTCUTS */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-[#426782] transition-colors hover:bg-white/75"
              >
                Wishlist ({wishlistCount})
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-[#426782] transition-colors hover:bg-white/75"
              >
                My Account
              </Link>

              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-[#426782] transition-colors hover:bg-white/75"
              >
                Bag ({cartQuantity})
              </Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default Header;
