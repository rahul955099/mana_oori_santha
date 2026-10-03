import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  Heart,
  ShoppingCart,
  RotateCcw,
  Star,
  MapPin,
  Pencil,
  Trash2,
  Star as StarFilled,
  Plus,
  KeyRound,
  Mail,
  Phone,
  Bell,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAddresses } from "@/context/AddressContext";
import { errorMessage } from "@/lib/api";
import { useSupport } from "@/context/SupportContext";
import { useReviews } from "@/context/ReviewsContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { AddressFormModal } from "@/components/profile/AddressFormModal";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import type { Address } from "@/types";

const NOTIF_KEY = "mos_notification_prefs";

interface NotifPrefs {
  orderUpdates: boolean;
  promotions: boolean;
  deliveryAlerts: boolean;
}

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? (JSON.parse(raw) as NotifPrefs) : { orderUpdates: true, promotions: false, deliveryAlerts: true };
  } catch {
    return { orderUpdates: true, promotions: false, deliveryAlerts: true };
  }
}

export default function Profile() {
  const { user, logout, deleteAccount } = useAuth();
  const { addresses, deleteAddress, setDefaultAddress } = useAddresses();
  const { openSupport } = useSupport();
  const { reviews, deleteReview } = useReviews();
  const { getProductById } = useProducts();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const myReviews = reviews.filter((r) => r.userId === user?.userId);

  function handleDeleteReview(reviewId: string) {
    if (!user) return;
    deleteReview(reviewId, user.userId);
    showToast("Review deleted.");
  }

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteAddressTarget, setDeleteAddressTarget] = useState<Address | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);

  if (!user) return null;

  function openAddAddress() {
    setEditingAddress(null);
    setAddressModalOpen(true);
  }

  function openEditAddress(address: Address) {
    setEditingAddress(address);
    setAddressModalOpen(true);
  }

  async function confirmDeleteAddress() {
    if (!deleteAddressTarget) return;
    try {
      await deleteAddress(deleteAddressTarget.id);
      showToast("Address removed.");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteAddressTarget(null);
    }
  }

  async function makeDefault(id: string) {
    try {
      await setDefaultAddress(id);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  function toggleNotif(key: keyof NotifPrefs) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function confirmDeleteAccount() {
    const result = await deleteAccount();
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    showToast(result.message, "info");
    navigate("/");
  }

  const shoppingLinks = [
    { to: "/my-orders", label: "My Orders", icon: Package },
    { to: "/wishlist", label: "Wishlist", icon: Heart },
    { to: "/cart", label: "My Cart", icon: ShoppingCart },
  ];

  return (
    <div className="container-app py-10">
      {/* Header */}
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-stone-200 bg-white p-6 text-center sm:flex-row sm:text-left">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt={user.name} className="h-20 w-20 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <User size={32} />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-stone-900">{user.name}</h1>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-accent-600">User ID: {user.userId}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-stone-500 sm:flex-row sm:gap-4">
            <span className="flex items-center justify-center gap-1.5 sm:justify-start"><Mail size={13} /> {user.email}</span>
            <span className="flex items-center justify-center gap-1.5 sm:justify-start"><Phone size={13} /> {user.mobile}</span>
          </div>
        </div>
        <button onClick={() => setEditProfileOpen(true)} className={buttonClasses("outline", "md", "shrink-0")}>
          <Pencil size={15} /> Edit Profile
        </button>
      </div>

      {/* Shopping shortcuts */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shoppingLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
          >
            <link.icon size={22} className="text-primary-600" />
            <span className="text-xs font-bold text-stone-700">{link.label}</span>
          </Link>
        ))}
        <button
          onClick={() => openSupport({ category: "return-refund" })}
          className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
        >
          <RotateCcw size={22} className="text-primary-600" />
          <span className="text-xs font-bold text-stone-700">Returns & Refunds</span>
        </button>
        <a
          href="#my-reviews"
          className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
        >
          <Star size={22} className="text-primary-600" />
          <span className="text-xs font-bold text-stone-700">My Reviews</span>
        </a>
      </div>

      {/* Addresses */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">My Addresses</h2>
          <button onClick={openAddAddress} className="flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline">
            <Plus size={16} /> Add Another Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Add a delivery address to speed up checkout."
            action={<button onClick={openAddAddress} className={buttonClasses("primary", "sm", "mt-2")}>+ Add Address</button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <div key={address.id} className={`rounded-xl border-2 p-4 ${address.isDefault ? "border-primary-400 bg-primary-50" : "border-stone-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                    {address.type}
                  </span>
                  {address.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary-700">
                      <StarFilled size={11} className="fill-primary-700" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-stone-800">{address.fullName}</p>
                <p className="text-xs text-stone-500">{address.phone}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  {address.houseNo}, {address.street}, {address.city}, {address.state} - {address.pincode}
                  {address.landmark && <> · Landmark: {address.landmark}</>}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openEditAddress(address)} className="rounded-full border border-stone-300 px-3 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-50">
                    Edit
                  </button>
                  <button onClick={() => setDeleteAddressTarget(address)} className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                  {!address.isDefault && (
                    <button onClick={() => makeDefault(address.id)} className="rounded-full border border-primary-300 px-3 py-1 text-[11px] font-bold text-primary-700 hover:bg-primary-50">
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Reviews */}
      <div id="my-reviews" className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">My Reviews</h2>
        {myReviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Reviews you write on product pages will show up here."
          />
        ) : (
          <div className="space-y-3">
            {myReviews.map((review) => {
              const product = getProductById(review.productId);
              return (
                <div key={review.id} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {product ? (
                      <Link to={`/products/${product.slug}`} className="text-sm font-bold text-stone-800 hover:text-primary-700">
                        {product.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-stone-800">Product</p>
                    )}
                    <button onClick={() => handleDeleteReview(review.id)} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={13} className={i <= review.rating ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
                    ))}
                  </div>
                  {review.comment && <p className="mt-1.5 text-sm text-stone-600">{review.comment}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Account Settings</h2>
        <div className="divide-y divide-stone-100">
          <button onClick={() => setEditProfileOpen(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-stone-700 hover:text-primary-700">
            <Pencil size={16} className="text-stone-400" /> Edit Profile
          </button>
          <button onClick={() => setPasswordModalOpen(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-stone-700 hover:text-primary-700">
            <KeyRound size={16} className="text-stone-400" /> Change Password
          </button>
          <button onClick={() => setEditProfileOpen(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-stone-700 hover:text-primary-700">
            <Mail size={16} className="text-stone-400" /> Update Email
          </button>
          <button onClick={() => setEditProfileOpen(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-stone-700 hover:text-primary-700">
            <Phone size={16} className="text-stone-400" /> Update Phone Number
          </button>

          <div className="py-3">
            <p className="mb-2 flex items-center gap-3 text-sm font-semibold text-stone-700">
              <Bell size={16} className="text-stone-400" /> Notification Preferences
            </p>
            <div className="ml-7 space-y-2">
              {([
                ["orderUpdates", "Order updates"],
                ["deliveryAlerts", "Delivery alerts"],
                ["promotions", "Promotions & offers"],
              ] as [keyof NotifPrefs, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 text-xs text-stone-600">
                  {label}
                  <input
                    type="checkbox"
                    checked={notifPrefs[key]}
                    onChange={() => toggleNotif(key)}
                    className="h-4 w-4 accent-primary-600"
                  />
                </label>
              ))}
            </div>
          </div>

          <button onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-stone-700 hover:text-primary-700">
            <LogOut size={16} className="text-stone-400" /> Logout
          </button>
          <button onClick={() => setDeleteAccountOpen(true)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold text-red-600 hover:text-red-700">
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>

      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <AddressFormModal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)} editingAddress={editingAddress} />

      <Modal isOpen={!!deleteAddressTarget} onClose={() => setDeleteAddressTarget(null)} title="Delete Address">
        <p className="text-sm text-stone-600">Are you sure you want to delete this address?</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteAddressTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDeleteAddress} className={buttonClasses("danger", "sm")}>Delete</button>
        </div>
      </Modal>

      <Modal isOpen={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="Delete Account">
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">
            This will permanently remove your account and sign you out. This action cannot be undone. Are you sure
            you want to continue?
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteAccountOpen(false)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDeleteAccount} className={buttonClasses("danger", "sm")}>Yes, Delete My Account</button>
        </div>
      </Modal>
    </div>
  );
}
