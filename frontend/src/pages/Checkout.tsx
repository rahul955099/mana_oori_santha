import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck, Wallet, MapPinCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { useOrders, type ShippingDetails } from "@/context/OrdersContext";
import { useToast } from "@/context/ToastContext";
import { useAddresses } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency } from "@/utils/format";
import { DeliveryLocationBar } from "@/components/location/DeliveryLocationBar";
import { CouponBox } from "@/components/checkout/CouponBox";
import { OrderTotals } from "@/components/checkout/OrderTotals";
import { ApiError, errorMessage } from "@/lib/api";
import type { Address } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

function addressToForm(address: Address, email: string): ShippingDetails {
  return {
    fullName: address.fullName,
    mobile: address.phone,
    email,
    address: [address.houseNo, address.street !== address.houseNo ? address.street : "", address.landmark]
      .filter(Boolean)
      .join(", "),
    village: address.city,
    district: address.district ?? "",
    state: address.state,
    pincode: address.pincode,
  };
}

export default function Checkout() {
  const { items, clearCart, couponCode, quote, quoteLoading, refreshQuote } = useCart();
  const { getProductById, reload: reloadProducts } = useProducts();
  const { placeOrder } = useOrders();
  const { showToast } = useToast();
  const { addresses, defaultAddress, addAddress } = useAddresses();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [form, setForm] = useState<ShippingDetails>(() =>
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

  function selectSavedAddress(address: Address) {
    setSelectedAddressId(address.id);
    setForm(addressToForm(address, user?.email ?? form.email));
  }

  function updateField(field: keyof ShippingDetails, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSelectedAddressId(null);
  }

  const hasProblems = !!quote?.problems.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasProblems) return;
    setSubmitting(true);
    try {
      const order = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        // Only send a coupon the server has accepted for this cart.
        couponCode: quote?.coupon?.valid ? (couponCode ?? undefined) : undefined,
        shippingAddress: form,
      });

      if (saveAddress && !selectedAddressId) {
        // "12-3, Temple Street" -> house no "12-3", street "Temple Street".
        const [houseNo, ...rest] = form.address.split(",");
        await addAddress({
          type: "home",
          fullName: form.fullName,
          phone: form.mobile,
          houseNo: houseNo.trim(),
          street: rest.join(",").trim() || houseNo.trim(),
          city: form.village,
          district: form.district,
          state: form.state,
          pincode: form.pincode,
        }).catch(() => showToast("Order placed, but the address couldn't be saved.", "info"));
      }


      clearCart();
      void reloadProducts(); // stock levels changed
      showToast(`Order ${order.id} placed successfully!`);
      navigate("/my-orders", { state: { placedOrderId: order.id } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "CART_CHANGED") {
        // Stock moved since the cart was priced: refresh so the problems show.
        await Promise.all([reloadProducts(), refreshQuote()]);
      }
      showToast(errorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
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
            <h2 className="mb-4 text-lg font-bold text-stone-900">Delivery Address</h2>
            {addresses.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectSavedAddress(a)}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                      selectedAddressId === a.id
                        ? "border-primary-500 bg-primary-50 text-primary-800"
                        : "border-stone-200 text-stone-500 hover:border-primary-300"
                    }`}
                  >
                    {selectedAddressId === a.id && <MapPinCheck size={13} />}
                    {a.type} · {a.city} {a.isDefault && "· Default"}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input required placeholder="Full Name" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={inputClass} />
              <input required type="tel" pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="Mobile Number" value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} className={inputClass} />
              <input required type="email" placeholder="Email Address" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={`${inputClass} sm:col-span-2`} />
              <input required placeholder="Address (House No, Street)" value={form.address} onChange={(e) => updateField("address", e.target.value)} className={`${inputClass} sm:col-span-2`} />
              <input required placeholder="Village / Town" value={form.village} onChange={(e) => updateField("village", e.target.value)} className={inputClass} />
              <input placeholder="District" value={form.district} onChange={(e) => updateField("district", e.target.value)} className={inputClass} />
              <input required placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} className={inputClass} />
              <input required pattern="[1-9][0-9]{5}" title="6-digit pincode" placeholder="Pincode" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} className={inputClass} />
            </div>
            {!selectedAddressId && (
              <label className="mt-4 flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-primary-600" />
                Save this address to my account
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-stone-900">Payment Method</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-primary-500 bg-primary-50 p-4">
                <input type="radio" name="payment" checked readOnly className="h-4 w-4 accent-primary-600" />
                <Truck size={20} className="text-primary-600" />
                <div>
                  <p className="text-sm font-bold text-stone-800">Cash on Delivery</p>
                  <p className="text-xs text-stone-500">Pay when your order arrives</p>
                </div>
              </label>
              <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border-2 border-stone-200 p-4 opacity-60">
                <input type="radio" name="payment" disabled className="h-4 w-4" />
                <Wallet size={20} className="text-stone-400" />
                <div>
                  <p className="text-sm font-bold text-stone-800">Online Payment</p>
                  <p className="text-xs text-stone-500">UPI / Card / Netbanking — coming soon</p>
                </div>
              </div>
            </div>
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
            <CouponBox />
          </div>

          <div className="border-t border-stone-200 pt-4">
            <OrderTotals />
          </div>
          <button
            type="submit"
            disabled={submitting || quoteLoading || !quote || hasProblems}
            className={buttonClasses("primary", "lg", "mt-6 w-full")}
          >
            {submitting ? "Placing order..." : "Place Order (Cash on Delivery)"}
          </button>
          {hasProblems && (
            <Link to="/cart" className="mt-3 block text-center text-sm font-semibold text-primary-700 hover:underline">
              Update your cart
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
