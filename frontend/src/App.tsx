import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loading } from "@/components/common/Loading";
import { MainLayout } from "@/layouts/MainLayout";
import { SellerLayout } from "@/layouts/SellerLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RequireAuth } from "@/components/RequireAuth";

import Home from "@/pages/Home";

// Every other page is loaded on demand, so visitors only download what they open.
const Products = lazy(() => import("@/pages/Products"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails"));
const Category = lazy(() => import("@/pages/Category"));
const Sellers = lazy(() => import("@/pages/Sellers"));
const SellerDetails = lazy(() => import("@/pages/SellerDetails"));
const Cart = lazy(() => import("@/pages/Cart"));
const Wishlist = lazy(() => import("@/pages/Wishlist"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const Profile = lazy(() => import("@/pages/Profile"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Invoice = lazy(() => import("@/pages/Invoice"));
const MySupport = lazy(() => import("@/pages/MySupport"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));

const SellerDashboard = lazy(() => import("@/pages/seller/Dashboard"));
const SellerMyProducts = lazy(() => import("@/pages/seller/MyProducts"));
const SellerAddProduct = lazy(() => import("@/pages/seller/AddProduct"));
const SellerEditProduct = lazy(() => import("@/pages/seller/EditProduct"));
const SellerOrders = lazy(() => import("@/pages/seller/Orders"));
const SellerEarnings = lazy(() => import("@/pages/seller/Earnings"));
const SellerProfile = lazy(() => import("@/pages/seller/Profile"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminSellers = lazy(() => import("@/pages/admin/Sellers"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminCategories = lazy(() => import("@/pages/admin/Categories"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminSupport = lazy(() => import("@/pages/admin/Support"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"));
const AdminPayouts = lazy(() => import("@/pages/admin/Payouts"));

function App() {
  return (
    <BrowserRouter>
      {/* Layouts have their own fallback around the page area; this one covers standalone pages. */}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route
              path="products/:slug"
              element={
                <RequireAuth>
                  <ProductDetails />
                </RequireAuth>
              }
            />
            <Route path="category/:slug" element={<Category />} />
            <Route path="sellers" element={<Sellers />} />
            <Route path="sellers/:id" element={<SellerDetails />} />
            <Route path="cart" element={<Cart />} />
            <Route
              path="wishlist"
              element={
                <RequireAuth>
                  <Wishlist />
                </RequireAuth>
              }
            />
            <Route
              path="checkout"
              element={
                <RequireAuth>
                  <Checkout />
                </RequireAuth>
              }
            />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route
              path="my-orders"
              element={
                <RequireAuth>
                  <MyOrders />
                </RequireAuth>
              }
            />
            <Route
              path="profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="my-support"
              element={
                <RequireAuth>
                  <MySupport />
                </RequireAuth>
              }
            />
            <Route path="help" element={<HelpCenter />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
          </Route>

          <Route
            path="seller"
            element={
              <RequireAuth roles={["seller"]}>
                <SellerLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<SellerDashboard />} />
            <Route path="products" element={<SellerMyProducts />} />
            <Route path="products/add" element={<SellerAddProduct />} />
            <Route path="products/edit/:id" element={<SellerEditProduct />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="earnings" element={<SellerEarnings />} />
            <Route path="profile" element={<SellerProfile />} />
          </Route>

          <Route
            path="admin"
            element={
              <RequireAuth roles={["admin"]}>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Standalone (no header/footer) so it prints cleanly. */}
          <Route
            path="orders/:id/invoice"
            element={
              <RequireAuth>
                <Invoice />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
