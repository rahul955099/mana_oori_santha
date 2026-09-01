import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/types";
import { products as initialProducts } from "@/data/products";

interface ProductsContextValue {
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductBySlug: (slug: string) => Product | undefined;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_products";

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Product[]) : initialProducts;
    } catch {
      return initialProducts;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  function addProduct(product: Omit<Product, "id" | "createdAt">) {
    const newProduct: Product = {
      ...product,
      id: `p-custom-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setProducts((prev) => [newProduct, ...prev]);
  }

  function updateProduct(id: string, updates: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  function deleteProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function getProductById(id: string) {
    return products.find((p) => p.id === id);
  }

  function getProductBySlug(slug: string) {
    return products.find((p) => p.slug === slug);
  }

  return (
    <ProductsContext.Provider
      value={{ products, addProduct, updateProduct, deleteProduct, getProductById, getProductBySlug }}
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
