import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { useProducts } from "@/context/ProductsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { errorMessage } from "@/lib/api";

export default function SellerEditProduct() {
  const { id } = useParams<{ id: string }>();
  const { getProductById, updateProduct, loading } = useProducts();
  const sellerId = useAuth().user?.sellerId;
  const { showToast } = useToast();
  const navigate = useNavigate();

  const product = id ? getProductById(id) : undefined;

  if (loading) {
    return <Loading label="Loading product..." />;
  }

  if (!product || product.sellerId !== sellerId) {
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

  async function handleSubmit(values: ProductFormValues) {
    if (!product) return;
    try {
      await updateProduct(product.id, values);
      showToast("Product updated successfully!");
      navigate("/seller/products");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
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
