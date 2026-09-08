import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Trash } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { CouponBox } from "@/components/checkout/CouponBox";
import { formatCurrency } from "@/utils/format";

const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_THRESHOLD = 500;

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, couponCode } = useCart();
  const { getProductById } = useProducts();
  const navigate = useNavigate();
  const [discount, setDiscount] = useState(0);

  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_CHARGE;
  const total = Math.max(0, subtotal - discount) + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Explore our products and find something you love."
          action={
            <Link to="/products" className={buttonClasses("primary", "md", "mt-2")}>
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-stone-900">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-xs font-bold text-stone-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <Trash size={14} /> Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const product = getProductById(item.productId);
            if (!product) return null;
            return (
              <div
                key={item.productId}
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <Link to={`/products/${product.slug}`} className="shrink-0">
                  <img src={product.image} alt={product.name} className="h-24 w-24 rounded-xl object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product.slug}`} className="font-bold text-stone-800 hover:text-primary-700">
                    {product.name}
                  </Link>
                  <p className="text-xs text-stone-400">{product.unit}</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">{formatCurrency(product.price)}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="flex items-center rounded-full border border-stone-300">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-stone-500 hover:text-primary-700"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-stone-500 hover:text-primary-700"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <div className="hidden w-24 text-right font-bold text-stone-900 sm:block">
                  {formatCurrency(product.price * item.quantity)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-fit space-y-4">
          <CouponBox onDiscountChange={setDiscount} />

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-stone-900">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary-700">
                  <span>Coupon Discount {couponCode ? `(${couponCode})` : ""}</span>
                  <span className="font-semibold">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span className={`font-semibold ${deliveryCharge === 0 ? "text-primary-600" : "text-stone-900"}`}>
                  {deliveryCharge === 0 ? "FREE" : formatCurrency(deliveryCharge)}
                </span>
              </div>
              {deliveryCharge > 0 && (
                <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">
                  Add {formatCurrency(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery!
                </p>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-extrabold text-stone-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className={buttonClasses("primary", "lg", "mt-6 w-full")}
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>
            <Link to="/products" className="mt-3 block text-center text-sm font-semibold text-primary-700 hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
