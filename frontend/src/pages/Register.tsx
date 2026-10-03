import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Logo } from "@/components/common/Logo";
import { buttonClasses } from "@/components/common/Button";

type AccountType = "customer" | "seller";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export default function Register() {
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const { registerCustomer, registerSeller } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [customerForm, setCustomerForm] = useState({ name: "", mobile: "", email: "", password: "" });
  const [sellerForm, setSellerForm] = useState({
    name: "",
    shopName: "",
    mobile: "",
    email: "",
    location: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result =
      accountType === "customer" ? await registerCustomer(customerForm) : await registerSeller(sellerForm);
    setSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    navigate(accountType === "seller" ? "/seller/dashboard" : "/");
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-primary-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="text-center text-2xl font-extrabold text-stone-900">Create Your Account</h1>
        <p className="mt-1 text-center text-sm text-stone-500">Join the Mana Oori Santha community today.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("customer")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition ${
              accountType === "customer" ? "border-primary-500 bg-primary-50" : "border-stone-200"
            }`}
          >
            <UserPlus size={22} className="text-primary-700" />
            <span className="text-sm font-bold text-stone-800">Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("seller")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition ${
              accountType === "seller" ? "border-primary-500 bg-primary-50" : "border-stone-200"
            }`}
          >
            <Store size={22} className="text-primary-700" />
            <span className="text-sm font-bold text-stone-800">Seller</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {accountType === "customer" ? (
            <>
              <input required placeholder="Full Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className={inputClass} />
              <input required type="tel" pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="Mobile Number" value={customerForm.mobile} onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })} className={inputClass} />
              <input required type="email" placeholder="Email Address" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className={inputClass} />
              <input required minLength={6} type="password" autoComplete="new-password" placeholder="Password (min 6 characters)" value={customerForm.password} onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })} className={inputClass} />
            </>
          ) : (
            <>
              <input required placeholder="Seller Name" value={sellerForm.name} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} className={inputClass} />
              <input required placeholder="Shop / Farm Name" value={sellerForm.shopName} onChange={(e) => setSellerForm({ ...sellerForm, shopName: e.target.value })} className={inputClass} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="tel" pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="Mobile Number" value={sellerForm.mobile} onChange={(e) => setSellerForm({ ...sellerForm, mobile: e.target.value })} className={inputClass} />
                <input required placeholder="Location" value={sellerForm.location} onChange={(e) => setSellerForm({ ...sellerForm, location: e.target.value })} className={inputClass} />
              </div>
              <input required type="email" placeholder="Email Address" value={sellerForm.email} onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })} className={inputClass} />
              <input required minLength={6} type="password" autoComplete="new-password" placeholder="Password (min 6 characters)" value={sellerForm.password} onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })} className={inputClass} />
            </>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
            {submitting ? "Creating account..." : `Create ${accountType === "seller" ? "Seller" : "Customer"} Account`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary-700 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
