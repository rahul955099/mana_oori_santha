import { useState, type FormEvent } from "react";
import type { CategorySlug, Product } from "@/types";
import { useCategories } from "@/context/CategoriesContext";
import { buttonClasses } from "@/components/common/Button";
import { ImageUploader } from "@/components/common/ImageUploader";

export interface ProductFormValues {
  name: string;
  nameTe: string;
  category: CategorySlug;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  stock: number;
  image: string;
  images: string[];
  isOrganic: boolean;
  isFeatured: boolean;
  benefits: string[];
  sizes: string[];
}

interface ProductFormProps {
  initial?: Product;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  submitLabel: string;
  /** Only admins can feature products on the homepage. */
  canFeature?: boolean;
}

/** Categories whose products come in sizes. */
const SIZED_CATEGORIES = new Set(["dresses", "customised-dresses", "sarees"]);
const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

export function ProductForm({ initial, onSubmit, submitLabel, canFeature = false }: ProductFormProps) {
  const { categories } = useCategories();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [nameTe, setNameTe] = useState(initial?.nameTe ?? "");
  const [chosenCategory, setCategory] = useState<CategorySlug>(initial?.category ?? "");
  // Until the seller picks one, default to the first category (which may load after the form opens).
  const category = chosenCategory || categories[0]?.slug || "";
  const showSizes = SIZED_CATEGORIES.has(category);

  /** Keeps the common sizes in their natural order, custom ones after. */
  function orderSizes(list: string[]) {
    const rank = (x: string) => (COMMON_SIZES.includes(x) ? COMMON_SIZES.indexOf(x) : COMMON_SIZES.length);
    return [...list].sort((a, b) => rank(a) - rank(b));
  }

  function addCustomSize() {
    const s = customSize.trim();
    if (s && !sizes.some((x) => x.toLowerCase() === s.toLowerCase())) setSizes(orderSizes([...sizes, s]));
    setCustomSize("");
  }
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [mrp, setMrp] = useState(initial?.mrp ?? 0);
  const [unit, setUnit] = useState(initial?.unit ?? "1 kg");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  // The first photo is the main product image; the rest form the gallery.
  const [photos, setPhotos] = useState<string[]>(() => [initial?.image, ...(initial?.images ?? [])].filter((u): u is string => !!u));
  const [photoError, setPhotoError] = useState("");
  const [isOrganic, setIsOrganic] = useState(initial?.isOrganic ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [benefitsText, setBenefitsText] = useState(initial?.benefits.join(", ") ?? "");
  const [sizes, setSizes] = useState<string[]>(initial?.sizes ?? []);
  const [customSize, setCustomSize] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (photos.length === 0) {
      setPhotoError("Please add at least one product photo.");
      return;
    }
    setPhotoError("");
    setSubmitting(true);
    await onSubmit({
      name,
      nameTe: nameTe.trim(),
      category,
      description,
      price: Number(price),
      mrp: Number(mrp),
      unit,
      stock: Number(stock),
      image: photos[0],
      images: photos.slice(1),
      isOrganic,
      // Sizes only apply to clothing; clear them if the category changed away from it.
      sizes: showSizes ? sizes : [],
      isFeatured,
      benefits: benefitsText
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Product Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Foxtail Millet" />
        </div>
        <div>
          <label htmlFor="product-name-te" className={labelClass}>
            Telugu Name <span className="font-medium text-stone-400">(తెలుగు పేరు, optional)</span>
          </label>
          <input
            id="product-name-te"
            lang="te"
            value={nameTe}
            onChange={(e) => setNameTe(e.target.value)}
            maxLength={120}
            className={inputClass}
            placeholder="e.g. కొర్రలు"
          />
          <p className="mt-1 text-xs text-stone-400">Shown under the English name. Leave blank if you're not sure of the spelling.</p>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select required value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)} className={inputClass}>
            <option value="" disabled>Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} resize-none`}
          placeholder="Describe your product..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Price (₹)</label>
          <input required type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>MRP (₹)</label>
          <input required type="number" min={0} value={mrp} onChange={(e) => setMrp(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Unit</label>
          <input required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} placeholder="1 kg" />
        </div>
        <div>
          <label className={labelClass}>Stock</label>
          <input required type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      {showSizes && (
        <div>
          <label className={labelClass}>Sizes available</label>
          <p className="mb-2 text-xs text-stone-400">Tap the sizes you can supply. Customers must pick one when they order. Leave all off if it's one size.</p>
          <div className="flex flex-wrap gap-2">
            {[...COMMON_SIZES, ...sizes.filter((s) => !COMMON_SIZES.includes(s))].map((s) => {
              const on = sizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSizes(on ? sizes.filter((x) => x !== s) : orderSizes([...sizes, s]))}
                  aria-pressed={on}
                  className={`min-w-11 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    on ? "border-primary-600 bg-primary-600 text-white" : "border-stone-200 text-stone-600 hover:border-primary-300"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex max-w-xs gap-2">
            <input
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              maxLength={20}
              placeholder="Other size, e.g. 32 or 6-7 Yrs"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSize();
                }
              }}
            />
            <button type="button" onClick={addCustomSize} className={buttonClasses("ghost", "sm")}>
              Add
            </button>
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Benefits (comma separated)</label>
        <input value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} className={inputClass} placeholder="High in fibre, Gluten-free, Rich in iron" />
      </div>

      <div>
        <label className={labelClass}>Product Photos</label>
        <ImageUploader value={photos} onChange={setPhotos} purpose="product" max={5} allowUrl />
        {photoError && <p className="mt-1 text-xs font-medium text-red-600">{photoError}</p>}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
          <input type="checkbox" checked={isOrganic} onChange={(e) => setIsOrganic(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-primary-600" />
          Organic Certified
        </label>
        {canFeature && (
          <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-primary-600" />
            Feature on Homepage
          </label>
        )}
      </div>

      <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg")}>
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
