import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { ToastProvider } from "@/context/ToastContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ProductsProvider>
        <OrdersProvider>
          <CartProvider>
            <WishlistProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </WishlistProvider>
          </CartProvider>
        </OrdersProvider>
      </ProductsProvider>
    </AuthProvider>
  </StrictMode>
);
