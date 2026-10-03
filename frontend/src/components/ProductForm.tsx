import { useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import type { CategorySlug, Product } from "@/types";
import { useCategories } from "@/context/CategoriesContext";
import { buttonClasses } from "@/components/common/Button";

export interface ProductFormValues {
  name: string;
  category: CategorySlug;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  stock: number;
  image: string;
  isOrganic: boolean;
  isFeatured: boolean;
  benefits: string[];
}

interface ProductFormProps {
  initial?: Product;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  submitLabel: string;
  /** Only admins can feature products on the homepage. */
  canFeature?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

export function ProductForm({ initial, onSubmit, submitLabel, canFeature = false }: ProductFormProps) {
  const { categories } = useCategories();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<CategorySlug>(initial?.category ?? categories[0]?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [mrp, setMrp] = useState(initial?.mrp ?? 0);
  const [unit, setUnit] = useState(initial?.unit ?? "1 kg");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [image, setImage] = useState(initial?.image ?? "");
  const [isOrganic, setIsOrganic] = useState(initial?.isOrganic ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [benefitsText, setBenefitsText] = useState(initial?.benefits.join(", ") ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      name,
      category,
      description,
      price: Number(price),
      mrp: Number(mrp),
      unit,
      stock: Number(stock),
      image: image || `https://picsum.photos/seed/mos-${Date.now()}/600/600`,
      isOrganic,
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

      <div>
        <label className={labelClass}>Benefits (comma separated)</label>
        <input value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} className={inputClass} placeholder="High in fibre, Gluten-free, Rich in iron" />
      </div>

      <div>
        <label className={labelClass}>Product Image URL</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100">
            {image ? (
              <img src={image} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={22} className="text-stone-400" />
            )}
          </div>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className={inputClass}
            placeholder="https://... (leave blank for placeholder image)"
          />
        </div>
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
