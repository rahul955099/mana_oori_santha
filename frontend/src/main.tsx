import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CategoriesProvider } from "@/context/CategoriesContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { SellersProvider } from "@/context/SellersContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { ToastProvider } from "@/context/ToastContext";
import { LocationProvider } from "@/context/LocationContext";
import { AddressProvider } from "@/context/AddressContext";
import { SupportProvider } from "@/context/SupportContext";
import { ReviewsProvider } from "@/context/ReviewsContext";
import { CouponsProvider } from "@/context/CouponsContext";
import { NotificationProvider } from "@/context/NotificationContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <CategoriesProvider>
        <ProductsProvider>
          <SellersProvider>
            <OrdersProvider>
              <CartProvider>
                <WishlistProvider>
                  <ToastProvider>
                    <LocationProvider>
                      <AddressProvider>
                        <SupportProvider>
                          <ReviewsProvider>
                            <CouponsProvider>
                              <NotificationProvider>
                                <App />
                              </NotificationProvider>
                            </CouponsProvider>
                          </ReviewsProvider>
                        </SupportProvider>
                      </AddressProvider>
                    </LocationProvider>
                  </ToastProvider>
                </WishlistProvider>
              </CartProvider>
            </OrdersProvider>
          </SellersProvider>
        </ProductsProvider>
      </CategoriesProvider>
    </AuthProvider>
  </StrictMode>
);
