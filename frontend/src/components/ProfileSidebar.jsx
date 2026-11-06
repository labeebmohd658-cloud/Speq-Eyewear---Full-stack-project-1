
import React from "react";
import { useNavigate } from "react-router-dom";

import {
  UserRound,
  Package,
  MapPin,
  Gift,
  Wallet,
  LogOut,
  ChevronRight,
} from "lucide-react";

const ProfileSidebar = ({ activeItem = "Personal Information" }) => {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Personal Information", icon: UserRound },
    { label: "My Orders", icon: Package },
    { label: "Address Book", icon: MapPin },
    { label: "Coupons & Referrals", icon: Gift },
    { label: "Wallet", icon: Wallet },
  ];

  // Navigate to the selected account page.
  const routes = {
    "Personal Information": "/profile",
    "My Orders": "/profile/orders",
    "Address Book": "/profile/addresses",
    "Coupons & Referrals": "/profile/coupons",
    Wallet: "/profile/wallet",
  };

  // Handle user logout.
  const handleLogout = () => {
    // Remove JWT tokens from localStorage.
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    // Redirect to login page.
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-full rounded-2xl border border-[#e9e7e2] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.025)]">
      <div className="border-b border-[#eeece7] px-3 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a88962]">
          Account Menu
        </p>

        <h2 className="mt-2 text-base font-semibold text-[#292d32]">
          Manage Account
        </h2>
      </div>

      <nav className="mt-5 flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.label;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (!active) {
                  navigate(routes[item.label]);
                }
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition ${
                active
                  ? "bg-black font-semibold text-white"
                  : "text-[#686868] hover:bg-[#f8f7f4] hover:text-[#292d32]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.7} />
                {item.label}
              </span>

              {active && <ChevronRight size={16} />}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-[#eeece7] pt-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={18} strokeWidth={1.7} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default ProfileSidebar;
