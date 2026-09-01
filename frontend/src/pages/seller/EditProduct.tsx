import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";

export default function SellerEditProduct() {
  const { id } = useParams<{ id: string }>();
  const { getProductById, updateProduct } = useProducts();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const product = id ? getProductById(id) : undefined;

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        description="This product may have already been deleted."
        action={
          <Link to="/seller/products" className={buttonClasses("primary", "md", "mt-2")}>
            Back to My Products
          </Link>
        }
      />
    );
  }

  function handleSubmit(values: ProductFormValues) {
    if (!product) return;
    updateProduct(product.id, values);
    showToast("Product updated successfully!");
    navigate("/seller/products");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Edit Product</h1>
      <p className="mb-6 text-sm text-stone-500">Update details for "{product.name}".</p>
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <ProductForm initial={product} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
