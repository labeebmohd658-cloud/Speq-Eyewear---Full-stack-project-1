
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Customer pages
import Landing from "./pages/Landing";
import Signup from "./pages/userAuth/Signup";
import Login from "./pages/userAuth/Login";
import ResetPassword from "./pages/userAuth/ResetPassword";
import Profile from "./pages/Profile";
import AddressBook from "./pages/AddressBook";

// Customer product pages
import ProductListing from "./pages/product/user_side/ProductListing";
import ProductDetail from "./pages/product/user_side/ProductDetail";

//Customer Cart
import Cart from "./pages/cart/Cart";

//Customer Wishlist
import Wishlist from "./pages/wishlist/Wishlist";

// Layouts
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

// Route protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminGuestRoute from "./components/admin/AdminGuestRoute";

// Admin authentication
import AdminLogin from "./pages/adminAuth/AdminLogin";
import AdminForgotPassword from "./pages/adminAuth/AdminForgotPassword";
import AdminVerifyOTP from "./pages/adminAuth/AdminVerifyOTP";
import AdminResetPassword from "./pages/adminAuth/AdminResetPassword";

// Admin pages
import AdminUserManagement from "./pages/adminAuth/AdminUserManagement";
import AdminProductList from "./pages/product/admin_side/AdminProductList";
import AdminProductAdd from "./pages/product/admin_side/AdminProductAdd";
import AdminProductEdit from "./pages/product/admin_side/AdminProductEdit";
import AdminReviews from "./pages/product/admin_side/AdminReviews";
import CatalogManagement from "./pages/catlog/CatalogManagement";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Landing page - independent layout */}
        <Route path="/" element={<Landing />} />

        {/* Guest-only authentication */}
        <Route element={<GuestRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Password recovery - independent layout */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Customer layout - shared Header and Footer */}
        <Route element={<UserLayout />}>
          <Route path="/products" element={<ProductListing />} />
          <Route path="/products/:id" element={<ProductDetail />} />

          {/* Protected customer pages */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/addresses" element={<AddressBook />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
          </Route>
        </Route>

        {/* Admin authentication */}
        <Route element={<AdminGuestRoute />}>
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        <Route
          path="/admin/forgot-password"
          element={<AdminForgotPassword />}
        />

        <Route path="/admin/verify-otp" element={<AdminVerifyOTP />} />
        <Route path="/admin/reset-password" element={<AdminResetPassword />} />

        {/* Admin dashboard */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="reviews" element={<AdminReviews />} />

            <Route path="products" element={<AdminProductList />} />
            <Route path="products/add" element={<AdminProductAdd />} />
            <Route path="products/:id/edit" element={<AdminProductEdit />} />

            <Route path="categories" element={<CatalogManagement />} />
            <Route path="collections" element={<CatalogManagement />} />
            <Route path="occasions" element={<CatalogManagement />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;
