
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
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-full rounded-2xl border border-[#D8E3EB] bg-white p-5 shadow-[0_4px_20px_rgba(23,43,58,0.04)]">

      {/* Sidebar Heading */}
      <div className="border-b border-[#E5EDF3] px-3 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#426782]">
          Account Menu
        </p>

        <h2 className="mt-2 text-base font-semibold text-[#172B3A]">
          Manage Account
        </h2>
      </div>

      {/* Navigation Items */}
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
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-colors duration-200 ${
                active
                  ? "bg-[#172B3A] font-semibold text-white"
                  : "text-[#526879] hover:bg-[#EAF2F8] hover:text-[#172B3A]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  size={18}
                  strokeWidth={1.7}
                  className={`transition-colors duration-200 ${
                    active
                      ? "text-white"
                      : "text-[#8295A5] group-hover:text-[#426782]"
                  }`}
                />

                {item.label}
              </span>

              {active && (
                <ChevronRight size={16} className="text-white/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-6 border-t border-[#E5EDF3] pt-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} strokeWidth={1.7} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default ProfileSidebar;
