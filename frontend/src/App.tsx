import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { SellerLayout } from "@/layouts/SellerLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RequireAuth } from "@/components/RequireAuth";

import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetails from "@/pages/ProductDetails";
import Category from "@/pages/Category";
import Sellers from "@/pages/Sellers";
import SellerDetails from "@/pages/SellerDetails";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import MyOrders from "@/pages/MyOrders";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";

import SellerDashboard from "@/pages/seller/Dashboard";
import SellerMyProducts from "@/pages/seller/MyProducts";
import SellerAddProduct from "@/pages/seller/AddProduct";
import SellerEditProduct from "@/pages/seller/EditProduct";
import SellerOrders from "@/pages/seller/Orders";
import SellerEarnings from "@/pages/seller/Earnings";
import SellerProfile from "@/pages/seller/Profile";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminSellers from "@/pages/admin/Sellers";
import AdminCustomers from "@/pages/admin/Customers";
import AdminOrders from "@/pages/admin/Orders";
import AdminCategories from "@/pages/admin/Categories";
import AdminReports from "@/pages/admin/Reports";

function App() {
  return (
    <BrowserRouter>
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
          <Route path="checkout" element={<Checkout />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="my-orders" element={<MyOrders />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        <Route path="seller" element={<SellerLayout />}>
          <Route path="dashboard" element={<SellerDashboard />} />
          <Route path="products" element={<SellerMyProducts />} />
          <Route path="products/add" element={<SellerAddProduct />} />
          <Route path="products/edit/:id" element={<SellerEditProduct />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="earnings" element={<SellerEarnings />} />
          <Route path="profile" element={<SellerProfile />} />
        </Route>

        <Route path="admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="sellers" element={<AdminSellers />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
