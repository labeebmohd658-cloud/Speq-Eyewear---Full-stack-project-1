import React from "react";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Users,
  Warehouse,
  BadgePercent,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

const AdminSidebar = () => {
  // All sidebar navigation items are maintained in one place.
  const navigationItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Categories", path: "/admin/categories", icon: Tags },
    { name: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { name: "Customers", path: "/admin/users", icon: Users },
    { name: "Inventory", path: "/admin/inventory", icon: Warehouse },
    { name: "Offers", path: "/admin/offers", icon: BadgePercent },
    { name: "Appointments", path: "/admin/appointments", icon: CalendarDays },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

const navigate = useNavigate();

  // Clear admin authentication tokens and return to login.
const handleLogout = () => {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");

    sessionStorage.removeItem("admin_access");
    sessionStorage.removeItem("admin_refresh");

    navigate("/admin/login", { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col bg-[#171914] text-white">
      {/* SPEQ Brand */}
      <div className="border-b border-white/10 px-7 py-8">
        <h1 className="font-serif text-3xl tracking-widest text-[#D6BD83]">
          SPEQ
        </h1>

        <p className="mt-2 text-[10px] tracking-[0.3em] text-[#B8A477]">
          ADMIN PORTAL
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-8">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[#D6BD83] font-semibold text-[#171914]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin Profile */}
      <div className="border-t border-white/10 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D6BD83] font-semibold text-[#171914]">
              SA
            </div>

            <div>
              <p className="text-sm font-medium">SPEQ Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Logout"
            onClick={handleLogout}
            className="text-gray-400 transition hover:text-white"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
