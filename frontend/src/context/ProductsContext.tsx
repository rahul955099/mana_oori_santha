import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Fields a seller/admin sends when creating or editing a product. */
export type ProductInput = Pick<
  Product,
  "name" | "category" | "description" | "price" | "mrp" | "unit" | "stock" | "image" | "isOrganic" | "isFeatured" | "benefits"
> & { images?: string[]; sellerId?: string };

interface ProductsContextValue {
  /** The whole active catalog. It is small, so the storefront loads it once and filters locally. */
  products: Product[];
  /** Seller only: their own listings, including any hidden while the shop awaits approval. */
  myProducts: Product[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addProduct: (product: ProductInput) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<ProductInput>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductBySlug: (slug: string) => Product | undefined;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);
const CATALOG_LIMIT = 500;

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSeller = user?.role === "seller";
  const userId = user?.id ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [data, mine] = await Promise.all([
        api.get<{ products: Product[] }>("/products", { limit: CATALOG_LIMIT }),
        isSeller ? api.get<{ products: Product[] }>("/products/mine") : Promise.resolve(null),
      ]);
      setProducts(data.products);
      setMyProducts(mine?.products ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    // userId is a dependency so another seller logging in on this device gets their own list.
  }, [isSeller, userId]);

  useEffect(() => {
    // Old demo builds cached a copy of the catalog here; the API is the source now.
    try {
      localStorage.removeItem("mos_products");
    } catch {
      // ignore
    }
    void reload();
  }, [reload]);

  async function addProduct(input: ProductInput) {
    const { product } = await api.post<{ product: Product }>("/products", input);
    // A pending seller's product isn't on the public store yet, so reload rather than guess.
    if (isSeller) setMyProducts((prev) => [product, ...prev]);
    void reload();
    return product;
  }

  async function updateProduct(id: string, updates: Partial<ProductInput>) {
    const { product } = await api.patch<{ product: Product }>(`/products/${id}`, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    setMyProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    return product;
  }

  async function deleteProduct(id: string) {
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setMyProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function getProductById(id: string) {
    return products.find((p) => p.id === id) ?? myProducts.find((p) => p.id === id);
  }

  function getProductBySlug(slug: string) {
    return products.find((p) => p.slug === slug);
  }

  return (
    <ProductsContext.Provider
      value={{
        products,
        myProducts,
        loading,
        error,
        reload,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        getProductBySlug,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}
