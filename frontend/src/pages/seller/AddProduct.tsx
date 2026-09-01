import { useNavigate } from "react-router-dom";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { CURRENT_SELLER_ID } from "@/data/currentSeller";

export default function SellerAddProduct() {
  const { addProduct } = useProducts();
  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleSubmit(values: ProductFormValues) {
    addProduct({
      ...values,
      slug: `${values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      sellerId: CURRENT_SELLER_ID,
      rating: 0,
      reviewCount: 0,
    });
    showToast("Product added successfully!");
    navigate("/seller/products");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Add New Product</h1>
      <p className="mb-6 text-sm text-stone-500">List a new product for customers to discover.</p>
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <ProductForm onSubmit={handleSubmit} submitLabel="Add Product" />
      </div>
    </div>
  );
}
