
import React from "react";
import { Outlet } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-[#FCFBF9]">

      {/* Fixed Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">

        {/* Reusable Header */}
        <AdminHeader />

        {/* Individual Page Content */}
        <main className="p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;
