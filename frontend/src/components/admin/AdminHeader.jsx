
import React from "react";
import { Search, Bell, ChevronDown } from "lucide-react";

const AdminHeader = () => {
  return (
    <header className="flex h-20 items-center justify-between border-b border-[#EAE7E0] bg-[#FCFBF9] px-8">

      {/* Global Search */}
      <div className="relative w-96">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="w-full rounded-lg border border-[#EAE7E0] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#1B3B2B]"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-6">

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative text-gray-500 transition hover:text-[#1B3B2B]"
        >
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#B99A5B]" />
        </button>

        {/* Admin Profile */}
        <button
          type="button"
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8E1D2] font-semibold text-[#1B3B2B]">
            SA
          </div>

          <div className="text-left">
            <p className="text-sm font-medium text-[#252720]">
              SPEQ Admin
            </p>

            <p className="text-xs text-gray-400">
              Store Administrator
            </p>
          </div>

          <ChevronDown size={16} className="text-gray-400" />
        </button>

      </div>
    </header>
  );
};

export default AdminHeader;
