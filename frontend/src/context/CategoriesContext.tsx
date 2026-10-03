import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Category } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export type CategoryInput = Pick<Category, "name" | "description" | "image"> &
  Partial<Pick<Category, "slug" | "sortOrder" | "isActive">>;

interface CategoriesContextValue {
  /** Categories shown on the storefront (active only). */
  categories: Category[];
  /** Every category including hidden ones — populated for admins only. */
  allCategories: Category[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getCategoryBySlug: (slug: string) => Category | undefined;
  createCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<CategoryInput>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api.get<{ categories: Category[] }>("/categories", isAdmin ? { all: true } : undefined);
      setAllCategories(data.categories);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const categories = allCategories.filter((c) => c.isActive !== false);

  function getCategoryBySlug(slug: string) {
    return categories.find((c) => c.slug === slug);
  }

  async function createCategory(input: CategoryInput) {
    const { category } = await api.post<{ category: Category }>("/categories", input);
    await reload();
    return category;
  }

  async function updateCategory(id: string, updates: Partial<CategoryInput>) {
    const { category } = await api.patch<{ category: Category }>(`/categories/${id}`, updates);
    setAllCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
    return category;
  }

  async function deleteCategory(id: string) {
    await api.delete(`/categories/${id}`);
    setAllCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        allCategories,
        loading,
        error,
        reload,
        getCategoryBySlug,
        createCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
}
