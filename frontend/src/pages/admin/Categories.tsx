import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useCategories, type CategoryInput } from "@/context/CategoriesContext";
import { useToast } from "@/context/ToastContext";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { errorMessage } from "@/lib/api";
import type { Category } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

const emptyForm: CategoryInput = { name: "", description: "", image: "" };

export default function AdminCategories() {
  const { allCategories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const active = allCategories.filter((c) => c.isActive !== false);
  const hidden = allCategories.filter((c) => c.isActive === false);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setForm({ name: cat.name, description: cat.description, image: cat.image });
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, form);
        showToast("Category updated");
      } else {
        await createCategory(form);
        showToast("Category created");
      }
      setFormOpen(false);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(cat: Category) {
    try {
      await updateCategory(cat.id, { isActive: cat.isActive === false });
      showToast(cat.isActive === false ? `${cat.name} is now visible` : `${cat.name} hidden from the store`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      showToast(`${deleteTarget.name} deleted`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  function renderCard(cat: Category) {
    const isHidden = cat.isActive === false;
    return (
      <div
        key={cat.id}
        className={`overflow-hidden rounded-2xl border bg-white ${isHidden ? "border-dashed border-stone-300 opacity-75" : "border-stone-200"}`}
      >
        {cat.image ? (
          <img src={cat.image} alt={cat.name} className={`h-32 w-full object-cover ${isHidden ? "grayscale" : ""}`} />
        ) : (
          <div className="h-32 w-full bg-stone-100" />
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-stone-900">{cat.name}</h3>
            {isHidden ? <Badge tone="gray">Hidden</Badge> : <Badge tone="green">Active</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">{cat.description}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-1">
            <p className="whitespace-nowrap text-sm font-semibold text-primary-700">{cat.productCount} products</p>
            <div className="flex gap-1">
              <button
                onClick={() => toggleActive(cat)}
                title={isHidden ? "Show on store" : "Hide from store"}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
              >
                {isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                onClick={() => openEdit(cat)}
                title="Edit"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setDeleteTarget(cat)}
                title="Delete"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Categories</h1>
          <p className="mt-1 text-sm text-stone-500">Manage the main product categories on the platform.</p>
        </div>
        <button onClick={openCreate} className={buttonClasses("primary", "md")}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <Loading label="Loading categories..." />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{active.map(renderCard)}</div>

          {hidden.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 text-lg font-bold text-stone-900">Hidden / Coming Soon</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{hidden.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputClass} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setFormOpen(false)} className={buttonClasses("ghost", "sm")}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={buttonClasses("primary", "sm")}>
              {editTarget ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category">
        <p className="text-sm text-stone-600">
          Delete "{deleteTarget?.name}"? Categories that still have products can't be deleted — hide them instead.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
