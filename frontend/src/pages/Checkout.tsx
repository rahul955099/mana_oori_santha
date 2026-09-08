import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck, Wallet, CheckCircle2, MapPinCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { useOrders } from "@/context/OrdersContext";
import { useToast } from "@/context/ToastContext";
import { useAddresses } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency } from "@/utils/format";
import { DeliveryLocationBar } from "@/components/location/DeliveryLocationBar";
import { CouponBox } from "@/components/checkout/CouponBox";
import type { Address } from "@/types";

const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_THRESHOLD = 500;

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

function addressToForm(address: Address, fallbackEmail: string) {
  return {
    fullName: address.fullName,
    mobile: address.phone,
    email: fallbackEmail,
    address: `${address.houseNo}, ${address.street}`,
    village: address.city,
    district: "",
    state: address.state,
    pincode: address.pincode,
  };
}

export default function Checkout() {
  const { items, subtotal, clearCart, couponCode } = useCart();
  const { getProductById } = useProducts();
  const { placeOrder } = useOrders();
  const { showToast } = useToast();
  const { addresses, defaultAddress } = useAddresses();
  const { user } = useAuth();
  const { notifyUser } = useNotifications();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [discount, setDiscount] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [form, setForm] = useState(() =>
    defaultAddress
      ? addressToForm(defaultAddress, user?.email ?? "")
      : {
          fullName: user?.name ?? "",
          mobile: user?.mobile ?? "",
          email: user?.email ?? "",
          address: "",
          village: "",
          district: "",
          state: "",
          pincode: "",
        },
  );

  function useSavedAddress(address: Address) {
    setSelectedAddressId(address.id);
    setForm(addressToForm(address, user?.email ?? form.email));
  }

  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_CHARGE;
  const total = Math.max(0, subtotal - discount) + deliveryCharge;

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSelectedAddressId(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const orderItems = items
      .map((item) => {
        const product = getProductById(item.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          unit: product.unit,
          quantity: item.quantity,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    const order = placeOrder({
      items: orderItems,
      total,
      discount: discount > 0 ? discount : undefined,
      couponCode: discount > 0 ? (couponCode ?? undefined) : undefined,
      paymentMethod,
      userId: user?.userId,
      customer: form,
    });

    if (user) {
      notifyUser(user.userId, {
        type: "order-placed",
        title: `Order ${order.id} placed`,
        message: `Your order for ${orderItems.length} item(s) totalling ${formatCurrency(total)} has been placed successfully.`,
        orderId: order.id,
      });
    }

    clearCart();
    showToast(`Order ${order.id} placed successfully!`);
    navigate("/my-orders");
  }

  if (items.length === 0) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add some products to your cart before proceeding to checkout."
          action={
            <Link to="/products" className={buttonClasses("primary", "md", "mt-2")}>
              Browse Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="mb-8 text-3xl font-extrabold text-stone-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DeliveryLocationBar />

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-stone-900">Customer Information</h2>
            {addresses.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => useSavedAddress(a)}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                      selectedAddressId === a.id
                        ? "border-primary-500 bg-primary-50 text-primary-800"
                        : "border-stone-200 text-stone-500 hover:border-primary-300"
                    }`}
                  >
                    {selectedAddressId === a.id && <MapPinCheck size={13} />}
                    {a.type} {a.isDefault && "· Default"}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input required placeholder="Full Name" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={inputClass} />
              <input required type="tel" pattern="[0-9]{10}" placeholder="Mobile Number" value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} className={inputClass} />
              <input required type="email" placeholder="Email Address" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={`${inputClass} sm:col-span-2`} />
              <input required placeholder="Address (House No, Street)" value={form.address} onChange={(e) => updateField("address", e.target.value)} className={`${inputClass} sm:col-span-2`} />
              <input required placeholder="Village / Town" value={form.village} onChange={(e) => updateField("village", e.target.value)} className={inputClass} />
              <input required placeholder="District" value={form.district} onChange={(e) => updateField("district", e.target.value)} className={inputClass} />
              <input required placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} className={inputClass} />
              <input required pattern="[0-9]{6}" placeholder="Pincode" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-stone-900">Payment Method</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                  paymentMethod === "cod" ? "border-primary-500 bg-primary-50" : "border-stone-200"
                }`}
              >
                <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="h-4 w-4 accent-primary-600" />
                <Truck size={20} className="text-primary-600" />
                <div>
                  <p className="text-sm font-bold text-stone-800">Cash on Delivery</p>
                  <p className="text-xs text-stone-500">Pay when your order arrives</p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                  paymentMethod === "online" ? "border-primary-500 bg-primary-50" : "border-stone-200"
                }`}
              >
                <input type="radio" name="payment" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="h-4 w-4 accent-primary-600" />
                <Wallet size={20} className="text-primary-600" />
                <div>
                  <p className="text-sm font-bold text-stone-800">Online Payment</p>
                  <p className="text-xs text-stone-500">UPI / Card / Netbanking (Demo)</p>
                </div>
              </label>
            </div>
            {paymentMethod === "online" && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2.5 text-xs text-accent-700">
                <CheckCircle2 size={14} /> This is a demo checkout — no real payment will be processed.
              </p>
            )}
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">Order Summary</h2>
          <div className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => {
              const product = getProductById(item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} className="flex items-center gap-3">
                  <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-800">{product.name}</p>
                    <p className="text-[11px] text-stone-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-stone-800">{formatCurrency(product.price * item.quantity)}</p>
                </div>
              );
            })}
          </div>
          <div className="mb-4">
            <CouponBox onDiscountChange={setDiscount} />
          </div>

          <div className="space-y-2 border-t border-stone-200 pt-4 text-sm">
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
              <span className="font-semibold text-stone-900">
                {deliveryCharge === 0 ? "FREE" : formatCurrency(deliveryCharge)}
              </span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-extrabold text-stone-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <button type="submit" className={buttonClasses("primary", "lg", "mt-6 w-full")}>
            Place Order
          </button>
        </div>
      </form>
    </div>
  );
}
