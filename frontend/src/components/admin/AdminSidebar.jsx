import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  CalendarDays,
  ShoppingBag,
  TicketPercent,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  MessageSquareText,
} from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/api";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCatalogOpen, setIsCatalogOpen] = useState(
    () =>
      location.pathname.startsWith("/admin/categories") ||
      location.pathname.startsWith("/admin/collections") ||
      location.pathname.startsWith("/admin/occasions"),
  );

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Automatically expand Catalog when visiting one of its pages.
  useEffect(() => {
    const isCatalogPage =
      location.pathname.startsWith("/admin/categories") ||
      location.pathname.startsWith("/admin/collections") ||
      location.pathname.startsWith("/admin/occasions");

    if (isCatalogPage) {
      setIsCatalogOpen(true);
    }
  }, [location.pathname]);

  // Reusable navigation link styling.
  const getLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-[#D6BD83] text-[#171914] shadow-sm"
        : "text-gray-400 hover:bg-white/10 hover:text-white"
    }`;

  // Section heading.
  const SectionLabel = ({ children }) => (
    <p className="px-4 mb-2 mt-6 text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
      {children}
    </p>
  );

  // Logout with access-token refresh handling.
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    const accessToken =
      localStorage.getItem("admin_access") ||
      sessionStorage.getItem("admin_access");

    const refreshToken =
      localStorage.getItem("admin_refresh") ||
      sessionStorage.getItem("admin_refresh");

    try {
      // First attempt: logout using the current access token.
      let logoutResponse = await fetch(`${API_BASE}/auth/admin/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && {
            Authorization: `Bearer ${accessToken}`,
          }),
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      // If access token expired, refresh it and retry logout.
      if (logoutResponse.status === 401 && refreshToken) {
        const refreshResponse = await fetch(
          `${API_BASE}/auth/admin/token/refresh/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              refresh: refreshToken,
            }),
          },
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.access;

          if (newAccessToken) {
            localStorage.setItem("admin_access", newAccessToken);

            logoutResponse = await fetch(`${API_BASE}/auth/admin/logout/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${newAccessToken}`,
              },
              body: JSON.stringify({
                refresh: refreshToken,
              }),
            });
          }
        }
      }
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      // Clear tokens from both storage locations.
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");

      sessionStorage.removeItem("admin_access");
      sessionStorage.removeItem("admin_refresh");

      navigate("/admin/login", { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/5 bg-[#171914] text-white">
      {/* BRAND */}
      <div className="flex h-24 items-center border-b border-white/10 px-7">
        <div>
          <h1 className="text-3xl font-semibold tracking-[0.25em] text-[#D6BD83]">
            SPEQ
          </h1>
          <p className="mt-1 text-[9px] tracking-[0.25em] text-gray-500">
            ADMINISTRATION
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {/* OVERVIEW */}
        <SectionLabel>Overview</SectionLabel>

        <NavLink to="/admin/dashboard" className={getLinkClass} end>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* PRODUCT MANAGEMENT */}
        <SectionLabel>Product Management</SectionLabel>

        <NavLink to="/admin/products" end className={getLinkClass}>
          <Package size={18} />
          <span>Products</span>
        </NavLink>

        {/* CATALOG MANAGEMENT */}
        <SectionLabel>Catalog Management</SectionLabel>

        <button
          type="button"
          onClick={() => setIsCatalogOpen((previous) => !previous)}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            location.pathname.startsWith("/admin/categories") ||
            location.pathname.startsWith("/admin/collections") ||
            location.pathname.startsWith("/admin/occasions")
              ? "text-[#D6BD83]"
              : "text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-3">
            <Tags size={18} />
            Catalog
          </span>

          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isCatalogOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isCatalogOpen && (
          <div className="ml-5 mt-1 space-y-1 border-l border-white/10 pl-3">
            <NavLink to="/admin/categories" className={getLinkClass}>
              <Tags size={17} />
              <span>Categories</span>
            </NavLink>

            <NavLink to="/admin/collections" className={getLinkClass}>
              <Layers size={17} />
              <span>Collections</span>
            </NavLink>

            <NavLink to="/admin/occasions" className={getLinkClass}>
              <CalendarDays size={17} />
              <span>Occasions</span>
            </NavLink>
          </div>
        )}

        {/* SALES */}
        <SectionLabel>Sales</SectionLabel>

        <NavLink to="/admin/orders" className={getLinkClass}>
          <ShoppingBag size={18} />
          <span>Order Management</span>
        </NavLink>

        <NavLink to="/admin/coupons" className={getLinkClass}>
          <TicketPercent size={18} />
          <span>Coupon Management</span>
        </NavLink>

        {/* CUSTOMER MANAGEMENT */}
        <SectionLabel>Customer Management</SectionLabel>

        <NavLink to="/admin/users" className={getLinkClass}>
          <Users size={18} />
          <span>Customers</span>
        </NavLink>

        <NavLink to="/admin/reviews" className={getLinkClass}>
          <MessageSquareText size={18} />
          <span>Review Management</span>
        </NavLink>

        {/* SYSTEM */}
        <SectionLabel>System</SectionLabel>

        <NavLink to="/admin/settings" className={getLinkClass}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* ADMIN PROFILE AND LOGOUT */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D6BD83] text-sm font-semibold text-[#171914]">
            SA
          </div>

          <div>
            <p className="text-sm font-medium text-white">Super Admin</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={18} />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
