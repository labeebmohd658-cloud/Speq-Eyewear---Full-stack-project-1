
import React from "react";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound,
} from "lucide-react";

const ProfileNavbar = () => {
  return (
    <nav className="w-full bg-white border-b border-[#e9e7e2]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 h-[76px] flex items-center justify-between gap-6">

        {/* Brand */}
        <a
          href="/"
          className="text-2xl font-bold tracking-[0.18em] text-[#292d32] shrink-0"
        >
          SPEQ
        </a>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#686868]">
          {["New Arrivals", "Collections", "Optical", "Sun", "Journal"].map(
            (item) => (
              <a
                key={item}
                href="#"
                className="hover:text-[#a88962] transition-colors whitespace-nowrap"
              >
                {item}
              </a>
            )
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">

          <button
            type="button"
            aria-label="Search"
            className="text-[#292d32] hover:text-[#a88962] transition"
          >
            <Search size={20} strokeWidth={1.7} />
          </button>

          <button
            type="button"
            aria-label="Wishlist"
            className="text-[#292d32] hover:text-[#a88962] transition"
          >
            <Heart size={20} strokeWidth={1.7} />
          </button>

          <button
            type="button"
            aria-label="Shopping bag"
            className="relative text-[#292d32] hover:text-[#a88962] transition"
          >
            <ShoppingBag size={20} strokeWidth={1.7} />

            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#d8c3a5] text-[#292d32] text-[10px] flex items-center justify-center">
              3
            </span>
          </button>

          <button
            type="button"
            aria-label="Profile"
            className="w-9 h-9 rounded-full bg-[#eee8dd] border border-[#e3d5c1] flex items-center justify-center text-[#292d32] hover:border-[#a88962] transition"
          >
            <UserRound size={17} strokeWidth={1.7} />
          </button>

        </div>
      </div>
    </nav>
  );
};

export default ProfileNavbar;
