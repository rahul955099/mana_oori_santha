import { useState, type FormEvent } from "react";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { useSellerAccount, type KycInput } from "@/context/SellerAccountContext";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import { ImageUploader } from "@/components/common/ImageUploader";
import { SellerStatusBanner } from "@/components/seller/SellerStatusBanner";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";
import type { SellerAccount } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

export default function SellerProfile() {
  const { account, loading } = useSellerAccount();

  if (loading) {
    return <Loading label="Loading your shop..." />;
  }
  if (!account) {
    return <EmptyState title="Shop profile not found" description="Please log in again or contact support." />;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Seller Profile</h1>
        <p className="text-sm text-stone-500">Update your shop, photos and payout details.</p>
      </div>
      <SellerStatusBanner />
      {/* Keyed so the forms re-initialise if the account is reloaded. */}
      <ShopProfileForm key={`shop-${account.id}`} account={account} />
      <KycForm key={`kyc-${account.kyc?.submittedAt ?? "none"}`} account={account} />
    </div>
  );
}

function ShopProfileForm({ account }: { account: SellerAccount }) {
  const { updateProfile } = useSellerAccount();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string[]>(account.image ? [account.image] : []);
  const [photos, setPhotos] = useState<string[]>(account.photos ?? []);
  const [form, setForm] = useState({
    name: account.name,
    farmName: account.farmName,
    phone: account.phone,
    email: account.email,
    location: account.location,
    about: account.about,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ ...form, image: image[0] ?? "", photos });
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <ImageUploader value={image} onChange={setImage} purpose="seller" round />
        <div>
          <p className="text-base font-bold text-stone-900">{account.farmName}</p>
          <p className="text-sm text-stone-500">Seller since {account.joinedYear}</p>
          {account.verified && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-700">
              <BadgeCheck size={14} /> Verified Farmer
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Your Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Shop / Farm Name</label>
            <input required value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>About Your Farm</label>
          <textarea
            rows={4}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className={labelClass}>Farm & Shop Photos</label>
          <ImageUploader value={photos} onChange={setPhotos} purpose="seller" max={6} />
        </div>
        <button type="submit" disabled={saving} className={buttonClasses("primary", "lg")}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function KycForm({ account }: { account: SellerAccount }) {
  const { submitKyc } = useSellerAccount();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitted = !!account.kyc;
  // Masked numbers can't be edited in place, so editing starts from empty sensitive fields.
  const [editing, setEditing] = useState(!submitted);
  const [form, setForm] = useState({
    legalName: account.kyc?.legalName ?? "",
    pan: "",
    gstin: account.kyc?.gstin ?? "",
    method: account.payout?.method ?? ("upi" as "upi" | "bank"),
    upiId: account.payout?.upiId ?? "",
    accountHolder: account.payout?.accountHolder ?? "",
    accountNumber: "",
    ifsc: account.payout?.ifsc ?? "",
    bankName: account.payout?.bankName ?? "",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const input: KycInput = {
      legalName: form.legalName,
      pan: form.pan,
      gstin: form.gstin || undefined,
      payout:
        form.method === "upi"
          ? { method: "upi", upiId: form.upiId }
          : { method: "bank", accountHolder: form.accountHolder, accountNumber: form.accountNumber, ifsc: form.ifsc, bankName: form.bankName },
    };
    try {
      await submitKyc(input);
      showToast("Details submitted for review");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="kyc" className="scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-primary-600" />
        <div>
          <h2 className="text-lg font-bold text-stone-900">Verification & Payout Details</h2>
          <p className="text-sm text-stone-500">
            Needed to approve your shop and send you your earnings. Only you and the Mana Oori Santha team can see these.
          </p>
        </div>
      </div>

      {!editing && account.kyc && account.payout ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
            <Detail label="Legal name" value={account.kyc.legalName} />
            <Detail label="PAN" value={account.kyc.pan} />
            {account.kyc.gstin && <Detail label="GSTIN" value={account.kyc.gstin} />}
            {account.payout.method === "upi" ? (
              <Detail label="Payout to UPI" value={account.payout.upiId} />
            ) : (
              <>
                <Detail label="Account holder" value={account.payout.accountHolder} />
                <Detail label="Account number" value={account.payout.accountNumber} />
                <Detail label="IFSC" value={account.payout.ifsc} />
              </>
            )}
            <Detail label="Submitted" value={formatDate(account.kyc.submittedAt)} />
          </dl>
          <button onClick={() => setEditing(true)} className={buttonClasses("ghost", "md")}>
            Update details
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Legal Name (as on PAN)</label>
              <input required value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PAN</label>
              <input
                required
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]"
                title="10 characters, e.g. ABCDE1234F"
                placeholder="ABCDE1234F"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>GSTIN (optional)</label>
              <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Receive payouts by</label>
            <div className="flex gap-2">
              {(["upi", "bank"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, method: m })}
                  className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold transition ${
                    form.method === m ? "border-primary-500 bg-primary-50 text-primary-800" : "border-stone-200 text-stone-500"
                  }`}
                >
                  {m === "upi" ? "UPI" : "Bank Account"}
                </button>
              ))}
            </div>
          </div>

          {form.method === "upi" ? (
            <div>
              <label className={labelClass}>UPI ID</label>
              <input required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="name@okbank" className={inputClass} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Account Holder Name</label>
                <input required value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{9,18}"
                  title="9-18 digits"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\s/g, "") })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IFSC</label>
                <input
                  required
                  value={form.ifsc}
                  onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  className={`${inputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>Bank Name (optional)</label>
                <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={inputClass} />
              </div>
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={buttonClasses("primary", "lg")}>
              {saving ? "Submitting..." : submitted ? "Resubmit for Review" : "Submit for Review"}
            </button>
            {submitted && (
              <button type="button" onClick={() => setEditing(false)} className={buttonClasses("ghost", "lg")}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-stone-400">{label}</dt>
      <dd className="font-semibold text-stone-800">{value || "—"}</dd>
    </div>
  );
}
